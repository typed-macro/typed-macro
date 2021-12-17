import { EnvContext, MacroProvider } from '@typed-macro/core'
import { createRuntime, Runtime, RuntimeOptions } from '@typed-macro/runtime'
import { isArray } from '@typed-macro/shared'
import { createTestEnvContext } from './env'

export type TestRuntimeOptions = RuntimeOptions & {
  /**
   * EnvContext for testing.
   *
   * If is undefined, use the default one created by {@link createTestEnvContext}.
   */
  env?: EnvContext
  /**
   * Providers to be appended into runtime.
   */
  provider: MacroProvider | MacroProvider[]
}

export type TestRuntime = Omit<Runtime, 'renderTypes' | 'appendProvider'> & {
  /**
   * Render types into string.
   */
  renderTypes(): string
}

/**
 * Create a runtime to help test providers.
 *
 * e.g.
 * ```typescript
 * const provider = defineMacroProvider(...)
 *
 * const runtime = createTestRuntime({
 *   provider
 * })
 *
 * expect(
 *   runtime.renderTypes()
 * ).toMatchSnapshot()
 *
 * expect(
 *   runtime.load('ns')
 * ).toMatchSnapshot()
 *
 * expect(
 *   runtime.transform(`code`, 'filename')
 * ).toMatchSnapshot()
 *
 * // and so on...
 * ```
 */
export function createTestRuntime({
  provider,
  env = createTestEnvContext(),
  ...runtimeOptions
}: TestRuntimeOptions): TestRuntime {
  const runtime = createRuntime(env, runtimeOptions)

  if (isArray(provider)) provider.forEach((p) => runtime.appendProvider(p))
  else runtime.appendProvider(provider)

  return {
    ...runtime,
    renderTypes: () => runtime.internal.renderer.renderToString(),
  }
}
