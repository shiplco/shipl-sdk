const createPayload = require('web3-provider-engine/util/create-payload.js')

class Subprovider {
  setEngine (engine) {
    this.engine = engine
    engine.on('block', function (block) {
      this.currentBlock = block
    })
  }
  handleRequest (payload, next, end) {
    throw new Error('Subproviders should override `handleRequest`.')
  }
  emitPayload (payload, cb) {
    this.engine.sendAsync(createPayload(payload), cb)
  }
}

module.exports = Subprovider
