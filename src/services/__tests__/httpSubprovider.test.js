const RpcSource = require('../httpSubprovider.js')
jest.mock('request', () => jest.fn())

const testValues = {
  authToken: 'authToken-test',
  sensuiUrl: 'sensuiUrl-test',
  rpcUrl: 'rpcUrl-test'
}

let sut

const mockXhr = require('request')

beforeEach(() => {
  sut = new RpcSource(testValues)
})

describe('RpcSource', () => {
  test('empty constructor', () => {
    expect(() => {
      sut = new RpcSource()
    }).toThrow()
  })

  test('constructor', () => {
    expect(sut.authToken).toEqual(testValues.authToken)
    expect(sut.sensuiUrl).toEqual(testValues.sensuiUrl)
    expect(sut.rpcUrl).toEqual(testValues.rpcUrl)
  })

  describe('handleRequest', () => {
    test('internalError', async (done) => {
      mockXhr.mockImplementation((options, cb) => {
        cb(true, {}, {}) // eslint-disable-line
      })
      sut.handleRequest('hello', {}, (error) => {
        expect(error.message).toBe('Internal error')
        expect(mockXhr).toBeCalledTimes(1)
        mockXhr.mockRestore()
        done()
      })
    })

    test('method not found', async (done) => {
      mockXhr.mockImplementation((options, cb) => {
        cb(null, {statusCode: 405}, {})
      })
      sut.handleRequest('hello', {}, (error) => {
        expect(error.message).toBe('Method not found')
        expect(mockXhr).toBeCalledTimes(1)
        mockXhr.mockRestore()
        done()
      })
    })

    test('Gateway timeout', async (done) => {
      mockXhr.mockImplementation((options, cb) => {
        cb(null, {statusCode: 504}, {})
      })
      sut.handleRequest('hello', {}, (error) => {
        let expectedMsg = `Gateway timeout. The request took too long to process. `
        expectedMsg += `This can happen when querying logs over too wide a block range.`
        expect(error.message).toBe(expectedMsg)
        expect(mockXhr).toBeCalledTimes(1)
        mockXhr.mockRestore()
        done()
      })
    })

    test('Other error code', async (done) => {
      mockXhr.mockImplementation((options, cb) => {
        cb(null, {statusCode: 404}, {})
      })
      sut.handleRequest('hello', {}, (error) => {
        expect(error.message).toBe('Internal error')
        expect(mockXhr).toBeCalledTimes(1)
        mockXhr.mockRestore()
        done()
      })
    })

    test('Body parse error', async (done) => {
      mockXhr.mockImplementation((options, cb) => {
        cb(null, {statusCode: 200}, {a: true})
      })
      sut.handleRequest('hello', {}, (error) => {
        expect(error.message).toContain('Unexpected token')
        expect(mockXhr).toBeCalledTimes(1)
        mockXhr.mockRestore()
        done()
      })
    })

    test('Body data error', async (done) => {
      mockXhr.mockImplementation((options, cb) => {
        cb(null, {statusCode: 200}, JSON.stringify({error: 'test-body-error'}))
      })
      sut.handleRequest('hello', {}, (error) => {
        expect(error).toEqual('test-body-error')
        expect(mockXhr).toBeCalledTimes(1)
        mockXhr.mockRestore()
        done()
      })
    })

    test('happy', async (done) => {
      mockXhr.mockImplementation((options, cb) => {
        cb(null, {statusCode: 200}, JSON.stringify({result: 'test-body-result'}))
      })
      sut.handleRequest('hello', {}, (error, msg) => {
        if (error) {
          fail(error)
        }
        expect(error).toBeNull()
        expect(msg).toEqual('test-body-result')
        expect(mockXhr).toBeCalledTimes(1)
        mockXhr.mockRestore()
        done()
      })
    })
  })
})
