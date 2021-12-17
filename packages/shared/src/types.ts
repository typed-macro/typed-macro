export type Thenable<T> = T | Promise<T>

export type TransformResult =
  | string
  | null
  | undefined
  | {
      code: string
      map?:
        | string
        | null
        | {
            mappings: ''
          }
    }

export type Host = 'vite' | 'rollup' | 'webpack' | 'test'
export type PackageManager = 'yarn' | 'npm' | 'pnpm' | 'test' | 'unknown'
