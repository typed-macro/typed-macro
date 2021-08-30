import { createState, State } from '@/core/helper/state'

describe('State', () => {
  let state: State

  const reset = () => {
    state = createState()
  }

  beforeEach(reset)

  const key = '_'

  it('should work with get() & set()', () => {
    expect(state.get(key)).toBeUndefined()
    state.set(key, true)
    expect(state.get(key)).toBe(true)
  })

  it('should work with delete()', () => {
    state.set(key, true)
    expect(state.get(key)).toBe(true)
    state.delete(key)
    expect(state.get(key)).toBeUndefined()
  })

  it('should work with clear()', () => {
    const keys = ['a', 'b', 'c']
    keys.forEach((k) => {
      state.set(k, true)
    })
    keys.forEach((k) => {
      expect(state.get(k)).toBe(true)
    })
    state.clear()
    keys.forEach((k) => {
      expect(state.get(k)).toBeUndefined()
    })
  })
})
