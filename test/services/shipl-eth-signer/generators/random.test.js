const test = require('ava')

const projectRoot = '../../../../src/'
const targetDir = 'services/shipl-eth-signer/generators/'
const Random = require(projectRoot + targetDir + 'random.js')

test('Set provider', t => {
  const expectedProvider = Buffer.from('test')
  Random.setProvider(expectedProvider)
  const actualProvider = Random.randomBytes
  t.is(actualProvider, expectedProvider)
})
