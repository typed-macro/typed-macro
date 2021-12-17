import {
  EnvContext,
  InstantiatedMacroProvider,
  isMacro,
  isMacroProvider,
  Macro,
  MacroProvider,
  ModularizedExportable,
} from '@typed-macro/core'
import { isFunction, VERSION } from '@typed-macro/shared'

/**
 * @internal
 */
export type ModularizedMacros = { [moduleName: string]: Macro[] }

/**
 * @internal
 */
export type ModularizedModules = { [moduleName: string]: string }

/**
 * @internal
 */
export type ModularizedTypes = {
  [moduleName: string]: string[]
}

/**
 * @internal
 */
export type NormalizedExports = {
  macros: ModularizedMacros
  codes: ModularizedModules
  types: ModularizedTypes
}

/**
 * @internal
 */
export function normalizeExports(
  exports: ModularizedExportable
): NormalizedExports {
  const macros: ModularizedMacros = Object.create(null)
  const codes: ModularizedModules = Object.create(null)
  const types: ModularizedTypes = Object.create(null)

  Object.keys(exports).forEach((moduleName) => {
    const item = exports[moduleName]
    const type = types[moduleName] || (types[moduleName] = [])
    if (item.types) type.push(item.types)
    if ('code' in item) {
      codes[moduleName] = (codes[moduleName] || '') + (item.code || '') + '\n'
    } else {
      item.macros.forEach((m) => validateMacro(moduleName, m))
      const ms = macros[moduleName] || (macros[moduleName] = [])
      ms.push(...item.macros)
      type.push(...item.macros.map((m) => m.types))
    }
  })

  return {
    macros,
    codes,
    types,
  }
}

/**
 * @internal
 */
export type NormalizedMacroProvider = InstantiatedMacroProvider & {
  normalizedExports: NormalizedExports
}

/**
 * @internal
 *
 */
export function normalizeMacroProvider(
  provider: MacroProvider,
  env: EnvContext
): NormalizedMacroProvider {
  validateMacroProvider(provider)
  const instantiated = (
    isFunction(provider) ? provider(env) : provider
  ) as NormalizedMacroProvider
  instantiated.normalizedExports = normalizeExports(instantiated.exports)
  return instantiated
}

function validateMacro(moduleName: string, m: unknown) {
  if (!isMacro(m)) throw new Error(`'${m}' in '${moduleName}' is not a macro`)
  if (m.version !== VERSION)
    throw new Error(
      `macro '${m.name}' in '${moduleName}' is incompatible, expect '${VERSION}', actually '${m.version}'`
    )
}

function validateMacroProvider(provider: unknown) {
  if (!isMacroProvider(provider)) throw new Error(`not a macro provider`)
  if (provider.version !== VERSION)
    throw new Error(
      `incompatible version, expect '${VERSION}', actually '${provider.version}'`
    )
}
