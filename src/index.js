const HttpSubprovider = require('./services/httpSubprovider')
const VaultX = require('./services/vaultX')
const ProviderEngine = require('web3-provider-engine')
const CacheSubprovider = require('web3-provider-engine/subproviders/cache.js')
const FixtureSubprovider = require('web3-provider-engine/subproviders/fixture.js')
const FilterSubprovider = require('web3-provider-engine/subproviders/filters.js')
const HookedWalletSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js')
const SubscriptionSubprovider = require('web3-provider-engine/subproviders/subscriptions')

const engine = new ProviderEngine()

class Shipl {
  constructor ({ appId, network, rpcUrl, payer, masterAddress, companyName, companyEmail, smartContractFunctions, providerType, inputCallback, chainId }) {
    this.appId = appId
    this.network = network
    this.rpcUrl = rpcUrl
    this.payer = payer
    this.masterAddress = masterAddress
    this.companyName = companyName
    this.companyEmail = companyEmail
    this.smartContractFunctions = smartContractFunctions
    this.providerType = providerType
    this.inputCallback = inputCallback
    this.confirmation = {
      approveMessage: false,
      approvePersonalMessage: false,
      approveTransaction: false,
      approveTypedMessage: false
    }
    this.chainId = chainId

    switch (this.network) {
      case 'rinkeby':
      case 'ropsten':
      case 'kovan':
        this.authUrl = 'https://testnets.api.v1.shipl.co/auth'
        this.walletUrl = 'https://testnets.api.v1.shipl.co/vault/wallet'
        this.ordersServiceUrl = 'https://testnets.api.v1.shipl.co/meta'
        this.gatewayUrl = 'https://testnets.api.v1.shipl.co'
        this.fetchWalletApiUrl = 'https://testnets.api.v1.shipl.co'
        break
      case 'poa':
      case 'xdai':
      case 'mainnet':
        this.ordersServiceUrl = 'https://livenets.api.v1.shipl.co/meta'
        this.authUrl = 'https://livenets.api.v1.shipl.co/auth'
        this.walletUrl = 'https://livenets.api.v1.shipl.co/vault/wallet'
        this.gatewayUrl = 'https://livenets.api.v1.shipl.co'
        this.fetchWalletApiUrl = 'https://livenets.api.v1.shipl.co'
        break
      default:
        throw new Error('Unrecognised network')
    }

    this.vaultX = new VaultX({
      rpcUrl: this.rpcUrl,
      walletUrl: this.walletUrl,
      authUrl: this.authUrl,
      ordersUrl: this.ordersServiceUrl,
      appId: this.appId,
      client: this.client,
      network: this.network,
      providerType: this.providerType,
      chainId: this.chainId,
      gatewayUrl: this.gatewayUrl,
      fetchWalletApiUrl: this.fetchWalletApiUrl
    })

    this.wrapperConnected = this.wrapperConnected.bind(this)
  }

  static async create ({ appId, companyEmail, companyName, provider, web3Provider, web3Fallback, inputCallback }) {
    if (!appId) throw new Error('The field \'appId\' is missing.')
    if (!provider) throw new Error('The field \'provider\' is missing. It should be equal to \'automatic\' or \'shiplwallet\' or \'privateKey\' or \'manual\'.')
    if (provider !== 'automatic' && provider !== 'manual' && provider !== 'shiplwallet' && provider !== 'privateKey' && provider !== 'web3Connect') throw new Error('Invalid parameter \'provider\' given. It should be equal to \'automatic\' or \'shiplwallet\' or \'privateKey\' or \'manual\' or \'web3Connect\'.')
    if (provider === 'manual' && !web3Provider) throw new Error('The field \'provider\' is configured on \'manual\' but web3Provider is undefined.')
    if (provider !== 'shiplwallet' && !inputCallback) throw new Error('For providerType configured to \'automatic\' or \'manual\' or \'privateKey\' you have to pass an input callback')

    try {
      const responseApp = await window.fetch(`https://wm5w2nm92m.execute-api.us-west-2.amazonaws.com/prod/app/${appId}`)
      const app = await responseApp.json()
      const responseSc = await window.fetch(`https://wm5w2nm92m.execute-api.us-west-2.amazonaws.com/prod/app/sc/list/${appId}`)
      const smartContractFunctions = await responseSc.json()

      let providerType
      if (provider === 'automatic') {
        const result = await this.chooseProvider()
        providerType = result.providerType
        provider = result.provider
      } else if (provider === 'shiplwallet') {
        providerType = 'shiplwallet'
      } else if (provider === 'manual') {
        await window.ethereum.enable()
        providerType = 'external'
      } else if (provider === 'web3Connect') {
        providerType = 'external'
        web3Provider = await web3Fallback()
      } else {
        providerType = 'privateKey'
      }

      const shipleWallet = new Shipl({
        inputCallback,
        appId,
        network: app.network,
        rpcUrl: app.rpcUrl,
        masterAddress: app.masterAddress,
        payer: app.payer,
        companyEmail,
        companyName,
        smartContractFunctions,
        web3Provider,
        provider,
        providerType,
        chainId: app.chainId || 1
      })
      return shipleWallet
    } catch (err) {
      console.log('Error on Initialize', err)
      throw err
    }
  }

