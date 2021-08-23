import { findInSet, findProgramPath, validateFnName } from '../src/common'
import { parse } from '@babel/parser'
import template from '@babel/template'

describe('common#findInSet', () => {
  it('should work', () => {
    const set = new Set([1, 2, 3, 4])
    expect(findInSet(set, (n) => n === 3)).toBe(3)
    expect(findInSet(set, (n) => n === 4)).toBe(4)
    expect(findInSet(set, (n) => n === 5)).toBeUndefined()
  })
})

describe('common#validateFnName', () => {
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

describe('common#findProgramPath', () => {
  it('should work', () => {
    const ast = parse(`const a = 1`)
    const program = findProgramPath(ast)
    expect(program).not.toBeNull()
    expect(program).not.toBeUndefined()
  })

  it('should be synchronized when changed', () => {
    const ast = parse(`const a = 1`)
    const programA = findProgramPath(ast)
    const programB = findProgramPath(ast)
    programA.unshiftContainer('body', template.statement.ast('const b = 2'))
    expect(programA.get('body').length).toBe(2)
    expect(programB.get('body').length).toBe(2)
  })
})
