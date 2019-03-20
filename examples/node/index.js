const Shipl = require('Shipl')
const Web3 = require('web3')
const readline = require('readline-sync')
const { Wallet } = require('ethers')
const targetContractArtifact = require('../shared/targetContract.json')

const privateKey = new Wallet.createRandom().privateKey.slice(2) /* We generate a random ethereum private key */

const targetContractAddress = '0xabc59d9a5163d5ab600cccd9108bf532d8d9d7a5' // testnet
// const targetContractAddress = '0xd35D57Fb2ED34a52F0697D37fb6bC0f182de7475' // mainnet
const appId = 'YOUR_SHIPL_APP_ID' // testnet

async function start () {
  const shipl = new Shipl({ privateKey, network: 'rinkeby', appId }) // We instenciate the shipl sdk with the privateKey and the choosen network
  try {
    const { deviceKey, identity } = await shipl.login(readline.question) // We verify the key with the shipl login method, it's going to ask for a phone number

    console.log('This is devicekey', deviceKey)
    console.log('This is identity', identity)

    const web3 = new Web3(shipl.getWeb3Provider()) // We start the shipl sdk into the web3 library

    const targetContract = new web3.eth.Contract(targetContractArtifact.abi, targetContractAddress) // We create the contract object

    targetContract.methods.register(10).send({ from: deviceKey }) // we exectue a transaction
      .on('error', (error) => {
        console.error(error)
      })
      .on('transactionHash', async (transactionHash) => {
        console.log('This the transactionHash', transactionHash)
        const internalTxDatas = await shipl.getInternalTransactionsData(targetContractArtifact.abi, transactionHash) // We get the internal tx datas
        console.log('This is the internal transaction datas', internalTxDatas)
      })
  } catch (error) {
    console.error(error)
  }
}

start()
