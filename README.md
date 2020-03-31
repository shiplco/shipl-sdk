# Shipl JS SDK

Browser and NodeJS web3 provider for the Shipl API

## Integrate Shipl in your Dapp

The Shipl SDK provides convenient access to the Shipl API into your javascript dApp.
Shipl enable developers to create ethereum dApp without the usual UX complexity by abstracting the gas and making feesless transactions for the end user.

## Documentation
See the [API documentation]('https://docs.shipl.co')

## Installation

You can install the library via `npm`:

```shell
npm i shipl
```

## Usage

The package need to be configured with an ethereum private key or a web3 wallet instance (eg. Metamask)

```javascript
import Shipl from 'shipl';

const shipl = new Shipl({
    appId: 'YOUR_SHIPL_APP_ID', // This is the appID created in your Shipl Account at console.shipl.co
    provider: 'shiplwallet'
})
```

Then login into shipl. You have to pass an input callback to make the shipl SDK capable to ask for the phone number and then for the code verifcation send by SMS. For example on node you can use readline-sync. 

```javascript
const { identity, deviceKey } = await shipl.login(readline.question)
```

Then pass you can pass the shipl sdk into any web3 compatible library. Don't forget to execute the start function to launch the web3 provider.

```javascript
const web3 = new Web3(shipl.getWeb3Provider());
```
Then you can call a contract in the regular web3 way

```javascript
const targetContract = new web3.eth.Contract(abi, contractAddress);

targetContract.methods
  .register('0x' + config.address, 1)
  .send({ from: '0x' + config.address })
  .on('transactionHash', transactionHash => {
    console.log('This the transactionHash', transactionHash);
  });
```

### Browser Window Quick Start

For use directly in the browser you can reference the shipl distribution files from a number of places. They can be found in our npm package in the 'dist' folder or you can build them locally from this repo.

For a quick setup you may also request a remote copy from unpkg CDN as follows:

```html
<!-- The most recent minified version  -->
<script src="https://unpkg.com/shipl/dist/shipl.js"></script>
<!-- You can also fetch specific versions by specifying the version, files names may differ for past versions -->
<script src="https://unpkg.com/shipl@<version>/dist/shipl.js"></script>
```

To see all available dist files on unpkg, vist [unpkg.com/shipl/dist](https://unpkg.com/shipl/dist)

Then to instantiate the shipl object from the browser window object:

```javascript
const Shipl = window.shipl
const shipl = new Shipl({ appId: 'YOUR_SHIPL_APP_ID', provider: 'shiplwallet' })
```

## Examples

For a more in depth guide, check out our documentation site or clone this [`poke shipl`](https://github.com/shiplco/poke-shipl) repository.