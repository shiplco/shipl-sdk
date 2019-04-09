const util = require('ethereumjs-util')
const ethSigUtil = require('eth-sig-util')
const jwtDecode = require('jwt-decode')
const shiplID = require('./shiplID')

// FIXME: MAYBE I SHOUL REMOVE THIS FILE
class IdMngt {
  constructor({ appId, isWeb3Provided, signFunction, authUrl, network, senderKeyPair }) {
    this.appId = appId
    this.isWeb3Provided = isWeb3Provided
    this.signFunction = signFunction
    this.network = network // userless
    this.authUrl = authUrl
    this.shiplID = new shiplID({ appId, client: 'meta', authUrl })
    this.senderKeyPair = senderKeyPair
  }

  async loginOrSignup(deviceKey, inputCallback) {
    if (!deviceKey) throw new Error('missing deviceKey') // FIXME: regex check

    let result
    let signature
    try {
      const phoneNumber = '+17605717437' // FIXME: await inputCallback('Enter your phone number: ')
      result = await this.shiplID.login(phoneNumber, this.senderKeyPair.address)
      if (result.session) {
        if (this.isWeb3Provided === true) {
          signature = await this.signFunction(result.challenge)
        } else {
          const msgParams = [{ type: 'string', name: 'Message', value: result.challenge }]
          signature = ethSigUtil.signTypedData(
            Buffer.from(util.stripHexPrefix(this.senderKeyPair.privateKey), 'hex'),
            { data: msgParams }
          )
        }
      } else {
        signature = await inputCallback('Enter your confirmation code: ')
      }
      result = await this.shiplID.verify(signature)
      const decodedIdentityObj = jwtDecode(result.token.IdToken)
      console.log(decodedIdentityObj)
      const identity = decodedIdentityObj['custom:identity-' + this.network]
      console.log({
        authToken: result.token,
        identity
      })
      return {
        authToken: result.token,
        identity
      }
    } catch (error) {
      throw error
    }
  }
}

module.exports = IdMngt
