export const CURRENT_CALL_VERSION = 0

export type Versioned<T> = {
  __version: number
  value: T
}

export function versioned<T>(
  v: T,
  version = CURRENT_CALL_VERSION
): Versioned<T> {
  return {
    __version: version,
    value: v,
  }
}
