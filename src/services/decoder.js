const UportIdentity = require('uport-identity')
const abiDecoder = require('abi-decoder')
const { promisifyAll } = require('bluebird')

class InternalTxDisecter {
  constructor (web3) {
    this.web3 = web3
    this.getTansaction = promisifyAll(web3.eth.getTransaction)
    abiDecoder.addABI(UportIdentity.MetaIdentityManager.v2.abi)
    abiDecoder.addABI(UportIdentity.TxRelay.v2.abi)
    this.getInternalTransactionsData = this.getInternalTransactionsData.bind(this)
  }

  async getInternalTransactionsData (contractAbi, txHash) {
    abiDecoder.addABI(contractAbi)
    const result = await this.getTansaction(txHash)
    const relayTransaction = abiDecoder.decodeMethod(result.input)
    const identityTransaction = abiDecoder.decodeMethod(relayTransaction.params[4].value)
    const endTransaction = abiDecoder.decodeMethod(identityTransaction.params[4].value)
    return {
      relayTransaction,
      identityTransaction,
      endTransaction
    }
  }
}

module.exports = InternalTxDisecter
