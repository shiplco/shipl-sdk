class Modal {
  constructor ({ rpcUrl, appId, client, network, authUrl, ordersUrl, walletUrl, gatewayUrl, fetchWalletApiUrl, providerType, chainId }) {
    this.button = undefined
    this.modal = undefined
    this.expertMode = false
    this.rpcUrl = rpcUrl
    this.appId = appId
    this.client = client
    this.network = network
    this.authUrl = authUrl
    this.chainId = chainId
    this.ordersUrl = ordersUrl
    this.walletUrl = walletUrl
    this.providerType = providerType
    this.createOverlay({ rpcUrl, appId, client, network, authUrl, walletUrl, ordersUrl, gatewayUrl, fetchWalletApiUrl, providerType, chainId })
    this.getExpertMode()
  }

  setExpertMode (expert) {
    this.expertMode = expert
    window.localStorage.setItem('vaultx-expert-mode', expert)
    if (expert === 'true' || expert === true) {
      document.getElementById('vaultx-button').style.display = 'block'
    }
  }

  getExpertMode () {
    if (window.localStorage.getItem('vaultx-expert-mode') !== null) {
      this.expertMode = window.localStorage.getItem('vaultx-expert-mode')
      if (this.expertMode === 'true' || this.expertMode === true) {
        document.getElementById('vaultx-button').style.display = 'block'
      }
    }
  }

  createOverlay ({ rpcUrl, appId, client, network, authUrl, walletUrl, ordersUrl, gatewayUrl, fetchWalletApiUrl, providerType, chainId }) {
    const mainnetNetworks = ['mainnet', 'xdai', 'poa']
    const self = this
    const modalItem = function () {
      self.button = document.createElement('div')
      self.button.id = 'vaultx-button'
      self.button.innerHTML = '<img src="https://zupimages.net/up/19/16/ls6o.png" alt="" style="width: 40px; height: 40px; padding: 8px;">'
      self.button.style = 'display: none; position: fixed; bottom: 20px; right: 20px; border: none; border-radius: 0; z-index: 2147483647; background: #17275d; border-radius: 50%;'
      document.body.appendChild(self.button)
      self.button.addEventListener('click', () => {
        self.formatPostMessage('openWallet')
      })

      const modalStyle = document.createElement('style')
      modalStyle.innerHTML = '\n  .vaultx-iframe {\n    display: none;\n    position: fixed;\n    top: 0;\n    right: 0;\n    width: 100%;\n    height: 100%;\n    border: none;\n    border-radius: 0;\n    z-index: 2147483647;\n  }\n'
      modalStyle.type = 'text/css'
      document.head.appendChild(modalStyle)

      self.modal = document.createElement('iframe')
      self.modal.className = 'vaultx-iframe'
      self.modal.id = 'vaultx-iframe'
      self.modal.name = 'vaultx-iframe'
      // self.modal.src = 'http://localhost:8080'
      self.modal.src = 'https://webauthn.shipl.co'
      // self.modal.allow = 'webauthn publickey-credentials *'
      self.modal.src = mainnetNetworks.includes(network) ? 'https://mainnets.modal.shipl.co' : 'https://us-west-2-modalv2.shipl.co'
      document.body.appendChild(self.modal)
      self.modal.addEventListener('load', function () {
        this.contentWindow.postMessage(self.formatMessage('setAppIdAndClient', {
          rpcUrl,
          appId,
          client,
          network,
          authUrl,
          walletUrl,
          ordersUrl,
          providerType,
          gatewayUrl,
          fetchWalletApiUrl
        }), '*')
      })
    }

    ;[('loaded', 'interactive', 'complete')].indexOf(document.readyState) > -1
      ? modalItem()
      : window.addEventListener('load', modalItem.bind(self))
  }

  show () {
    document.getElementById('vaultx-button').style.display = 'block'
  }

  hide () {
    document.getElementById('vaultx-button').style.display = 'none'
  }

  formatMessage (method, payload, error) {
    if (!method) throw new Error("'formatMessage' method param is missing")
    return `vaultx~${JSON.stringify({ method, payload, error })}`
  }

  formatPostMessage (postMessageName, data) {
    const iframe = document.getElementById('vaultx-iframe')
    const { rpcUrl, appId, client, network, authUrl, ordersUrl, walletUrl, providerType } = this
    if (iframe === null) {
      this.createOverlay({ rpcUrl, appId, client, network, authUrl, ordersUrl, walletUrl, providerType })
      const self = this
      this.modal.addEventListener('load', function () {
        this.contentWindow.postMessage(self.formatMessage(postMessageName, data), '*')
      })
    } else {
      iframe.contentWindow.postMessage(this.formatMessage(postMessageName, data), '*')
    }
  }

  openOverlay () {
    const iframe = document.getElementById('vaultx-iframe')
    iframe.style.display = 'block'
  }

  closeOverlay () {
    const iframe = document.getElementById('vaultx-iframe')
    iframe.style.display = 'none'
  }
}

module.exports = Modal
