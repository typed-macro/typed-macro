import { createLoader } from '../src'

describe('Loader', () => {
  test('should work', () => {
    const loader = createLoader()
    expect(loader.load('some')).toBeUndefined()

    // keep empty code
    loader.append('some', '')
    expect(loader.load('some')).toBe('')

    // but use empty module for undefined code
    loader.append('other')
    expect(loader.load('other')).toBe('export {}')

    // throw error when moduleName duplicated
    expect(() => loader.append('other')).toThrowError()
  })
})
