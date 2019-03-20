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
    this.login = this.login.bind(this)
    this.signUp = this.signUp.bind(this)
    this.resendConfirmationCode = this.resendConfirmationCode.bind(this)
    this.confirmSignUp = this.confirmSignUp.bind(this)
    this.lookupIdCreation = this.lookupIdCreation.bind(this)
  }
  async login (deviceKey) {
    try {
      const res = await this.auth.post('/initiateAuth', { username: deviceKey, appId: this.appId })
      const data = res.data.data.ChallengeParameters.messageToSign
      const session = res.data.data.Session
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
      const response = await this.auth.post('/respondToAuthChallenge', { deviceKey, signature, session })
      return response.data.data.AuthenticationResult
    } catch (error) {
      console.error(error)
      throw new Error(error)
    }
  }
  async refreshToken (refreshToken) {
    console.log('refresh token', refreshToken)
    try {
      const result = await this.auth.post('/refreshToken', { refreshToken })
      return result.data.data.AuthenticationResult
    } catch (error) {
      console.error(error)
      throw new Error(error)
    }
  }
  async signUp (deviceKey, phoneNumber) {
    try {
      await this.auth.post('/signup', { username: deviceKey, phoneNumber, appId: this.appId })
    } catch (error) {
      console.error(error)
      throw new Error(error)
    }
  }
  async confirmSignUp (deviceKey, confirmationCode) {
    try {
      await this.auth.post('/confirmSignup', { username: deviceKey, confirmationCode })
    } catch (error) {
      console.error(error)
      throw new Error(error)
    }
  }
  async resendConfirmationCode (deviceKey) {
    try {
      await this.auth.post('/resendConfirmationCode', { username: deviceKey })
    } catch (error) {
      console.error(error)
      throw new Error(error)
    }
  }
  async lookupIdCreation (deviceKey, network) {
    const timeout = 60000
    const interval = 1000
    const endTime = Number(new Date()) + (timeout)

    const checkCondition = async (resolve, reject) => {
      try {
        const result = await this.auth.post('/lookup', { deviceKey, network })
        console.log('result', result.data)
        if (result.data.data === 'no record found') {
          resolve('no record found')
        } else if (result.data.data === 'null identity. Not mined yet?' && Number(new Date()) < endTime) {
          setTimeout(checkCondition, interval, resolve, reject)
        } else {
          resolve(result.data.data)
        }
      } catch (error) {
        console.log(error)
        reject(error)
      }
    }
    return new Promise(checkCondition)
  }
  async loginOrSignup (deviceKey, inputCallback) {
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
        if (this.network === 'mainnet' || this.network === 'rinkeby' || this.network === 'ropsten' || this.network === 'kovan') {
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
      console.error(error)
      throw new Error(error)
    }
  }
}

module.exports = IdMngt
