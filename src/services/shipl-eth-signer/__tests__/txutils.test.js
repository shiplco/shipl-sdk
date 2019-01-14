const sut = require('../txutils.js')
const testTxObject = {'gasPrice': {'type': 'Buffer', 'data': [59, 154, 202, 0]}, 'gasLimit': {'type': 'Buffer', 'data': [163, 71]}, 'value': 0, 'to': '0xda8c6dce9e9a85e6f9df7b09b2354da44cb48331', 'from': '0x97b31FE4fF3e7c2e58F8a98CF13Cb0925459D81c'}
const testArgs = [28, '0x4cc8bcc114526649ad4f92605e13671dfdbe531f3edee7e00f4376e566fac9c7', '0x56677a904feba7838ea8c95313cf5f563986870ecfaa9eaa78a364deaad7b9f1', '0x87ea811785c4bd30fc104c2543cf8ed90f7eeec7', '0x701b88260000000000000000000000006e902c319d28c618a139f1f1dddd9452f9dbb49a0000000000000000000000009e0272e98a3586ccac04daf806c7ee79303db3ea000000000000000000000000abc59d9a5163d5ab600cccd9108bf532d8d9d7a5000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000024f207564e000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000']
const testFunctionName = 'relayMetaTx'
const testABI = [{'constant': true, 'inputs': [{'name': 'add', 'type': 'address'}], 'name': 'getNonce', 'outputs': [{'name': '', 'type': 'uint256'}], 'payable': false, 'type': 'function', 'signature': '0x2d0335ab'}, {'constant': false, 'inputs': [{'name': 'sendersToUpdate', 'type': 'address[]'}], 'name': 'removeFromWhitelist', 'outputs': [], 'payable': false, 'type': 'function', 'signature': '0x548db174'}, {'constant': false, 'inputs': [{'name': 'sendersToUpdate', 'type': 'address[]'}], 'name': 'addToWhitelist', 'outputs': [], 'payable': false, 'type': 'function', 'signature': '0x7f649783'}, {'constant': true, 'inputs': [{'name': '', 'type': 'address'}, {'name': '', 'type': 'address'}], 'name': 'whitelist', 'outputs': [{'name': '', 'type': 'bool'}], 'payable': false, 'type': 'function', 'signature': '0xb092145e'}, {'constant': false, 'inputs': [{'name': 'sigV', 'type': 'uint8'}, {'name': 'sigR', 'type': 'bytes32'}, {'name': 'sigS', 'type': 'bytes32'}, {'name': 'destination', 'type': 'address'}, {'name': 'data', 'type': 'bytes'}, {'name': 'listOwner', 'type': 'address'}], 'name': 'relayMetaTx', 'outputs': [], 'payable': false, 'type': 'function', 'signature': '0xc3f44c0a'}, {'constant': true, 'inputs': [{'name': 'b', 'type': 'bytes'}], 'name': 'getAddress', 'outputs': [{'name': 'a', 'type': 'address'}], 'payable': false, 'type': 'function', 'signature': '0xc47cf5de'}]

jest.mock('ethereumjs-tx', (txObjectCopy) => {
  return jest.fn((txObjectCopy) => {
    return {serialize: jest.fn((serialize) => {
      return txObjectCopy
    })}
  })
})
const Transaction = require('ethereumjs-tx')

const testFrom = '0x97b31FE4fF3e7c2e58F8a98CF13Cb0925459D81c'
const testNonce = '1'

const expectedTxObjRes = {
  to: sut.add0x(testTxObject.to),
  gasPrice: sut.add0x(testTxObject.gasPrice),
  gasLimit: sut.add0x(testTxObject.gasLimit),
  nonce: sut.add0x(testTxObject.nonce),
  data: sut.add0x(sut._encodeFunctionTxData(testFunctionName, sut._getTypesFromAbi(testABI, testFunctionName), testArgs)),
  value: sut.add0x(testTxObject.value)
}

afterAll(() => {
  jest.resetAllMocks()
})

describe('TxUtils', () => {
  test('add0x', () => {
    const testInput1 = 123
    const testInput2 = '123'
    const testInput3 = '0x1'

    expect(sut.add0x(testInput1)).toBe(testInput1)
    expect(sut.add0x(testInput2)).toBe('0x' + testInput2)
    expect(sut.add0x(testInput3)).toBe(testInput3)
  })

  test('functionTx', () => {
    const res = sut.functionTx(testABI, testFunctionName, testArgs, testTxObject)
    expect(res).not.toBeUndefined()

    expect(Transaction).toHaveBeenCalledWith(expectedTxObjRes)
  })

  test('createdContractAddress', () => {
    const res = sut.createdContractAddress(testFrom, testNonce)
    expect(res).not.toBeUndefined()
    expect(res.length).toBe(40)
  })

  test('createContractTx', () => {
    const res = sut.createContractTx(testFrom, testTxObject)
    const expectedContractAddr = 'e01c10fd900939d1eab56ee373ea5e2bd4e2cfb3'
    expect(res).not.toBeUndefined()
    expect(res.addr).toBe(expectedContractAddr)
    expect(Transaction).toHaveBeenCalledWith(expectedTxObjRes)
  })

  test('valueTx', () => {
    const res = sut.valueTx(testTxObject)
    expect(res).not.toBeUndefined()
    expect(Transaction).toHaveBeenCalledWith(expectedTxObjRes)
  })
})
