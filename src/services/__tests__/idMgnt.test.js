const IdMgnt = require('../idMgnt.js')

const nisabaUrl = 'http://nisaba-url'
const unnuUrl = 'http://unnu-url'

const phoneNumber = '1234'
const deviceKey = '789'
const nisabaCode = 'abc'
const testMessage = 'testMessage'
const testSig = '0x1223423'
const testPubKey = '0x1212'
const testPrivKey = '0x232323'

const senderKeyPair = {
  address: testPubKey,
  privateKey: testPrivKey
}
const testBlockchain = 'test-blockchain'

describe('idMgnt', () => {
  let sut

  beforeEach(() => {
    sut = new IdMgnt({nisabaUrl, unnuUrl, testBlockchain, senderKeyPair})
  })

  test('empty constructor', () => {
    expect(() => {
      sut = new IdMgnt()
    }).toThrow()
  })

  test('Good constructor', () => {
    expect(sut).not.toBeUndefined()
  })

  test('renewToken', async (done) => {
    const ethSigUtil = require('eth-sig-util')

    ethSigUtil.personalSign = jest.fn(() => (testSig))
    sut.nisaba.post = jest.fn(() => ({
      data: {data: testMessage}
    }))
    sut.senderKeyPair.privateKey = testPrivKey
    const res = await sut.renewToken(deviceKey)
    expect(res).toBe(testMessage)
    expect(sut.nisaba.post).toBeCalled()
    expect(sut.nisaba.post).toBeCalledWith('/renewtoken',
      {'deviceKey': deviceKey, 'sig': testSig})
    expect(ethSigUtil.personalSign).toBeCalled()
    sut.nisaba.post.mockRestore()
    ethSigUtil.personalSign.mockRestore()
    done()
  })

  test('startUserVerification', async (done) => {
    sut.nisaba.post = jest.fn(() => (testMessage))

    const res = await sut.startUserVerification(phoneNumber, deviceKey)
    expect(res).toBe(testMessage)
    expect(sut.nisaba.post).toBeCalled()
    expect(sut.nisaba.post).toBeCalledWith('/verify', {'deviceKey': deviceKey, 'phoneNumber': phoneNumber})
    await sut.nisaba.post.mockRestore()
    done()
  })

  test('continueUserVerification', async (done) => {
    sut.nisaba.post = jest.fn(() => ({
      data: {data: testMessage}
    }))

    const res = await sut.continueUserVerification(deviceKey, nisabaCode)
    expect(res).toBe(testMessage)
    expect(sut.nisaba.post).toBeCalled()
    expect(sut.nisaba.post).toBeCalledWith('/check', {'deviceKey': deviceKey, 'code': nisabaCode})
    await sut.nisaba.post.mockRestore()
    done()
  })

  test('createAccount', async (done) => {
    sut.unnu.post = jest.fn(() => (testMessage))

    const res = await sut.createAccount(deviceKey)
    expect(res).toBe(testMessage)
    expect(sut.unnu.post).toBeCalled()
    expect(sut.unnu.post).toBeCalledWith('/createidentity',
      {
        deviceKey,
        recoveryKey: sut.recoveryKey,
        blockchain: sut.blockchain,
        managerType: sut.managerType
      },
      { headers: { 'Authorization': 'Bearer ' + sut.authToken } })

    await sut.unnu.post.mockRestore()
    done()
  })

  describe('lookupIdCreation', async () => {
    test('happy', async (done) => {
      sut.unnu.post = jest.fn(() => ({
        data: {data: testMessage}
      }))

      const res = await sut.lookupIdCreation(deviceKey)
      expect(res).toBe(testMessage)
      expect(sut.unnu.post).toBeCalled()
      expect(sut.unnu.post).toBeCalledWith('/lookup', {deviceKey})
      await sut.unnu.post.mockRestore()
      done()
    })

    test('no record found', async (done) => {
      /* eslint-disable */
      sut.unnu.post = jest.fn(() => {
        return Promise.reject({
          response: {
            data: {
              message: 'no record found'
            }
          }})
      })
      /* eslint-enable */

      const res = await sut.lookupIdCreation(deviceKey)
      expect(res).toBe('no record found')
      expect(sut.unnu.post).toBeCalled()
      expect(sut.unnu.post).toBeCalledWith('/lookup', {deviceKey})
      await sut.unnu.post.mockRestore()
      done()
    })

    test('no txHash', async (done) => {
      /* eslint-disable */
      sut.unnu.post = jest.fn(() => {
        return Promise.reject({
          response: {
            data: {
              message: 'no txHash'
            }
          }})
      })
      /* eslint-enable */
      const res = await sut.lookupIdCreation(deviceKey)
      expect(res).toBe('no record found')
      expect(sut.unnu.post).toBeCalled()
      expect(sut.unnu.post).toBeCalledWith('/lookup', {deviceKey})
      await sut.unnu.post.mockRestore()
      done()
    })

    test('unexpected message', async (done) => {
      /* eslint-disable */
      sut.unnu.post = jest.fn(() => {
        return Promise.reject({
          response: {
            data: {
              message: 'unexpected message'
            }
          }})
      })
      /* eslint-enable */
      let err = null
      try {
        await sut.lookupIdCreation(deviceKey)
      } catch (e) {
        err = e
      }

      expect(err).not.toBeNull()
      expect(err.response.data.message).toEqual('unexpected message')
      expect(sut.unnu.post).toBeCalled()
      expect(sut.unnu.post).toBeCalledWith('/lookup', {deviceKey})
      await sut.unnu.post.mockRestore()
      done()
    })
  })

  describe('getUserOrCreate', () => {
    test('no record found', async (done) => {
      sut.lookupIdCreation = jest.fn(() => { return 'no record found' })

      const callbackTestCode = '123'
      const spyCallback = jest.fn(() => { return callbackTestCode })

      sut.startUserVerification = jest.fn(() => { Promise.resolve() })
      sut.continueUserVerification = jest.fn(() => {
        Promise.resolve('test-verification')
      })
      sut.createAccount = jest.fn(() => { Promise.resolve() })
      // sut.lookupIdCreation = jest.fn(() => ({
      //   authToken: null
      // }))
      let err = null
      /*
        sut.getUserOrCreate is expected to throw because we can not
        mock the sut.lookupIdCreation function twice. In getUserOrCreate this function
        is called twice, and needs to return different values in each case.
      */
      try {
        await sut.getUserOrCreate(testPubKey, spyCallback)
      } catch (e) {
        err = e
      }

      expect(err).not.toBeNull()
      expect(spyCallback).toBeCalled()

      expect(sut.startUserVerification).toBeCalled()
      expect(sut.startUserVerification).toBeCalledWith(callbackTestCode, testPubKey)

      expect(sut.continueUserVerification).toBeCalled()
      expect(sut.continueUserVerification).toBeCalledWith(testPubKey, callbackTestCode)

      expect(sut.createAccount).toBeCalled()
      expect(sut.createAccount).toBeCalledWith(testPubKey)

      expect(sut.lookupIdCreation).toBeCalledTimes(2)
      expect(sut.lookupIdCreation).toBeCalledWith(testPubKey)

      spyCallback.mockRestore()
      sut.lookupIdCreation.mockRestore()
      sut.createAccount.mockRestore()
      sut.continueUserVerification.mockRestore()
      sut.startUserVerification.mockRestore()

      done()
    })

    test('record exists', async (done) => {
      const spyCallback = jest.fn(() => {})
      sut.lookupIdCreation = jest.fn(() => ({
        authToken: null
      }))
      sut.renewToken = jest.fn(() => ({
        testProperty: true
      }))
      const res = await sut.getUserOrCreate(testPubKey, spyCallback)
      expect(res).toEqual({authToken: {testProperty: true}})
      expect(spyCallback).not.toBeCalled()
      expect(sut.renewToken).toBeCalledWith(testPubKey)
      done()
    })
  })
})
