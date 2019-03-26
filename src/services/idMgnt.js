const axios = require('axios')
const util = require('ethereumjs-util')
const ethSigUtil = require('eth-sig-util')
const jwtDecode = require('jwt-decode')

class IdMngt {
  constructor ({ appId, isWeb3Provided, signFunction, authUrl, blockchain, senderKeyPair }) {
    this.appId = appId
    this.isWeb3Provided = isWeb3Provided
    this.signFunction = signFunction
    this.network = blockchain
    this.authUrl = authUrl
    this.auth = axios.create({
      baseURL: this.authUrl,
      headers: { 'Content-Type': 'application/json' }
    })
    this.senderKeyPair = senderKeyPair

    this.refreshToken = this.refreshToken.bind(this)
    this.initiateAuth = this.initiateAuth.bind(this)
    this.respondToAuthChallenge = this.respondToAuthChallenge.bind(this)
    this.login = this.login.bind(this)
    this.signUp = this.signUp.bind(this)
    this.resendConfirmationCode = this.resendConfirmationCode.bind(this)
    this.confirmSignUp = this.confirmSignUp.bind(this)
    this.lookupIdCreation = this.lookupIdCreation.bind(this)
  }
  async login (deviceKey) {
    if (!deviceKey) throw new Error('missing deviceKey')

    try {
      const res = await this.initiateAuth(deviceKey)
      const data = res.ChallengeParameters.messageToSign
      const session = res.Session
      let signature
      if (this.isWeb3Provided === true) {
        signature = await this.signFunction(data)
      } else {
        const msgParams = [{ type: 'string', name: 'Message', value: data }]
        signature = ethSigUtil.signTypedData(
          Buffer.from(util.stripHexPrefix(this.senderKeyPair.privateKey), 'hex'),
          { data: msgParams }
        )
      }
      const response = await this.respondToAuthChallenge(deviceKey, signature, session)
      return response
    } catch (error) {
      throw error
    }
  }
  async initiateAuth (deviceKey) {
    if (!deviceKey) throw new Error('missing deviceKey')

    try {
      const result = await this.auth.post('/initiateAuth', { username: deviceKey, appId: this.appId })
      return result.data.data
    } catch (error) {
      throw error.response.data.message
    }
  }
  async respondToAuthChallenge (deviceKey, signature, session) {
    if (!deviceKey) throw new Error('missing deviceKey')
    if (!signature) throw new Error('missing signature')
    if (!session) throw new Error('missing session')

    try {
      const result = await this.auth.post('/respondToAuthChallenge', { deviceKey, signature, session })
      return result.data.data.AuthenticationResult
    } catch (error) {
      throw error.response.data.message
    }
  }
  async refreshToken (refreshToken) {
    if (!refreshToken) throw new Error('missing refreshToken')

    try {
      const result = await this.auth.post('/refreshToken', { refreshToken })
      return result.data.data.AuthenticationResult
    } catch (error) {
      throw error.response.data.message
    }
  }
  async signUp (deviceKey, phoneNumber) {
    if (!deviceKey) throw new Error('missing deviceKey')
    if (!phoneNumber) throw new Error('missing phoneNumber')

    try {
      await this.auth.post('/signup', { username: deviceKey, phoneNumber, appId: this.appId })
    } catch (error) {
      throw error.response.data.message
    }
  }
  async confirmSignUp (deviceKey, confirmationCode) {
    if (!deviceKey) throw new Error('missing deviceKey')
    if (!confirmationCode) throw new Error('missing confirmationCode')

    try {
      await this.auth.post('/confirmSignup', { username: deviceKey, confirmationCode })
    } catch (error) {
      throw error.response.data.message
    }
  }
  async resendConfirmationCode (deviceKey) {
    if (!deviceKey) throw new Error('missing deviceKey')

    try {
      await this.auth.post('/resendConfirmationCode', { username: deviceKey })
    } catch (error) {
      throw error.response.data.message
    }
  }
  async lookupIdCreation (deviceKey, network) {
    if (!deviceKey) throw new Error('missing deviceKey')
    if (!network) throw new Error('missing network')

    const timeout = 60000
    const interval = 1000
    const endTime = Number(new Date()) + (timeout)

    const checkCondition = async (resolve, reject) => {
      try {
        const result = await this.auth.post('/lookup', { deviceKey, network })
        if (result.data.data === 'no record found') {
          resolve('no record found')
        } else if (result.data.data === 'null identity. Not mined yet?' && Number(new Date()) < endTime) {
          setTimeout(checkCondition, interval, resolve, reject)
        } else {
          resolve(result.data.data)
        }
      } catch (error) {
        reject(error)
      }
    }
    return new Promise(checkCondition)
  }
  async loginOrSignup (deviceKey, inputCallback) {
    if (!deviceKey) throw new Error('missing deviceKey')

    const idExist = await this.lookupIdCreation(deviceKey, this.network)
    try {
      if (idExist === 'no record found') {
        const phoneNumber = await inputCallback('Enter your phone number: ')
        await this.signUp(deviceKey, phoneNumber)
        const confirmationCode = inputCallback('Enter confirmation code: ')
        await this.confirmSignUp(deviceKey, confirmationCode)
        const identity = await this.lookupIdCreation(deviceKey, this.network)
        const authToken = await this.login(this.senderKeyPair.address)
        return { authToken, identity: identity.identity }
      } else {
        const authToken = await this.login(this.senderKeyPair.address)
        const decodedIdentityObj = jwtDecode(authToken.IdToken)
        if (this.network === 'mainnet' || this.network === 'xdai' || this.network === 'poa' || this.network === 'rinkeby' || this.network === 'ropsten' || this.network === 'kovan') {
          const proxyAddress = decodedIdentityObj['custom:identity-' + this.network]
          return {
            authToken,
            deviceKey: decodedIdentityObj['custom:deviceKey'],
            identity: proxyAddress
          }
        } else {
          throw new Error('Invalid network')
        }
      }
    } catch (error) {
      throw error
    }
  }
}

module.exports = IdMngt
