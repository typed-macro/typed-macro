export type State = {
  /**
   * Get the state shared during traversal.
   */
  get<T, K>(key: K): T

  /**
   * Set the state shared during traversal.
   */
  set<T, K>(key: K, value: T): T

  /**
   * Clear the state shared during traversal.
   */
  clear(): boolean

  /**
   * Delete the state shared during traversal.
   */
  delete<K>(key: K): void
}

export function createState(): State {
  const state = new Map<any, any>()
  return {
    get(key) {
      return state.get(key)
    },
    set(key, value) {
      state.set(key, value)
      return value
    },
    clear() {
      state.clear()
      return true
    },
    delete<K>(key: K) {
      state.delete(key)
    },
  }
}
