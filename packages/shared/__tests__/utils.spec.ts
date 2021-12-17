import {
  isArray,
  isAsyncFunction,
  isError,
  isFunction,
  isGeneratorFunction,
  isPromise,
  isString,
  normalizePath,
  validateFnName,
  getProjectPath,
  NO_OP,
  getPackageManager,
} from '../src'

describe('function normalizePath()', () => {
  it('should work', () => {
    expect(normalizePath('some\\windows\\path')).toBe('some/windows/path')
  })
})

describe('function validateFnName()', () => {
  it('should work', () => {
    ;[
      { name: 'a a', result: false },
      { name: 'a-a', result: false },
      { name: 'a^a', result: false },
      { name: '1a', result: false },
      { name: 'aa', result: true },
      { name: '$a', result: true },
      { name: 'a_a', result: true },
    ].forEach(({ name, result }) => {
      expect(validateFnName(name)).toBe(result)
    })
  })
})

describe('type checker', () => {
  it('should work', () => {
    expect(isString('')).toBe(true)
    expect(isString(1)).toBe(false)

    expect(isPromise('')).toBe(false)
    expect(isPromise(Promise.resolve(1))).toBe(true)

    expect(isError('')).toBe(false)
    expect(isError(undefined)).toBe(false)
    expect(isError(new Error())).toBe(true)

    expect(isArray('')).toBe(false)
    expect(isArray({ length: 0 })).toBe(false)
    expect(isArray([])).toBe(true)

    /* eslint-disable @typescript-eslint/no-empty-function */
    const ASYNC_NO_OP = async () => {}
    const GENERATOR_NO_OP = function* () {}
    const ASYNC_GENERATOR_NO_OP = async function* () {}
    /* eslint-enable @typescript-eslint/no-empty-function */

    expect(isFunction('')).toBe(false)
    expect(isFunction(NO_OP)).toBe(true)
    expect(isFunction(ASYNC_NO_OP)).toBe(true)
    expect(isFunction(GENERATOR_NO_OP)).toBe(true)
    expect(isFunction(ASYNC_GENERATOR_NO_OP)).toBe(true)

    expect(isGeneratorFunction(NO_OP)).toBe(false)
    expect(isGeneratorFunction(ASYNC_NO_OP)).toBe(false)
    expect(isGeneratorFunction(GENERATOR_NO_OP)).toBe(true)
    expect(isGeneratorFunction(ASYNC_GENERATOR_NO_OP)).toBe(true)

    expect(isAsyncFunction(NO_OP)).toBe(false)
    expect(isAsyncFunction(GENERATOR_NO_OP)).toBe(false)
    expect(isAsyncFunction(ASYNC_NO_OP)).toBe(true)
    expect(isAsyncFunction(ASYNC_GENERATOR_NO_OP)).toBe(true)
  })
})

describe('function getProjectPath()', () => {
  it('should work', () => {
    expect(getProjectPath().length > 0).toBe(true)
  })
})

describe('function getPackageManager()', () => {
  it('should work', () => {
    const paths = getProjectPath()
    // yarn is the package manager of this project.
    expect(getPackageManager(paths[0])).toBe('yarn')
  })
})
