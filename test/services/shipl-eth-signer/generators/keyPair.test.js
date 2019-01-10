const test = require('ava')

const projectRoot = '../../../../src/'
const targetDir = 'services/shipl-eth-signer/generators/'
const KeyPair = require(projectRoot + targetDir + 'keyPair.js')
const examplePrivateKey = '5BDF462AF21DAF75F436C80ECED2E402A6EE3EBCEC06BBCB7D99CD4F873082BF'

test('fromPrivateKey()', t => {
  t.plan(4)
  const expectedResult = {
    privateKey: '0x5bdf462af21daf75f436c80eced2e402a6ee3ebcec06bbcb7d99cd4f873082bf',
    publicKey: '0xf9a8ebabf16458b04bd0c1a18b46c318bc342934b97868f3438bb25d438927fa1fa48871385cd75f95405dfbbcc1423d3ff98b411f00f46ddf97d293c69dca6a',
    address: '0x6e902c319d28c618a139f1f1dddd9452f9dbb49a'
  }
  const actualResult = KeyPair.fromPrivateKey(examplePrivateKey)
  t.is(Object.keys(actualResult).length, Object.keys(expectedResult).length)
  t.is(actualResult.privateKey, expectedResult.privateKey)
  t.is(actualResult.publicKey, expectedResult.publicKey)
  t.is(actualResult.address, expectedResult.address)
})

test('generate()', t => {
  KeyPair.generate((err, res) => {
    t.plan(5)
    t.is(err, null)
    const actualResult = res
    const expectedResult = {
      privateKey: '0x5bdf462af21daf75f436c80eced2e402a6ee3ebcec06bbcb7d99cd4f873082bf',
      publicKey: '0xf9a8ebabf16458b04bd0c1a18b46c318bc342934b97868f3438bb25d438927fa1fa48871385cd75f95405dfbbcc1423d3ff98b411f00f46ddf97d293c69dca6a',
      address: '0x6e902c319d28c618a139f1f1dddd9452f9dbb49a'
    }
    t.is(Object.keys(actualResult).length, Object.keys(expectedResult).length)
    t.is(actualResult.privateKey.length, expectedResult.privateKey.length)
    t.is(actualResult.publicKey.length, expectedResult.publicKey.length)
    t.is(actualResult.address.length, expectedResult.address.length)
  })
})
