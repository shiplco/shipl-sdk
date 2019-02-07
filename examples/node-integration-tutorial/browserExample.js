// require('promise-to-callback')
const Shipl = require('shipl')
const Eth = require('ethjs')
const abi = require('./targetContract.json').abi
const readline = require('readline-sync')

const privateKey = '5BDF462AF21DAF75F436C80ECED2E402A6EE3EBCEC06BBCB7D99CD4F873082BF'

const appId = 'f40a24f0-5abf-4a9e-81dc-3c7b0b92dd7f'

const start = async () => {
  const shipl = new Shipl({ privateKey, network: 'rinkeby', appId }) // We instanciate the shipl sdk with the privateKey and the choosen network
  const { identity, deviceKey } = await shipl.login('readline-sync')
  console.log('Device key: ' + deviceKey)
  const eth = new Eth(shipl.start())
  const dappContract = eth.contract(abi).at('0xabc59d9a5163d5ab600cccd9108bf532d8d9d7a5')

  const txHash = await dappContract.register(10, { from: deviceKey })
  console.log('Hash: ' + txHash)
  await shipl.getInternalTransactionsData(abi, txHash)
}

start()
