import { Thenable, TransformResult } from '@typed-macro/shared'

/**
 * Hooks Order
 * ```
 * onStart()
 * transform files loop:
 *   onFilter()
 *   if filter passed:
 *     beforeTransform()
 *     apply macros
 *     afterTransform()
 * onStop()
 * ```
 */
export type MacroProviderHooks = {
  /**
   * Called after initialized.
   */
  onStart?(): Thenable<void>

  /**
   * Called when determining whether a file should be transformed.
   *
   * Note that an excluded file will never be passed to this hook.
   */
  onFilter?(id: string): Thenable<boolean>

  /**
   * Called before transformation by macros.
   *
   * Can turn some non-js/non-ts file into JS code in this hook.
   */
  beforeTransform?(code: string, id: string): Thenable<TransformResult>

  /**
   * Called after transformation by macros.
   */
  afterTransform?(code: string, id: string): Thenable<TransformResult>

  /**
   * Called before dev server stops or bundler finishes building.
   */
  onStop?(): Thenable<void>
}
