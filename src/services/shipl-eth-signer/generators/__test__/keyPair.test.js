const KeyPair = require('../keyPair.js')
const examplePrivateKey = '5BDF462AF21DAF75F436C80ECED2E402A6EE3EBCEC06BBCB7D99CD4F873082BF'

describe('keyPair', () => {
  test('fromPrivateKey()', () => {
    const expectedResult = {
      privateKey: '0x5bdf462af21daf75f436c80eced2e402a6ee3ebcec06bbcb7d99cd4f873082bf',
      publicKey: '0xf9a8ebabf16458b04bd0c1a18b46c318bc342934b97868f3438bb25d438927fa1fa48871385cd75f95405dfbbcc1423d3ff98b411f00f46ddf97d293c69dca6a',
      address: '0x6e902c319d28c618a139f1f1dddd9452f9dbb49a'
    }
    const actualResult = KeyPair.fromPrivateKey(examplePrivateKey)
    expect(Object.keys(actualResult).length).toBe(Object.keys(expectedResult).length)
    expect(actualResult.privateKey).toBe(expectedResult.privateKey)
    expect(actualResult.publicKey).toBe(expectedResult.publicKey)
    expect(actualResult.address).toBe(expectedResult.address)
  })

  test('generate()', () => {
    KeyPair.generate((err, res) => {
      expect(err).toBe(null)
      const actualResult = res
      const expectedResult = {
        privateKey: '0x5bdf462af21daf75f436c80eced2e402a6ee3ebcec06bbcb7d99cd4f873082bf',
        publicKey: '0xf9a8ebabf16458b04bd0c1a18b46c318bc342934b97868f3438bb25d438927fa1fa48871385cd75f95405dfbbcc1423d3ff98b411f00f46ddf97d293c69dca6a',
        address: '0x6e902c319d28c618a139f1f1dddd9452f9dbb49a'
      }
      expect(Object.keys(actualResult).length).toBe(Object.keys(expectedResult).length)
      expect(actualResult.privateKey.length).toBe(expectedResult.privateKey.length)
      expect(actualResult.publicKey.length).toBe(expectedResult.publicKey.length)
      expect(actualResult.address.length).toBe(expectedResult.address.length)
    })
  })
})
