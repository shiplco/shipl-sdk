const axios = require('axios')
const util = require('ethereumjs-util')
const ethSigUtil = require('eth-sig-util')

class IdMngt {
  constructor ({ appId, nisabaUrl, unnuUrl, blockchain, senderKeyPair }) {
    this.appId = appId
    this.nisabaUrl = 'http://localhost:3045' // nisabaUrl
    this.unnuUrl = unnuUrl
    this.managerType = 'MetaIdentityManager'
    this.recoveryKey = '0x00B8FBD65D61b7DFe34b9A3Bb6C81908d7fFD541'
    this.blockchain = blockchain
    this.nisaba = axios.create({
      baseURL: this.nisabaUrl,
      headers: { 'Content-Type': 'application/json' }
    })
    this.unnu = axios.create({
      baseURL: this.unnuUrl,
      headers: { 'Content-Type': 'application/json' }
    })
    this.senderKeyPair = senderKeyPair
    this.authToken = ''
  }
  async login (deviceKey) {
    try {
      const res = await this.nisaba.post('/initiateAuth', { username: deviceKey, appId: this.appId })
      const data = res.data.data.ChallengeParameters.messageToSign
      const session = res.data.data.Session
      const signature = ethSigUtil.personalSign(Buffer.from(util.stripHexPrefix(this.senderKeyPair.privateKey), 'hex'), { data })
      const response = await this.nisaba.post('/respondToAuthChallenge', { deviceKey, signature, session })
      return response.data.data.AuthenticationResult
    } catch (error) {
      throw new Error(error)
    }
  }
  async signUp (deviceKey, phoneNumber) {
    try {
      return this.nisaba.post('/signup', { username: deviceKey, phoneNumber, appId: this.appId })
    } catch (error) {
      throw new Error(error)
    }
  }
  async confirmSignUp (deviceKey, confirmationCode) {
    try {
      const res = await this.nisaba.post('/confirmSignUp', { username: deviceKey, confirmationCode })
      return res.data.data
    } catch (error) {
      throw new Error(error)
    }
  }
  // Unnu
  async createAccount (deviceKey) {
    return this.unnu.post('/createidentity',
      { deviceKey, recoveryKey: this.recoveryKey, blockchain: this.blockchain, managerType: this.managerType },
      { headers: { 'Authorization': 'Bearer ' + this.authToken } })
  }
  async lookupIdCreation (deviceKey) {
    const timeout = 60000
    const interval = 1000
    const endTime = Number(new Date()) + (timeout)

    const checkCondition = async (resolve, reject) => {
      try {
        // const result = await this.unnu.post('/lookup', { deviceKey })
        const result = await this.nisaba.post('/initiateAuth', { username: deviceKey })
        resolve(result.data.data)
      } catch (e) {
        // if (e.response.data.message === 'no record found' || e.response.data.message === 'no txHash') {
        if (e.response.data.message === 'User does not exist.') {
          resolve('no record found')
        } else if (e.response.data.message === 'null identity. Not mined yet?' && Number(new Date()) < endTime) {
          setTimeout(checkCondition, interval, resolve, reject)
        } else {
          reject(e)
        }
      }
    }
    return new Promise(checkCondition)
  }
  async getUserOrCreate (deviceKey, inputCallback) {
    try {
      const idExist = await this.lookupIdCreation(deviceKey)
      if (idExist === 'no record found') {
        const phoneNumber = inputCallback('Enter your phone number: ')
        await this.signUp(deviceKey, phoneNumber)
        const confirmationCode = inputCallback('Enter confirmation code: ')
        this.authToken = await this.confirmSignUp(deviceKey, confirmationCode)
        // await this.createAccount(deviceKey)
        const identity = await this.lookupIdCreation(deviceKey)
        identity.authToken = this.authToken
        return identity
      } else {
        this.authToken = await this.login(this.senderKeyPair.address)
        idExist.authToken = this.authToken
        return idExist
      }
    } catch (error) {
      throw new Error(error)
    }
  }
}

module.exports = IdMngt