  chooseProvider () {
    window.addEventListener('load', async function () {
      if (window.ethereum) {
        try {
          await window.ethereum.enable()
          return { provider: window.ethereum, providerType: 'external' }
        } catch (error) {
          console.error(error)
        }
      } else {
        return { providerType: 'shiplwallet' }
      }
    })
  }

  enable () {
    console.log('Shipl Provider enabled')
  }

  logout () {
    this.vaultX.logout()
  }

  getNetwork () {
    return this.network
  }

  getIdentity () {
    return this.vaultX.identity
  }

  getDeviceKey () {
    return this.vaultX.deviceKey
  }

  async login (inputCallback) {
  }

  async externalProviderConnected (hanlder, callback) {
    callback(hanlder)
  }

  wrapperConnected ({ postMessageName, data, eventName }) {
    return new Promise((resolve) => {
      this.vaultX.modal.formatPostMessage(postMessageName, data)
      this.vaultX.events.once(eventName, result => {
        if (result.hasOwnProperty('payload')) {
          resolve(result.payload)
        } else {
          resolve(result)
        }
        // resolve(result.payload)
      })
    })
  }

  getEthersSigner () {
    return this.vaultX.signer
  }

  getWeb3Provider () {
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
      engine.addProvider(
        new HookedWalletSubprovider({
          getAccounts: (callback) => {
            this.externalProviderConnected(callback, async callback => {
              const { identity, deviceKey } = await this.wrapperConnected({ postMessageName: 'getAccount', eventName: 'setAccount' })
              callback(null, [identity, deviceKey])
            })
          },
          // SIGNATURE
          signMessage: async (msgParams, cb) => {
            const { signedData } = await this.wrapperConnected({ postMessageName: 'signMsg', eventName: 'signedMessage', data: msgParams })
            cb(null, signedData.toString('hex'))
          },
          signPersonalMessage: async (msgParams, cb) => {
            const { signedData } = await this.wrapperConnected({ postMessageName: 'signPersonalMsg', eventName: 'signedPersonalMessage', data: msgParams })
            cb(null, signedData.toString('hex'))
          },
          signTypedMessage: async (msgParams, cb) => {
            const { signedData } = await this.wrapperConnected({ postMessageName: 'signTypedMsg', eventName: 'signedTypedMessage', data: msgParams })
            cb(null, signedData.toString('hex'))
          },
          signTransaction: async (txParams, cb) => {
            // Check if smart contract and function called are withelisted for a given appID.
            const bytes = Buffer.from(txParams.data.slice(2), 'hex').slice(0, 4)
            const functionSignature = '0x' + bytes.toString('hex')
            const smartContractFound = this.smartContractFunctions.find(item => item.address === txParams.to)
            if (!smartContractFound) throw new Error(`The smart contract: ${txParams.to} is not whitelisted.`)
            const functionFound = smartContractFound.smFunctions.find(item => item.functionSignature === functionSignature)
            if (!functionFound) throw new Error(`The function: ${functionSignature} is not whitelisted.`)

            let order

            try {
              order = await this.wrapperConnected({
                postMessageName: 'getPrepareOrder',
                data: {
                  payer: functionFound.payer,
                  txParams
                },
                eventName: 'setPrepareOrder'
              })
            } catch (error) {
              return (error)
            }

            if (cb) {
              cb(null, order)
            }
            return (null, order)
          }
        })
      )
      engine.addProvider(
        new HttpSubprovider({
          rpcUrl: this.rpcUrl,
          wrapperConnected: this.wrapperConnected
        })
      )
      engine.addProvider(new SubscriptionSubprovider())

      engine.on('error', error => {
        console.error('Engine Error: ', error)
      })
      engine.start()
      return engine
    } catch (error) {
      console.log(error)
      throw error
    }
  }
}

Object.defineProperty(exports, '__esModule', {
  value: true
})
exports.default = Shipl
