import { findProgramPath, nodeLoc, validateFnName } from '@/common/fn'
import { parse } from '@babel/parser'
import template from '@babel/template'
import { getAST } from '../testutils'

describe('common#nodeLoc', () => {
  it('should work', () => {
    const ast = getAST(`const a = 1`)
    expect(nodeLoc(ast.program.body[0])).toMatchSnapshot()
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
