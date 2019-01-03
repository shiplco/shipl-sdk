const Transaction = require('ethereumjs-tx')
const coder = require('web3-eth-abi')
const rlp = require('rlp')
const CryptoJS = require('crypto-js')

function add0x (input) {
  if (typeof (input) !== 'string') {
    return input
  } else if (input.length < 2 || input.slice(0, 2) !== '0x') {
    return '0x' + input
  } else {
    return input
  }
}

function _encodeFunctionTxData (functionName, types, args) {
  const fullName = functionName + '(' + types.join() + ')'
  const signature = CryptoJS.SHA3(fullName, { outputLength: 256 }).toString(CryptoJS.enc.Hex).slice(0, 8)
  const dataHex = signature + coder.encodeParameters(types, args).slice(2)

  return dataHex
}

function _decodeFunctionTxData (data, types) {
  const bytes = data.slice(8)

  return coder.decodeParameters(types, bytes)
}

function _getTypesFromAbi (abi, functionName) {
  function matchesFunctionName (json) {
    return (json.name === functionName && json.type === 'function')
  }

  function getTypes (json) {
    return json.type
  }

  const funcJson = abi.filter(matchesFunctionName)[0]

  return (funcJson.inputs).map(getTypes)
}

function functionTx (abi, functionName, args, txObject) {
  const types = _getTypesFromAbi(abi, functionName)
  const txData = _encodeFunctionTxData(functionName, types, args)

  let txObjectCopy = {}
  txObjectCopy.to = add0x(txObject.to)
  txObjectCopy.gasPrice = add0x(txObject.gasPrice)
  txObjectCopy.gasLimit = add0x(txObject.gasLimit)
  txObjectCopy.nonce = add0x(txObject.nonce)
  txObjectCopy.data = add0x(txData)
  txObjectCopy.value = add0x(txObject.value)

  return (new Transaction(txObjectCopy)).serialize().toString('hex')
}

function createdContractAddress (fromAddress, nonce) {
  const rlpEncodedHex = rlp.encode([Buffer.from(fromAddress, 'hex'), nonce]).toString('hex')
  const rlpEncodedWordArray = CryptoJS.enc.Hex.parse(rlpEncodedHex)
  const hash = CryptoJS.SHA3(rlpEncodedWordArray, {outputLength: 256}).toString(CryptoJS.enc.Hex)

  return hash.slice(24)
}

function createContractTx (fromAddress, txObject) {
  let txObjectCopy = {}
  txObjectCopy.to = add0x(txObject.to)
  txObjectCopy.gasPrice = add0x(txObject.gasPrice)
  txObjectCopy.gasLimit = add0x(txObject.gasLimit)
  txObjectCopy.nonce = add0x(txObject.nonce)
  txObjectCopy.data = add0x(txObject.data)
  txObjectCopy.value = add0x(txObject.value)

  const contractAddress = createdContractAddress(fromAddress, txObject.nonce)
  const tx = new Transaction(txObjectCopy)

  return {tx: tx.serialize().toString('hex'), addr: contractAddress}
}

function valueTx (txObject) {
  let txObjectCopy = {}
  txObjectCopy.to = add0x(txObject.to)
  txObjectCopy.gasPrice = add0x(txObject.gasPrice)
  txObjectCopy.gasLimit = add0x(txObject.gasLimit)
  txObjectCopy.nonce = add0x(txObject.nonce)
  txObjectCopy.value = add0x(txObject.value)

  const tx = new Transaction(txObjectCopy)
  return tx.serialize().toString('hex')
}

module.exports = {
  _encodeFunctionTxData: _encodeFunctionTxData,
  _decodeFunctionTxData: _decodeFunctionTxData,
  _getTypesFromAbi: _getTypesFromAbi,
  functionTx: functionTx,
  createdContractAddress: createdContractAddress,
  createContractTx: createContractTx,
  valueTx: valueTx,
  add0x: add0x
}
