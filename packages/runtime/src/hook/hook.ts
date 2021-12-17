import { MacroProviderHooks } from '@typed-macro/core'
import { isString, Thenable, TransformResult } from '@typed-macro/shared'

export type CombinedHooks = {
  onStart(): Promise<void>
  onFilter(id: string): Promise<boolean>
  beforeTransform(code: string, id: string): Promise<string>
  afterTransform(code: string, id: string): Promise<string>
  onStop(): Promise<void>
}

export type HookContainer = CombinedHooks & {
  /**
   * Append hooks into container.
   */
  append(hooks: MacroProviderHooks): void
}

export function createHookContainer(): HookContainer {
  const container: {
    [H in keyof MacroProviderHooks]-?: Required<MacroProviderHooks>[H][]
  } = {
    onStart: [],
    onFilter: [],
    beforeTransform: [],
    afterTransform: [],
    onStop: [],
  }
  return {
    append: (hooks) => {
      const keys = Object.keys(hooks) as any as Array<keyof MacroProviderHooks>
      keys.forEach((key) => {
        if (!(key in container)) return
        container[key].push(hooks[key] as any)
      })
    },
    onStart: async () => {
      await Promise.all(container.onStart.map((hook) => hook()))
    },
    onStop: async () => {
      await Promise.all(container.onStop.map((hook) => hook()))
    },
    onFilter: async (id) => {
      for (const hook of container.onFilter) {
        if (await hook(id)) return true
      }
      return false
    },
    beforeTransform: createTransformHook(container.beforeTransform),
    afterTransform: createTransformHook(container.afterTransform),
  }
}

function createTransformHook(
  hooks: ((code: string, id: string) => Thenable<TransformResult>)[]
) {
  return async (code: string, id: string) => {
    for (const hook of hooks) {
      const result = await hook(code, id)
      if (result != null) {
        if (isString(result)) code = result
        else code = result.code || code
      }
    }
    return code
  }
}
