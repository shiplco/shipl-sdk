const Shipl = require('shipl')
const Web3 = require('web3')
const readline = require('readline-sync')
const { Wallet } = require('ethers')
const targetContractArtifact = require('./targetContract.json')

const privateKey = new Wallet.createRandom().privateKey // We generate a random ethereum private key

async function start () {
  const shipl = new Shipl({ privateKey, network: 'rinkeby' }) // We instenciate the shipl sdk with the privateKey and the choosen network
  const { identity } = await shipl.login(readline.question) // We verify the key with the shipl login method, it's going to ask for a phone number

  const web3 = new Web3(shipl.start()) // We start the shipl sdk into the web3 library
  const targetContract = new web3.eth.Contract(targetContractArtifact.abi, '0xabc59d9a5163d5ab600cccd9108bf532d8d9d7a5') // We create the contract object
  targetContract.methods.register(Math.floor(Math.random() * 10)).send({ from: identity }) // we exectue a transaction
    .on('error', (error) => {
      console.log(error)
    })
    .on('transactionHash', async (transactionHash) => {
      console.log('This the transactionHash', transactionHash)
      const internalTxDatas = await shipl.getInternalTransactionsData(targetContractArtifact.abi, transactionHash) // We get the internal tx datas
      console.log('This is the internal transaction datas', internalTxDatas)
    })
}

start()
