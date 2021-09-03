export const CURRENT_MACRO_CALL_VERSION = 0

export type Versioned<T> = {
  __version: number
  value: T
}

export function versioned<T>(v: T, version: number): Versioned<T> {
  return {
    __version: version,
    value: v,
  }
}
