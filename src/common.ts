export const findInSet = <T>(_set: Set<T>, predicate: (o: T) => boolean) => {
  for (const e of _set) {
    if (predicate(e)) return e
  }
  return undefined
}

export const validateFnName = (name: string) =>
  /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/.test(name)
