const axios = require('axios')
const util = require('ethereumjs-util')
const ethSigUtil = require('eth-sig-util')

class IdMngt {
  constructor ({ nisabaUrl, unnuUrl, blockchain, senderKeyPair }) {
    this.nisabaUrl = nisabaUrl
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
  async renewToken (deviceKey) {
    const sig = ethSigUtil.personalSign(Buffer.from(util.stripHexPrefix(this.senderKeyPair.privateKey), 'hex'), { data: deviceKey })
    const res = await this.nisaba.post('/renewtoken', { deviceKey, sig })
    return res.data.data
  }
  async startUserVerification (phoneNumber, deviceKey) {
    return this.nisaba.post('/verify', { phoneNumber, deviceKey })
  }
  async continueUserVerification (deviceKey, code) {
    const res = await this.nisaba.post('/check', { code, deviceKey })
    return res.data.data
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
        const result = await this.unnu.post('/lookup', { deviceKey })
        resolve(result.data.data)
      } catch (e) {
        if (e.response.data.message === 'no record found' || e.response.data.message === 'no txHash') {
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
  async getUserOrCreate (address, inputCallback) {
    const idExist = await this.lookupIdCreation(address)
    if (idExist === 'no record found') {
      const phoneNumber = inputCallback('Enter your phone number: ')
      await this.startUserVerification(phoneNumber, address)
      const code = inputCallback('Ask to enter verifcation code: ')
      this.authToken = await this.continueUserVerification(address, code)
      await this.createAccount(address)
      const identity = await this.lookupIdCreation(address)
      identity.authToken = this.authToken
      return identity
    } else {
      this.authToken = await this.renewToken(this.senderKeyPair.address)
      idExist.authToken = this.authToken
      return idExist
    }
  }
}

module.exports = IdMngt
