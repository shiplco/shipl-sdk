const Random = require('../random.js')

describe('random', () => {
  test('Set provider', () => {
    const expectedProvider = Buffer.from('test')
    Random.setProvider(expectedProvider)
    const actualProvider = Random.randomBytes

    expect(actualProvider).toBe(expectedProvider)
    // t.is(actualProvider, expectedProvider)
  })
})
