const Shipl = require('../../dist/shipl.node')
const Web3 = require('web3')
const readline = require('readline-sync')
const { Wallet } = require('ethers')
const targetContractArtifact = require('../shared/targetContract.json')

const privateKey = "36058ae4fa9a7be8437a995b9fff2b2c18371a19c4b8667b0f357d7523befe00"//new Wallet.createRandom().privateKey.slice(2) /* We generate a random ethereum private key */ // eslint-disable-line

const targetContractAddress = '0xAbC59d9a5163d5AB600ccCd9108bF532D8d9D7A5' // ropsten
// const targetContractAddress = '0xfce866a681cc2bcfb727afc4fb133ff67506cd62' // xdai
// const targetContractAddress = '0xa0ad94077987b6758718bcb4de2a3828aada92ad' // poa
// const targetContractAddress = '0xd35D57Fb2ED34a52F0697D37fb6bC0f182de7475' // mainnet
// const appId = 'YOUR_SHIPL_APP_ID'
const appId = '5fc6c72e-db33-4829-9a81-a4227b96238c'

async function start () {
  const shipl = new Shipl({ privateKey, network: 'ropsten', appId }) // We instenciate the shipl sdk with the privateKey and the choosen network
  try {
    const { deviceKey, identity } = await shipl.login(readline.question) // We verify the key with the shipl login method, it's going to ask for a phone number

    console.log('This is devicekey', deviceKey)
    console.log('This is identity', identity)

    const web3 = new Web3(shipl.getWeb3Provider()) // We start the shipl sdk into the web3 library

    const targetContract = new web3.eth.Contract(targetContractArtifact.abi, targetContractAddress) // We create the contract object

    targetContract.methods.register(1).send({ from: deviceKey }) // we exectue a transaction
      .on('error', (error) => {
        console.error(error)
      })
      .on('transactionHash', async (transactionHash) => {
        console.log('This the transactionHash', transactionHash)
        const internalTxDatas = await shipl.getInternalTransactionsData(targetContractArtifact.abi, transactionHash) // We get the internal tx datas
        console.log('This is the internal transaction datas', internalTxDatas)
      })
      .on('receipt', (result) => {
        console.log('data', result)
      })
  } catch (error) {
    console.error(error)
  }
}

start()
