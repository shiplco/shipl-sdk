require('promise-to-callback')
const Shipl = require('shipl')
const Eth = require('ethjs')
const abi = require('./targetContract.json').abi

const main = async() => {
  const shipl = new Shipl({ privateKey: '5BDF462AF21DAF75F436C80ECED2E402A6EE3EBCEC06BBCB7D99CD4F873082BF', network: 'rinkeby' })
  const { identity, deviceKey } = await shipl.login()
  const eth = new Eth(shipl.start())
  const dappContract = eth.contract(abi).at('0xabc59d9a5163d5ab600cccd9108bf532d8d9d7a5')

  const txHash = await dappContract.register(10, { from: deviceKey })
  console.log(`Tx: ${txHash}`)
  await shipl.getInternalTransactionsData(abi, txHash)
}
main()
