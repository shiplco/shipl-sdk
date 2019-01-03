const Subprovider = require('./subprovider')
const WebSocket = global.WebSocket || require('ws')
const axios = require('axios')
const Backoff = require('backoff')
const EventEmitter = require('events')
const createPayload = require('web3-provider-engine/util/create-payload')

class WsSubprovider extends Subprovider {
  constructor ({ rpcUrl, sensuiUrl, authToken, debug }) {
    super()
    EventEmitter.call(this)
    this.backoff = Backoff.exponential({
      randomisationFactor: 0.2,
      maxDelay: 5000
    })
    this.connectTime = null
    this.log = debug ? (...args) => console.info(console, ['[WSProvider]', ...args]) : () => { }
    this.pendingRequests = new Map()
    this.socket = null
    this.unhandledRequests = []
    this.authToken = authToken
    this.rpcUrl = rpcUrl
    this.sensuiUrl = sensuiUrl
    this.sensui = axios.create({
      baseURL: this.sensuiUrl,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.authToken }
    })
    this._handleSocketClose = this._handleSocketClose.bind(this)
    this._handleSocketMessage = this._handleSocketMessage.bind(this)
    this._handleSocketOpen = this._handleSocketOpen.bind(this)
    // Called when a backoff timeout has finished. Time to try reconnecting.
    this.backoff.on('ready', () => {
      this._openSocket()
    })
    this._openSocket()
  }
  handleRequest (payload, next, end) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.unhandledRequests.push(Array.from(arguments))
      this.log('Socket not open. Request queued.')
      return
    }
    if (payload.method === 'eth_sendRawTransaction') {
      this.pendingRequests.set(payload.id, [payload, end])
      const newPayload = payload.params[0]
      newPayload.jsonRpcReponse = true
      newPayload.id = payload.id
      this.sensui.post('/relay', newPayload)
    } else {
      this.pendingRequests.set(payload.id, [payload, end])
      const newPayload = createPayload(payload)
      delete newPayload.origin
      this.socket.send(JSON.stringify(newPayload))
      this.log(`Sent: ${newPayload.method} #${newPayload.id}`)
    }
  }
  _handleSocketClose ({ reason, code }) {
    this.log(`Socket closed, code ${code} (${reason || 'no reason'})`)
    // If the socket has been open for longer than 5 seconds, reset the backoff
    if (this.connectTime && Date.now() - this.connectTime > 5000) {
      this.backoff.reset()
    }
    this.socket.removeEventListener('close', this._handleSocketClose)
    this.socket.removeEventListener('message', this._handleSocketMessage)
    this.socket.removeEventListener('open', this._handleSocketOpen)
    this.socket = null
    this.backoff.backoff()
  }
  _handleSocketMessage (message) {
    let payload
    try {
      payload = JSON.parse(message.data)
    } catch (e) {
      this.log('Received a message that is not valid JSON:', payload)
      return
    }
    if (payload.id === undefined) {
      return this.emit('data', null, payload)
    }
    if (!this.pendingRequests.has(payload.id)) {
      return
    }
    const [originalReq, end] = this.pendingRequests.get(payload.id)
    this.pendingRequests.delete(payload.id)
    this.log(`Received: ${originalReq.method} #${payload.id}`)
    if (payload.error) {
      return end(new Error(payload.error.message))
    }
    end(null, payload.result)
  }
  _handleSocketOpen () {
    this.log('Socket open.')
    this.connectTime = Date.now()
    // Any pending requests need to be resent because our session was lost
    // and will not get responses for them in our new session.
    this.pendingRequests.forEach((value) => this.unhandledRequests.push(value))
    this.pendingRequests.clear()
    const unhandledRequests = this.unhandledRequests.splice(0, this.unhandledRequests.length)
    unhandledRequests.forEach((request) => {
      this.handleRequest.apply(this, request)
    })
  }
  _openSocket () {
    this.log('Opening socket...')
    this.socket = new WebSocket(this.rpcUrl)
    this.socket.addEventListener('close', this._handleSocketClose)
    this.socket.addEventListener('message', this._handleSocketMessage)
    this.socket.addEventListener('open', this._handleSocketOpen)
    this.sensui.interceptors.response.use((response) => {
      this._handleSocketMessage({ data: JSON.stringify(response.data) })
    }, (error) => {
      return Promise.reject(error)
    })
  }
}
// multiple inheritance
Object.assign(WsSubprovider.prototype, EventEmitter.prototype)

module.exports = WsSubprovider
