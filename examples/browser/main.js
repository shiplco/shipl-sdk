const targetContractAddress = '0xAbC59d9a5163d5AB600ccCd9108bF532D8d9D7A5' // testnet
// const targetContractAddress = '0xd35D57Fb2ED34a52F0697D37fb6bC0f182de7475' // mainnet
const appId = '5fc6c72e-db33-4829-9a81-a4227b96238c'//'YOUR_SHIPL_APP_ID' // testnet

const contractAbi = [
  {
    'constant': true,
    'inputs': [
      {
        'name': '',
        'type': 'address'
      }
    ],
    'name': 'registry',
    'outputs': [
      {
        'name': '',
        'type': 'uint256'
      }
    ],
    'payable': false,
    'type': 'function'
  },
  {
    'constant': true,
    'inputs': [
      {
        'name': '',
        'type': 'address'
      }
    ],
    'name': 'strRegistry',
    'outputs': [
      {
        'name': '',
        'type': 'string'
      }
    ],
    'payable': false,
    'type': 'function'
  },
  {
    'constant': false,
    'inputs': [
      {
        'name': 'x',
        'type': 'uint256'
      }
    ],
    'name': 'register',
    'outputs': [],
    'payable': false,
    'type': 'function'
  }
]

window.App = {
  register: async function () {
    const value = document.getElementById('amount').value
    const tx = await window.contract.register(value, { from: window.accounts[0] })
    console.log('This is the transaction hash', tx)
    const internalTxDatas = await window.shipl.getInternalTransactionsData(contractAbi, tx)
    console.log('This is the internal transaction datas', internalTxDatas)
  },

  refreshBalance: function () {
    window.contract.registry(window.identity).then(result => {
      const balanceElement = document.getElementById('balance')
      balanceElement.innerHTML = result[0].toNumber()
    }).catch((error) => {
      console.error(error)
      window.alert('Error getting balance; see log.')
    })
  }
}

window.addEventListener('load', async function () {
  if (window.ethereum) {
    try {
      window.accounts = await window.ethereum.enable()
      window.shipl = new window.shipl({ web3Provider: window.ethereum, network: 'ropsten', appId }) // eslint-disable-line
      const { identity, deviceKey } = await window.shipl.login(window.prompt)
      console.log('Local address', deviceKey, identity)
      window.identity = identity
      const identityElement = document.getElementById('identity')
      identityElement.innerHTML = identity
      const deviceKeyElement = document.getElementById('deviceKey')
      deviceKeyElement.innerHTML = deviceKey
      window.web3 = new window.Eth(window.shipl.getWeb3Provider())
      window.contract = new window.web3.contract(contractAbi).at(targetContractAddress) // eslint-disable-line
      window.App.refreshBalance()
    } catch (error) {
      console.error(error)
    }
  }
})
