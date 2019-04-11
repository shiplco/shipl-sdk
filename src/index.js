const BlueBird = require('bluebird')
const Transaction = require('ethereumjs-tx')
const UportIdentity = require('uport-identity')
const Web3 = require('web3')
const util = require('ethereumjs-util')
const ethSigUtil = require('eth-sig-util')
const jwtDecode = require('jwt-decode')
const ProviderEngine = require('web3-provider-engine')
const CacheSubprovider = require('web3-provider-engine/subproviders/cache.js')
const FixtureSubprovider = require('web3-provider-engine/subproviders/fixture.js')
const FilterSubprovider = require('web3-provider-engine/subproviders/filters.js')
const HookedWalletSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js')
const NonceTrackerSubprovider = require('./services/nonceTracker')
const SubscriptionSubprovider = require('web3-provider-engine/subproviders/subscriptions')
const HttpSubprovider = require('./services/httpSubprovider.js')
const TxRelaySigner = require('./services/shipl-eth-signer/txRelaySigner')
const KeyPair = require('./services/shipl-eth-signer/generators/keyPair')
const InternalTxDisecter = require('./services/decoder')
const shiplID = require('./services/shiplID')

const engine = new ProviderEngine()
const txRelayArtifact = UportIdentity.TxRelay.v2

class Provider {
  constructor({
    appId,
    privateKey,
    web3Provider,
    proxyAddress,
    network,
    rpcUrl,
    txRelayAddress,
    metaIdentityManagerAddress,
    txSenderAddress,
    whiteListAddress = '0x0000000000000000000000000000000000000000'
  }) {
    this.rpcUrl = rpcUrl
    this.appId = appId
    this.network = network
    this.whiteListAddress = whiteListAddress
    this.proxyAddress = proxyAddress
    this.senderKeyPair = {}
    switch (this.network) {
      case 'rinkeby':
        this.ordersServiceUrl = 'https://testnet.api.shipl.co/orders'
        this.authUrl = 'https://testnet.api.shipl.co/auth'
        this.rpcUrl = 'https://rinkeby.infura.io/v3/e9b9f45b940d4ff3a6a54e0501ecfa0d'
        this.txRelayAddress = '0xda8c6dce9e9a85e6f9df7b09b2354da44cb48331'
        this.metaIdentityManagerAddress = '0x87ea811785c4bd30fc104c2543cf8ed90f7eeec7'
        this.txSenderAddress = '0xb01ab511d04082fd2615e7bbf9fdd7debc887519'
        break
      case 'ropsten':
        this.ordersServiceUrl = 'https://testnet.api.shipl.co/orders'
        this.authUrl = 'https://6o0tys3etb.execute-api.us-east-1.amazonaws.com/production' // FIXME: change it
        this.rpcUrl = 'https://ropsten.infura.io/v3/e9b9f45b940d4ff3a6a54e0501ecfa0d'
        this.txRelayAddress = '0xa5e04cf2942868f5a66b9f7db790b8ab662039d5'
        this.metaIdentityManagerAddress = '0xbdaf396ce9b9b9c42cd40d37e01b5dbd535cc960'
        this.txSenderAddress = '0xb01ab511d04082fd2615e7bbf9fdd7debc887519'
        break
      case 'kovan':
        this.ordersServiceUrl = 'https://testnet.api.shipl.co/orders'
        this.authUrl = 'https://testnet.api.shipl.co/auth'
        this.rpcUrl = 'https://kovan.infura.io/v3/e9b9f45b940d4ff3a6a54e0501ecfa0d'
        this.txRelayAddress = '0xa9235151d3afa7912e9091ab76a36cbabe219a0c'
        this.metaIdentityManagerAddress = '0x737f53c0cebf0acd1ea591685351b2a8580702a5'
        this.txSenderAddress = '0xb01ab511d04082fd2615e7bbf9fdd7debc887519'
        break
      case 'poa':
        this.ordersServiceUrl = 'https://mainnet.api.shipl.co/orders'
        this.authUrl = 'https://mainnet.api.shipl.co/auth'
        this.rpcUrl = 'https://core.poa.network'
        this.txRelayAddress = '0xfd36f89fd9c148cb07047fcd3644f55008122017'
        this.metaIdentityManagerAddress = '0x3cf59cb93579719d450488a039dcdfda321289f2'
        this.txSenderAddress = '0x010a196aa6250095a6e63de58da475c138045911'
        break
      case 'xdai':
        this.ordersServiceUrl = 'https://mainnet.api.shipl.co/orders'
        this.authUrl = 'https://mainnet.api.shipl.co/auth'
        this.rpcUrl = 'https://xdai.poa.network'
        this.txRelayAddress = '0x2ba73595be818992455537d352c97372c4b288f5'
        this.metaIdentityManagerAddress = '0xad7112da4cc81f1da0271fc3d0e2300d68613d7c'
        this.txSenderAddress = '0x010a196aa6250095a6e63de58da475c138045911'
        break
      case 'mainnet':
        this.ordersServiceUrl = 'https://mainnet.api.shipl.co/orders'
        this.authUrl = 'https://mainnet.api.shipl.co/auth'
        this.rpcUrl = 'https://mainnet.infura.io/v3/e9b9f45b940d4ff3a6a54e0501ecfa0d'
        this.txRelayAddress = '0xec2642cd5a47fd5cca2a8a280c3b5f88828aa578'
        this.metaIdentityManagerAddress = '0x27500ae27b6b6ad7de7d64b1def90f3e6e7ced47'
        this.txSenderAddress = '0x010a196aa6250095a6e63de58da475c138045911'
        break
      default:
        this.rpcUrl = rpcUrl
        this.txRelayAddress = txRelayAddress
        this.metaIdentityManagerAddress = metaIdentityManagerAddress
        this.txSenderAddress = txSenderAddress
        break
    }
    this.isWeb3Provided = web3Provider !== undefined
    this.web3 =
      this.isWeb3Provided === true
        ? new Web3(web3Provider.currentProvider || web3Provider)
        : new Web3(this.rpcUrl)
    if (this.isWeb3Provided === true) {
      this.senderKeyPair.address =
        this.web3.currentProvider.selectedAddress || this.web3.eth.defaultAccount
    } else if (privateKey !== undefined) {
      this.senderKeyPair = KeyPair.fromPrivateKey(privateKey)
    } else {
      throw new Error('A web3 provider, or a private key, should be passed')
    }
    if (!this.senderKeyPair.address) throw new Error('Address not found')

    this.signFunction = async hash => {
      return new Promise((resolve, reject) => {
        this.web3.eth.personal.sign(hash, this.senderKeyPair.address, (error, sig) => {
          if (error) reject(error)
          if (sig.error) {
            reject(new Error(sig.error.message))
          }
          resolve(sig)
        })
      })
    }
    this.signTypedDataFunction = async hash => {
      return new Promise((resolve, reject) => {
        const msgParams = [{ type: 'string', name: 'Message', value: hash }]
        this.web3.currentProvider.sendAsync(
          {
            method: 'eth_signTypedData',
            params: [msgParams, this.senderKeyPair.address],
            from: this.senderKeyPair.address
          },
          function(err, result) {
            if (err) {
              reject(err)
            }
            resolve(result.result)
          }
        )
      })
    }
    this.TxRelay = BlueBird.promisifyAll(
      new this.web3.eth.Contract(txRelayArtifact.abi, this.txRelayAddress)
    )
    this.txRelaySigner = new TxRelaySigner(
      this.senderKeyPair,
      this.txRelayAddress,
      this.txSenderAddress,
      this.whiteListAddress
    )
    this.internalTxDisecter = new InternalTxDisecter(this.web3)
    this.shiplID = new shiplID({ appId: this.appId, client: 'meta', authUrl: this.authUrl })
    this.getInternalTransactionsData = this.internalTxDisecter.getInternalTransactionsData

    // BINDING
    this.login = this.login.bind(this)
    this.getWeb3Provider = this.getWeb3Provider.bind(this)
  }

