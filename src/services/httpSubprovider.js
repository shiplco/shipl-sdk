const Subprovider = require('./subprovider.js')
const createPayload = require('web3-provider-engine/util/create-payload.js')

class RpcSource extends Subprovider {
  constructor ({ rpcUrl, wrapperConnected }) {
    super()
    this.rpcUrl = rpcUrl
    this.wrapperConnected = wrapperConnected
    if (!this.rpcUrl) throw new Error('RpcSource: rpcUrl is undefined')
    if (!this.wrapperConnected) throw new Error('no wrapperConnected function')
  }

  async handleRequest (payload, next, end) {
    let newPayload = createPayload(payload)
    if (payload.method === 'eth_sendRawTransaction') {
      newPayload = payload.params[0]
    }

    try {
      if (payload.method === 'eth_sendRawTransaction') {
        try {
          const txHash = await this.wrapperConnected({
            postMessageName: 'getSendOrder',
            data: { payload: newPayload },
            eventName: 'setSendOrder'
          })
          return end(null, txHash)
        } catch (error) {
          return end(error.message)
        }
      } else {
        const response = await window.fetch(this.rpcUrl, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(newPayload)
        })
        const data = await response.json()
        if (!response.ok) {
          return end(data.error.message)
        }
        if (payload.method === 'eth_getTransactionReceipt') {
          if (data.result === null || data.result.blockHash === null) {
            return end(null, null)
          } else {
            return end(null, data.result)
          }
        } else {
          return end(null, data.result)
        }
      }
    } catch (error) {
      console.error(error)
      return end(new Error(error.message || error))
    }
  }
}

module.exports = RpcSource
