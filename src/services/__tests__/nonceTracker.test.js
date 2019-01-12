const NonceTrackerSubprovider = require('../nonceTracker.js')
let nonceTrackerSubprovider

const testRawTx = '0x121212'

jest.mock('ethereumjs-tx', () => {
  return jest.fn().mockImplementation(() => {
    return {to: {
      toString: jest.fn(() => { '121212' })
    }}
  })
})

jest.mock('web3-provider-engine/util/rpc-cache-utils', () => ({
  blockTagForPayload: () => { return 'pending' }
}))

beforeEach(() => {
  nonceTrackerSubprovider = new NonceTrackerSubprovider()
})

afterAll(() => {
  jest.restoreAllMocks()
  jest.resetModules()
})

describe('NonceTrackerSubprovider', () => {
  test('Constructor', () => {
    expect(nonceTrackerSubprovider).not.toBeUndefined()
    expect(nonceTrackerSubprovider.handleRequest).not.toBeUndefined()
  })

  describe('handleRequest', () => {
    test('eth_getTransactionCount, cached result', async (done) => {
      nonceTrackerSubprovider.nonceCache['0x123'] = 'abs'
      nonceTrackerSubprovider.handleRequest(
        {method: 'eth_getTransactionCount',
          params: ['0x123']
        },
        jest.fn(),
        (error, data) => {
          expect(error).toBeNull()
          expect(data).toBe('abs')
          done()
        }
      )
    })

    test('eth_getTransactionCount, not cached result', async (done) => {
      const nextCbMock = jest.fn(() => {
        expect(nextMock).toBeCalledTimes(1)
        expect(nonceTrackerSubprovider.nonceCache['0x123']).toBe('testResult')
        done()
      })

      const nextMock = jest.fn((cb) => {
        cb(null, 'testResult', nextCbMock)
      })
      nonceTrackerSubprovider.nonceCache['0x123'] = undefined

      nonceTrackerSubprovider.handleRequest(
        {method: 'eth_getTransactionCount',
          params: ['0x123']
        },
        nextMock,
        jest.fn(() => {})
      )
    })
  })

  describe('eth_sendRawTransaction', () => {
    test('error in next()', async (done) => {
      const nextCbMock = jest.fn(() => {
        expect(nextMock).toBeCalledTimes(1)
        done()
      })
      const nextMock = jest.fn((cb) => {
        let e = new Error()
        cb(e, null, nextCbMock)
      })
      nonceTrackerSubprovider.handleRequest(
        {method: 'eth_sendRawTransaction',
          params: ['0x123']
        },
        nextMock,
        jest.fn(() => {})
      )
    })

    test('error in next()', async (done) => {
      const nextCbMock = jest.fn(() => {
        expect(nextMock).toBeCalledTimes(1)
        done()
      })

      const nextMock = jest.fn((cb) => {
        cb(null, null, nextCbMock)
      })

      nonceTrackerSubprovider.handleRequest(
        {method: 'eth_sendRawTransaction',
          params: [{metaSignedTx: testRawTx}]
        },
        nextMock,
        jest.fn(() => {})
      )
    })
  })

  describe('default case', () => {
    test('call next()', async (done) => {
      const nextMock = jest.fn(() => {
        expect(nonceTrackerSubprovider.nonceCache).toEqual({})
        done()
      })
      nonceTrackerSubprovider.handleRequest(
        {method: 'nonExistingCase',
          params: ['0x123']
        },
        nextMock,
        jest.fn(() => {})
      )
    })
  })
})
