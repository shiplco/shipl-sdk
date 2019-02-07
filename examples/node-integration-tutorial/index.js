// const Shipl = require('shipl')
const Shipl = require('../../src/index')
const Web3 = require('web3')
const readline = require('readline-sync')
// const { Wallet } = require('ethers')
const targetContractArtifact = require('./exampleContract.json')
const jwtDecode = require('jwt-decode')

// const privateKey = new Wallet.createRandom().privateKey.slice(2) // We generate a random ethereum private key
// console.log(privateKey)

// const privateKey = 'c368c63b42221cc512162448c8e9d51dadc2ae54c9296b860a69af9eda2099ed'
const privateKey = '5BDF462AF21DAF75F436C80ECED2E402A6EE3EBCEC06BBCB7D99CD4F873082BF'

const appId = 'f40a24f0-5abf-4a9e-81dc-3c7b0b92dd7f'

async function start () {
  const shipl = new Shipl({ privateKey, network: 'rinkeby', appId }) // We instenciate the shipl sdk with the privateKey and the choosen network

  try {
    const { deviceKey, identity } = await shipl.login(readline.question) // We verify the key with the shipl login method, it's going to ask for a phone number

    //    let { identity, deviceKey } = {identity: null, deviceKey: null}

    // const ret = await shipl.login('readline-sync')

    // deviceKey = jwtDecode(ret.authToken.IdToken)['custom:deviceKey']

    // console.log('------< ' + ret.authToken.IdToken)

    console.log('this is devicekey', deviceKey)
    console.log('this is identity', identity)

    const web3 = new Web3(shipl.start()) // We start the shipl sdk into the web3 library
    const targetContract = new web3.eth.Contract(targetContractArtifact.abi, '0xabc59d9a5163d5ab600cccd9108bf532d8d9d7a5') // We create the contract object
    targetContract.methods.register(Math.floor(Math.random() * 10)).send({ from: deviceKey }) // we exectue a transaction
      .on('error', (error) => {
        console.log(error)
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
