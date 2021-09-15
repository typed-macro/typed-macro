import {
  findDuplicatedItem,
  isAsyncFunction,
  isError,
  isFunction,
  isGeneratorFunction,
  isPromise,
  nodeLoc,
  validateFnName,
} from '@/common'
import {
  ASYNC_NO_OP,
  GENERATOR_NO_OP,
  getAST,
  getExpression,
  NO_OP,
} from './testutils'

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

describe('isPromise()', () => {
  it('should work', () => {
    ;[
      undefined,
      null,
      1,
      '',
      true,
      {},
      [],
      new Map(),
      new Error(),
      Symbol(),
    ].forEach((v) => {
      expect(isPromise(v)).toBe(false)
    })
    ;[
      Promise.resolve(),
      (async () => {
        NO_OP()
      })(),
    ].forEach((v) => {
      expect(isPromise(v)).toBe(true)
    })
  })
})

describe('isError()', () => {
  it('should work', () => {
    ;[
      undefined,
      null,
      1,
      '',
      true,
      {},
      [],
      new Map(),
      Symbol(),
      Promise.resolve(),
    ].forEach((v) => {
      expect(isError(v)).toBe(false)
    })
    ;[new Error(), new SyntaxError(), new TypeError()].forEach((v) => {
      expect(isError(v)).toBe(true)
    })
  })
})

describe('isFunction()', () => {
  it('should work', () => {
    ;[
      undefined,
      null,
      1,
      '',
      true,
      {},
      [],
      new Map(),
      Symbol(),
      Promise.resolve(),
    ].forEach((v) => {
      expect(isFunction(v)).toBe(false)
    })
    ;[NO_OP, ASYNC_NO_OP, GENERATOR_NO_OP].forEach((v) => {
      expect(isFunction(v)).toBe(true)
    })
  })
})

describe('isAsyncFunction()', () => {
  it('should work', () => {
    ;[NO_OP, GENERATOR_NO_OP].forEach((v) => {
      expect(isAsyncFunction(v)).toBe(false)
    })
    ;[ASYNC_NO_OP].forEach((v) => {
      expect(isAsyncFunction(v)).toBe(true)
    })
  })
})

describe('isGeneratorFunction()', () => {
  it('should work', () => {
    ;[NO_OP, ASYNC_NO_OP].forEach((v) => {
      expect(isGeneratorFunction(v)).toBe(false)
    })
    ;[GENERATOR_NO_OP].forEach((v) => {
      expect(isGeneratorFunction(v)).toBe(true)
    })
  })
})
