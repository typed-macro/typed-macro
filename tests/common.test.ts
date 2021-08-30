import { findDuplicatedItem, nodeLoc, validateFnName } from '@/common'
import { getAST, getExpression } from './testutils'

describe('nodeLoc()', () => {
  it('should work', () => {
    const ast = getAST(`const a = 1`)
    expect(nodeLoc(ast.program.body[0])).toMatchSnapshot()
  })

  it('should have fallback text', () => {
    expect(nodeLoc(getExpression(`1 + 1`))).toMatchSnapshot()
  })
})

describe('validateFnName()', () => {
  it('should work', () => {
    const fnNames = [
      { name: '', ok: false },
      { name: '1a', ok: false },
      { name: 'a1', ok: true },
      { name: '你好世界', ok: true },
      { name: 'hello$world', ok: true },
      { name: '$yo', ok: true },
      { name: '_', ok: true },
    ]

    fnNames.forEach((item) => {
      expect(validateFnName(item.name)).toBe(item.ok)
    })
  })
})

describe('findDuplicatedItem()', () => {
  it('should work', () => {
    expect(findDuplicatedItem([1, 2, 3], [4, 5, 1])).toBe(1)
    expect(findDuplicatedItem([1, 2, 3], [4, 5, 6])).toBeUndefined()
  })
})