  async login(inputCallback) {
    if (!inputCallback) throw new Error('missing inputCallback')

    let result
    let signature
    let phoneNumber
    try {
      if (this.shiplID.isLogin()) {
        result = this.shiplID.auth
      } else {
        if (!await this.shiplID.exist(this.senderKeyPair.address))
          phoneNumber = await inputCallback('Enter your phone number: ')
        result = await this.shiplID.login(phoneNumber, this.senderKeyPair.address)
        if (result.session) {
          const msgParams = [{ type: 'string', name: 'Message', value: result.challenge }]
          console.log(msgParams)
          if (this.isWeb3Provided === true) {
            signature = await this.signTypedDataFunction(msgParams)
          } else {
            signature = ethSigUtil.signTypedData(
              Buffer.from(util.stripHexPrefix(this.senderKeyPair.privateKey), 'hex'),
              { data: msgParams }
            )
          }
        } else {
          signature = await inputCallback('Enter your confirmation code: ')
        }
        result = await this.shiplID.verify(signature)
      }
      const decodedIdentityObj = jwtDecode(result.token.IdToken)
      const identity = decodedIdentityObj['custom:identity-' + this.network]
      this.proxyAddress = identity

      return {
        authToken: result.token,
        deviceKey: this.senderKeyPair.address,
        identity
      }
    } catch (error) {
      throw error
    }
  }

  getWeb3Provider() {
    try {
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
          getAccounts: cb => {
            cb(null, [this.senderKeyPair.address])
          },
          getPrivateKey: cb => {
            cb(null, this.senderKeyPair.privateKey)
          },
          signTransaction: async txParams => {
            const txRelayNonce = await this.TxRelay.methods
              .getNonce(this.senderKeyPair.address)
              .call()
            txParams.nonce = this.web3.utils.toHex(txRelayNonce)
            txParams.data = this.web3.eth.abi.encodeFunctionCall(
              {
                inputs: [
                  {
                    name: 'sender',
                    type: 'address'
                  },
                  {
                    name: 'identity',
                    type: 'address'
                  },
                  {
                    name: 'destination',
                    type: 'address'
                  },
                  {
                    name: 'value',
                    type: 'uint256'
                  },
                  {
                    name: 'data',
                    type: 'bytes'
                  }
                ],
                name: 'forwardTo',
                type: 'function'
              },
              [
                this.senderKeyPair.address,
                this.proxyAddress,
                txParams.to,
                txParams.value || 0,
                txParams.data
              ]
            )
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
              blockchain: this.network,
              appId: this.appId
            }
            return null, params
          }
        })
      )

      const filterAndSubsSubprovider = new SubscriptionSubprovider()
      filterAndSubsSubprovider.on('data', (err, notification) => {
        engine.emit('data', err, notification)
      })
      engine.addProvider(filterAndSubsSubprovider)

      engine.addProvider(
        new HttpSubprovider({
          rpcUrl: this.rpcUrl,
          ordersServiceUrl: this.ordersServiceUrl,
          getIdToken: this.shiplID.getIdToken
        })
      )
      engine.on('error', error => {
        console.error(error)
      })
      engine.start()
      return engine
    } catch (error) {
      console.log(error)
      throw error
    }
  }
}

module.exports = Provider
