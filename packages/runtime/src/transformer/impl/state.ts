import { State } from '@typed-macro/core'

export function createState(): State {
  const state = new Map<any, any>()
  return {
    has(key) {
      return state.has(key)
    },
    get(key) {
      return state.get(key)
    },
    getOrSet(key, or) {
      const v = state.get(key)
      if (v !== undefined) return v
      state.set(key, or)
      return or
    },
    set(key, value) {
      state.set(key, value)
      return value
    },
    delete(key) {
      state.delete(key)
    },
  }
}
