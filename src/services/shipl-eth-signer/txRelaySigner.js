const Transaction = require('ethereumjs-tx')
const UportIdentity = require('uport-identity')
const util = require('ethereumjs-util')
const solsha3 = require('solidity-sha3').default
const leftPad = require('left-pad')
const txutils = require('./txutils')

const version = UportIdentity.TxRelay.latestVersion
const txRelayAbi = UportIdentity.TxRelay[version].abi

class TxRelaySigner {
  constructor (keypair, txRelayAddress, txSenderAddress, whitelistOwner) {
    this.keypair = keypair
    this.txRelayAddress = txRelayAddress
    this.txSenderAddress = txSenderAddress
    this.whitelistOwner = whitelistOwner
  }

  getAddress () {
    return this.keypair.address
  }

  async signRawTx (rawTx, customSignFunction) {
    rawTx = util.stripHexPrefix(rawTx)
    const txCopy = new Transaction(Buffer.from(rawTx, 'hex'))

    let nonce = txCopy.nonce.toString('hex')
    var to = txCopy.to.toString('hex')
    var data = txCopy.data.toString('hex')
    if (!nonce) {
      nonce = '0'
    }

    // Tight packing, as Solidity sha3 does
    const hashInput = '0x1900' + util.stripHexPrefix(this.txRelayAddress) +
                util.stripHexPrefix(this.whitelistOwner) + pad(nonce) + to + data
    const hash = solsha3(hashInput)
    let sig
    if (customSignFunction === undefined) {
      sig = this.signMsgHash(hash)
    } else {
      sig = await customSignFunction(hash)
      sig = util.fromRpcSig(sig)
    }

    const wrapperTx = {
      'gasPrice': txCopy.gasPrice,
      'gasLimit': txCopy.gasLimit,
      'value': 0,
      'to': this.txRelayAddress,
      'from': this.txSenderAddress
    }
    const rawMetaSignedTx = txutils.functionTx(txRelayAbi, 'relayMetaTx',
      [ sig.v,
        util.addHexPrefix(sig.r.toString('hex')),
        util.addHexPrefix(sig.s.toString('hex')),
        util.addHexPrefix(to),
        util.addHexPrefix(data),
        util.addHexPrefix(this.whitelistOwner)
      ], wrapperTx)

    return (null, rawMetaSignedTx)
  }

  signMsgHash (msgHash) {
    return util.ecsign(Buffer.from(util.stripHexPrefix(msgHash), 'hex'), Buffer.from(util.stripHexPrefix(this.keypair.privateKey), 'hex'))
  }

  decodeMetaTx (rawMetaSignedTx) {
    const tx = new Transaction(Buffer.from(rawMetaSignedTx, 'hex'))
    const txData = tx.data.toString('hex')
    const types = txutils._getTypesFromAbi(txRelayAbi, 'relayMetaTx')
    const params = txutils._decodeFunctionTxData(txData, types)

    let decodedMetaTx = {}
    decodedMetaTx.v = parseFloat(params[0])
    decodedMetaTx.r = Buffer.from(util.stripHexPrefix(params[1]), 'hex')
    decodedMetaTx.s = Buffer.from(util.stripHexPrefix(params[2]), 'hex')
    decodedMetaTx.to = util.stripHexPrefix(params[3])
    decodedMetaTx.data = util.stripHexPrefix(params[4])
    decodedMetaTx.whitelistOwner = util.stripHexPrefix(params[5])
    // signed tx data must start with the address of the meta sender
    decodedMetaTx.claimedAddress = '0x' + decodedMetaTx.data.slice(32, 72)

    return decodedMetaTx
  }

  isMetaSignatureValid (txRelayAddress, decodedMetaTx, nonce) {
    if (typeof nonce !== 'string') throw new Error('nonce must be a string')
    const hashInput = '0x1900' + util.stripHexPrefix(txRelayAddress) + util.stripHexPrefix(decodedMetaTx.whitelistOwner) +
                pad(nonce) + decodedMetaTx.to + decodedMetaTx.data
    const msgHash = solsha3(hashInput)
    const pubkey = util.ecrecover(Buffer.from(util.stripHexPrefix(msgHash), 'hex'), decodedMetaTx.v, decodedMetaTx.r, decodedMetaTx.s)
    const address = '0x' + util.pubToAddress(pubkey).toString('hex')
    return address === decodedMetaTx.claimedAddress
  }
}

function pad (n) {
  if (n.startsWith('0x')) {
    n = util.stripHexPrefix(n)
  }
  return leftPad(n, '64', '0')
}

module.exports = TxRelaySigner
