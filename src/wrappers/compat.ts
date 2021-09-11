/*
 * This is a compatibility control mechanism based on version number,
 * to ensure the compatibility among provider, plugin and manager.
 */

import { WithVersion } from '@/common'
import { MacroProvider } from '@/wrappers/macroProvider'
import { MacroPlugin } from '@/wrappers/macroPlugin'

/*
 * The current MacroProvider version.
 *
 * It represents whether the MacroProvider and MacroManager is compatible.
 * This involves the interface that attach exports from Provider to the Runtime
 * and the hooks.
 *
 * @deps {@link MacroProviderHooks}, {@link Attachable}
 */
const PROVIDER_VERSION = 0

export function versionedProvider(v: MacroProvider): MacroProvider {
  ;(v as WithVersion<MacroProvider>).$__version = PROVIDER_VERSION
  return v
}

export function isProviderCompatible(v: MacroProvider) {
  return (v as WithVersion<MacroProvider>).$__version === PROVIDER_VERSION
}

/*
 * The current MacroPlugin version.
 *
 * It represents whether the MacroPlugin and MacroManager is compatible.
 * This involves the interface that attach exports from Plugin to the Runtime.
 *
 * @deps {@link MacroPlugin.__consume}, {@link Attachable}
 */
const PLUGIN_VERSION = 0

export function versionedPlugin(v: MacroPlugin): MacroPlugin {
  ;(v as WithVersion<MacroPlugin>).$__version = PLUGIN_VERSION
  return v
}

export function isPluginCompatible(v: MacroPlugin) {
  return (v as WithVersion<MacroPlugin>).$__version === PLUGIN_VERSION
}
