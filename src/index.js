const BlueBird = require('bluebird')
const Transaction = require('ethereumjs-tx')
const UportIdentity = require('uport-identity')
const Web3 = require('web3')
const ProviderEngine = require('web3-provider-engine')
const CacheSubprovider = require('web3-provider-engine/subproviders/cache.js')
const FixtureSubprovider = require('web3-provider-engine/subproviders/fixture.js')
const FilterSubprovider = require('web3-provider-engine/subproviders/filters.js')
const HookedWalletSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js')
const NonceTrackerSubprovider = require('./services/nonceTracker')
const SubscriptionSubprovider = require('web3-provider-engine/subproviders/subscriptions')
const WsSubprovider = require('./services/wsSubprovider')
const HttpSubprovider = require('./services/httpSubprovider.js')
const TxRelaySigner = require('./services/shipl-eth-signer/txRelaySigner')
const KeyPair = require('./services/shipl-eth-signer/generators/keyPair')
const InternalTxDisecter = require('./services/decoder')
const IdMgnt = require('./services/idMgnt')
const jwtDecode = require('jwt-decode')

const engine = new ProviderEngine()
const txRelayArtifact = UportIdentity.TxRelay.v2

class Provider {
  constructor (
    { appId,
      privateKey,
      web3Provider,
      proxyAddress,
      network,
      rpcUrl,
      sensuiUrl = 'https://api.shipl.co/sensui',
      nisabaUrl = 'https://api.shipl.co/nisaba',
      unnuUrl = 'https://api.shipl.co/unnu',
      txRelayAddress,
      metaIdentityManagerAddress,
      txSenderAddress,
      whiteListAddress = '0x0000000000000000000000000000000000000000'
    }) {
    this.rpcUrl = rpcUrl
    this.appId = appId
    this.sensuiUrl = sensuiUrl
    this.nisabaUrl = nisabaUrl
    this.unnuUrl = unnuUrl
    this.network = network
    this.whiteListAddress = whiteListAddress
    this.proxyAddress = proxyAddress
    this.senderKeyPair = {}
    switch (this.network) {
      case 'rinkeby':
        this.rpcUrl = 'https://rinkeby.infura.io'
        this.txRelayAddress = '0xda8c6dce9e9a85e6f9df7b09b2354da44cb48331'
        this.metaIdentityManagerAddress = '0x87ea811785c4bd30fc104c2543cf8ed90f7eeec7'
        this.txSenderAddress = '0x97b31FE4fF3e7c2e58F8a98CF13Cb0925459D81c' // In a near future these address will not be the same because on all the networks of the use of mnid on sensui
        break
      case 'ropsten':
        this.rpcUrl = 'wss://ropsten.infura.io/ws'
        this.txRelayAddress = '0xa5e04cf2942868f5a66b9f7db790b8ab662039d5'
        this.metaIdentityManagerAddress = '0xbdaf396ce9b9b9c42cd40d37e01b5dbd535cc960'
        this.txSenderAddress = '0x97b31FE4fF3e7c2e58F8a98CF13Cb0925459D81c'
        break
      case 'kovan':
        this.rpcUrl = 'wss://kovan.infura.io/ws'
        this.txRelayAddress = '0xa9235151d3afa7912e9091ab76a36cbabe219a0c'
        this.metaIdentityManagerAddress = '0x737f53c0cebf0acd1ea591685351b2a8580702a5'
        this.txSenderAddress = '0x97b31FE4fF3e7c2e58F8a98CF13Cb0925459D81c'
        break
      case 'mainnet':
        console.warn('Shipl is not available yet on mainnet. Hope you know what you are doing.')
        this.rpcUrl = 'wss://mainnet.infura.io/ws'
        this.txRelayAddress = '0xec2642cd5a47fd5cca2a8a280c3b5f88828aa578'
        this.metaIdentityManagerAddress = '0x27500ae27b6b6ad7de7d64b1def90f3e6e7ced47'
        this.txSenderAddress = ''
        break
      case '':
        this.rpcUrl = rpcUrl
        this.txRelayAddress = txRelayAddress
        this.metaIdentityManagerAddress = metaIdentityManagerAddress
        this.txSenderAddress = txSenderAddress
        break
    }
    this.isWeb3Provided = web3Provider !== undefined
    this.web3 = ((this.isWeb3Provided === true) ? new Web3(web3Provider.currentProvider) : new Web3(this.rpcUrl))
    if (this.isWeb3Provided === true) {
      this.senderKeyPair.address = window.web3.eth.defaultAccount || this.web3.eth.defaultAccount
    } else if (privateKey !== undefined) {
      this.senderKeyPair = KeyPair.fromPrivateKey(privateKey)
    } else {
      throw new Error('A web3 provider, or a private key, should be passed')
    }
    this.signFunction = async (hash) => {
      const asyncWeb3 = BlueBird.promisifyAll(this.web3.eth)
      const sig = await asyncWeb3.signAsync(hash, this.senderKeyPair.address)
      return sig
    }
    this.TxRelay = BlueBird.promisifyAll(new this.web3.eth.Contract(txRelayArtifact.abi, this.txRelayAddress))
    this.txRelaySigner = new TxRelaySigner(this.senderKeyPair, this.txRelayAddress, this.txSenderAddress, this.whiteListAddress)
    this.internalTxDisecter = new InternalTxDisecter(this.web3)
    this.idMgnt = new IdMgnt({ appId: this.appId, nisabaUrl: this.nisabaUrl, unnuUrl: this.unnuUrl, blockchain: this.network, senderKeyPair: this.senderKeyPair })
    this.getInternalTransactionsData = this.internalTxDisecter.getInternalTransactionsData
    this.login = this.login
    this.start = this.start
  }
  async login (inputCallback) {
    let identityObj = await this.idMgnt.getUserOrCreate(this.senderKeyPair.address, inputCallback)
    // TODO change this
    // this.proxyAddress = identityObj.identity
    this.proxyAddress = '0xab678f1fddb9b2ff3ae7ba568a42b86789598a7f'
    this.authToken = identityObj.authToken
    identityObj.deviceKey = jwtDecode(identityObj.authToken.IdToken)['custom:deviceKey']
    return identityObj
  }
  start () {
    engine.addProvider(
      new FixtureSubprovider({
        web3_clientVersion: 'ProviderEngine/v0.0.0/javascript',
        net_listening: true,
        eth_hashrate: '0x00',
        eth_mining: false,
        eth_syncing: true
      })
    )
    engine.addProvider(new CacheSubprovider())
    engine.addProvider(new FilterSubprovider())
    engine.addProvider(new NonceTrackerSubprovider())
    engine.addProvider(
      new HookedWalletSubprovider({
        getAccounts: (cb) => {
          cb(null, [this.senderKeyPair.address])
        },
        getPrivateKey: (cb) => {
          cb(null, this.senderKeyPair.privateKey)
        },
        signTransaction: async (txParams) => {
          const txRelayNonce = await this.TxRelay.methods.getNonce(this.senderKeyPair.address).call()
          txParams.nonce = Web3.utils.toHex(txRelayNonce)
          txParams.data = this.web3.eth.abi.encodeFunctionCall({
            'inputs': [
              {
                'name': 'sender',
                'type': 'address'
              },
              {
                'name': 'identity',
                'type': 'address'
              },
              {
                'name': 'destination',
                'type': 'address'
              },
              {
                'name': 'value',
                'type': 'uint256'
              },
              {
                'name': 'data',
                'type': 'bytes'
              }],
            'name': 'forwardTo',
            'type': 'function' }, [
            this.senderKeyPair.address,
            this.proxyAddress,
            txParams.to,
            txParams.value || 0,
            txParams.data])
          txParams.to = this.metaIdentityManagerAddress

          const tx = new Transaction(txParams)
          const rawTx = '0x' + tx.serialize().toString('hex')
          let metaSignedTx
          if (this.isWeb3Provided === true) {
            metaSignedTx = await this.txRelaySigner.signRawTx(rawTx, this.signFunction)
          } else {
            metaSignedTx = await this.txRelaySigner.signRawTx(rawTx)
          }
          const params = {
            metaNonce: txParams.nonce,
            metaSignedTx,
            blockchain: this.network
          }
          return (null, params)
        }
      })
    )

    const connectionType = getConnectionType(this.rpcUrl)

    if (connectionType === 'ws') {
      const filterSubprovider = new FilterSubprovider()
      engine.addProvider(filterSubprovider)
      engine.addProvider(
        new WsSubprovider({
          rpcUrl: this.rpcUrl,
          sensuiUrl: this.sensuiUrl,
          authToken: this.authToken
        })
      )
    } else {
      const filterAndSubsSubprovider = new SubscriptionSubprovider()
      filterAndSubsSubprovider.on('data', (err, notification) => {
        engine.emit('data', err, notification)
      })
      engine.addProvider(filterAndSubsSubprovider)

      engine.addProvider(new HttpSubprovider({
        rpcUrl: this.rpcUrl,
        sensuiUrl: this.sensuiUrl,
        authToken: this.authToken
      }))
    }
    engine.on('error', error => {
      console.error(error.stack)
    })
    engine.start()
    return engine
  }
}

function getConnectionType (rpcUrl) {
  if (!rpcUrl) return undefined

  const protocol = rpcUrl.split(':')[0]
  switch (protocol) {
    case 'http':
    case 'https':
      return 'http'
    case 'ws':
    case 'wss':
      return 'ws'
    default:
      throw new Error(`ProviderEngine - unrecognized protocol in "${rpcUrl}"`)
  }
}

module.exports = Provider
