// Copy from https://github.com/vitejs/vite/blob/1c1f82f93/packages/vite/types/anymatch.d.ts

export type AnymatchFn = (testString: string) => boolean
export type AnymatchPattern = string | RegExp | AnymatchFn
type AnymatchMatcher = AnymatchPattern | AnymatchPattern[]

export { AnymatchMatcher as Matcher }
