const util = require('ethereumjs-util')
const secp256k1 = util.secp256k1
const Random = require('./random')

function hex0x (buffer) {
  return util.addHexPrefix(buffer.toString('hex'))
}

function fromPrivateKey (privateKey) {
  if (!Buffer.isBuffer(privateKey)) {
    privateKey = Buffer.from(privateKey, 'hex')
  }

  const publicKey = util.privateToPublic(privateKey)
  return {
    privateKey: hex0x(privateKey),
    publicKey: hex0x(publicKey),
    address: hex0x(util.pubToAddress(publicKey))
  }
}

function generate (callback) {
  if (!Random.randomBytes) {
    Random.randomBytes = Random.naclRandom
  }
  Random.randomBytes(32, function (error, rand) {
    if (error) { return callback(error, null) }
    if (secp256k1.privateKeyVerify(rand)) {
      const privateKey = Buffer.from(rand)
      callback(null, fromPrivateKey(privateKey))
    } else {
      generate(callback)
    }
  })
}

const KeyPair = {
  generate: generate,
  fromPrivateKey: fromPrivateKey
}

module.exports = KeyPair
