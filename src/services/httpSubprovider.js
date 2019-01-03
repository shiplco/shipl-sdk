const xhr = require('request') || window.xhr
const createPayload = require('web3-provider-engine/util/create-payload.js')
const Subprovider = require('./subprovider.js')
const JsonRpcError = require('json-rpc-error')

class RpcSource extends Subprovider {
  constructor ({ rpcUrl, sensuiUrl, authToken }) {
    super()
    this.rpcUrl = rpcUrl
    this.sensuiUrl = sensuiUrl
    this.authToken = authToken
  }

  handleRequest (payload, next, end) {
    let newPayload = createPayload(payload)

    if (payload.method === 'eth_sendRawTransaction') {
      newPayload = payload.params[0]
      newPayload.jsonRpcReponse = true
      newPayload.id = payload.id
    }

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
    xhr({
      uri: payload.method === ('eth_sendRawTransaction') ? (this.sensuiUrl + '/relay') : (this.rpcUrl),
      method: 'POST',
      headers: payload.method === ('eth_sendRawTransaction') ? (Object.assign(headers, { Authorization: 'Bearer ' + this.authToken })) : (headers),
      body: JSON.stringify(newPayload),
      rejectUnauthorized: false
    }, (error, res, body) => {
      if (error) return end(new JsonRpcError.InternalError(error))
      switch (res.statusCode) {
        case 405:
          return end(new JsonRpcError.MethodNotFound())
        case 504: // Gateway timeout
          let msg = `Gateway timeout. The request took too long to process. `
          msg += `This can happen when querying logs over too wide a block range.`
          const error = new Error(msg)
          return end(new JsonRpcError.InternalError(error))
        default:
          if (res.statusCode !== 200) {
            return end(new JsonRpcError.InternalError(res.body))
          }
      }

      let data
      try {
        data = JSON.parse(body) || body
      } catch (error) {
        console.error(error.stack)
        return end(new JsonRpcError.InternalError(error))
      }
      if (data.error) return end(data.error)

      end(null, data.result)
    })
  }
}

module.exports = RpcSource
