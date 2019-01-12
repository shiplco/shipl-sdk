const Subprovider = require('../subprovider.js')

let testEngine = {
  on: jest.fn(() => {}),
  sendAsync: jest.fn(() => {})
}

let subprovider
beforeEach(() => {
  subprovider = new Subprovider()
  subprovider.currentBlock = 0
})
describe('Subprovider', () => {
  test('setEngine', () => {
    subprovider.setEngine(testEngine)
    expect(subprovider.engine).toBe(testEngine)
  })

  test('handleRequest', () => {
    expect(subprovider.handleRequest).toThrowError()
  })

  test('emitPayload', () => {
    subprovider.setEngine(testEngine)
    subprovider.emitPayload(null, null)
    expect(testEngine.sendAsync).toBeCalledTimes(1)
  })
})
