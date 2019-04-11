const axios = require('axios')

class ShiplID {
  constructor({ appId, client, authUrl }) {
    if (!appId) throw new Error('appId is missing')
    if (!client) throw new Error('client is missing')

    switch (client) {
      case 'vaultx':
        break
      case 'meta':
        break
      default:
        throw new Error(`client: ${client} is not available`)
    }

    this.vaultx = axios.create({
      baseURL: authUrl,
      headers: { 'Content-Type': 'application/json' }
    })
    this.auth = {
      userName: undefined, // MD5 of phoneNumber,
      userSub: undefined, // AWS UserSub uuid
      phoneNumber: undefined,
      token: {},
      session: undefined,
      challenge: undefined
    }
    this.appId = appId
    this.client = client

    // BINDING
    this.logout = this.logout.bind(this)
    this.getIdToken = this.getIdToken.bind(this)
    this.login = this.login.bind(this)
    this.verify = this.verify.bind(this)
    this.isLogin = this.isLogin.bind(this)

    // INIT
    this.getAccessToken()
  }

  isLogin() {
    if (this.auth && this.auth.userName && this.auth.token && this.auth.token.IdToken) return true
    return false
  }

  getAccessToken() {
    if (typeof window !== 'undefined') {
      if (window.localStorage.getItem('VAULTX') != null) {
        this.auth = JSON.parse(window.localStorage.getItem('VAULTX'))
      }
    }
  }

  setAccessToken() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('VAULTX', JSON.stringify(this.auth))
    }
  }

  async renewToken() {
    try {
      const result = await this.vaultx.post('/refreshToken', {
        username: this.auth.userName,
        refreshToken: this.auth.token.RefreshToken,
        client: 'vaultx'
      })
      this.auth = {
        ...this.auth,
        token: {
          ...this.auth.token,
          ...result.data.data.AuthenticationResult,
          CreatedAt: Date.now()
        }
      }
      this.setAccessToken()
    } catch (error) {
      throw error
    }
  }

  async resendConfirmationCode(phoneNumber) {
    if (!phoneNumber) throw new Error('missing phoneNumber')

    try {
      return await this.vaultx.post('/resendConfirmationCode', { phoneNumber, client: this.client })
    } catch (error) {
      throw error
    }
  }

  /**
   * Use to logout a user
   */
  logout() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('VAULTX')
    }
    this.auth = undefined
  }

  /**
   * Use to get the IdToken
   */
  async getIdToken() {
    if (this.auth && this.auth.token) {
      if (Date.now() >= this.auth.token.CreatedAt + this.auth.token.ExpiresIn * 1000) {
        await this.renewToken()
      }
      return this.auth.token.IdToken
    }
    return undefined
  }

  /**
   * Use to login a user or to sign up
   * @param {*} phoneNumber The phone number of the user
   * @param {*} deviceKey The address of the user, only madatory for meta registration / sign in
   */
  async login(phoneNumber, deviceKey) {
    if (this.client === 'meta' && !deviceKey)
      throw new Error(`Your client is ${this.client}: deviceKey is missing`)
    let result

    try {
      result = await this.vaultx.post('/login', {
        phoneNumber,
        client: this.client,
        appId: this.appId,
        username: deviceKey || '0x0'
      })
      if (result.data.data.code === 'UserNotConfirmedException') {
        console.log(result)
        result = await this.resendConfirmationCode(phoneNumber)
        console.log(result)
      }
      this.auth = {
        ...this.auth,
        phoneNumber,
        userName: result.data.data.UserName,
        userSub: result.data.data.UserSub
      }
      if (result.data.data.Session) {
        this.auth.session = result.data.data.Session
        this.auth.challenge = result.data.data.ChallengeParameters.messageToSign
      }
      return this.auth
    } catch (error) {
      throw error
    }
  }

  /**
   * Verify Identity of the user
   * @param {String} confirmationCode Should be a confirmation code (6 digits) or a signature
   */
  async verify(confirmationCode) {
    if (!confirmationCode) throw new Error('confirmation code is missing')
    switch (this.client) {
      case 'vaultx':
        break
      case 'meta':
        break
    }
    try {
      const result = await this.vaultx.post('/verify', {
        username: this.auth.userName,
        confirmationCode,
        session: this.auth.session,
        client: this.client
      })
      this.auth = {
        ...this.auth,
        token: { ...result.data.data.AuthenticationResult, CreatedAt: Date.now() }
      }
      this.setAccessToken()
      return this.auth
    } catch (error) {
      throw error
    }
  }

  async exist(deviceKey) {
    if (!deviceKey) throw new Error('missing deviceKey')

    const result = await this.vaultx.post('/exist', { deviceKey })
    return result.data.data
  }
}

module.exports = ShiplID
