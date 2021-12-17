export type State = {
  /**
   * Check whether value exists by key.
   */
  has<K>(key: K): boolean

  /**
   * Get value by key.
   */
  get<T, K>(key: K): T

  /**
   * Get value by key, or set value if not exists.
   */
  getOrSet<T, K>(key: K, or: T): T

  /**
   * Set value by key.
   */
  set<T, K>(key: K, value: T): T

  /**
   * Delete value by key.
   */
  delete<K>(key: K): void
}
