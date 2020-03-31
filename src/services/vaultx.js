const Modal = require('./modal')

class EventEmitter {
  constructor () {
    this.events = {}
  }

  on (event, listener) {
    if (typeof this.events[event] !== 'object') {
      this.events[event] = []
    }
    this.events[event].push(listener)
    return () => this.removeListener(event, listener)
  }

  removeListener (event, listener) {
    if (typeof this.events[event] === 'object') {
      const idx = this.events[event].indexOf(listener)
      if (idx > -1) {
        this.events[event].splice(idx, 1)
      }
    }
  }

  emit (event, ...args) {
    if (typeof this.events[event] === 'object') {
      this.events[event].forEach(listener => listener.apply(this, args))
    }
  }

  once (event, listener) {
    const remove = this.on(event, (...args) => {
      remove()
      listener.apply(this, args)
    })
  }
}

class Vaultx {
  constructor ({ rpcUrl, walletUrl, authUrl, ordersUrl, gatewayUrl, fetchWalletApiUrl, appId, client, network, providerType, chainId }) {
    this.createListener()
    this.modal = new Modal({ rpcUrl, appId, client, network, authUrl, walletUrl, ordersUrl, gatewayUrl, fetchWalletApiUrl, providerType, chainId })
    this.events = new EventEmitter()
  }

  formatMessage (method, payload, error) {
    if (!method) throw new Error("'formatMessage' method param is missing")
    return `vaultx~${JSON.stringify({ method, payload, error })}`
  }

  async createListener () {
    const modalListener = async e => {
      if (e && e.data && typeof e.data === 'string') {
        const data = e.data.split('~')
        if (data && data[0] === 'vaultx') {
          const request = JSON.parse(data[1])
          const { payload } = request
          switch (request.method) {
            case 'setAccount':
              this.deviceKey = request.payload.deviceKey
              this.identity = request.payload.identity
              this.events.emit('setAccount', request.payload)
              this.events.emit('login', request.payload)
              break
            case 'setExpertMode':
              this.modal.setExpertMode(request.payload)
              break
            case 'close':
              this.modal.closeOverlay()
              break
            case 'open':
              this.modal.openOverlay()
              break
            case 'logout':
              this.logout()
              break
            case 'signalShiplIDLoaded':
            case 'returnSignedMessage':
            case 'returnSignedTypedMessage':
            case 'returnSignedPersonalMessage':
            case 'setPrepareOrder':
            case 'setSendOrder':
              this.events.emit(request.method, { payload })
              break
            default:
              console.trace(`Protocole: method not found ${request.method}`)
          }
        }
      }
    }

    window.addEventListener('message', modalListener.bind(this))
    return true
  }
}

module.exports = Vaultx
