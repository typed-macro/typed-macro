/* istanbul ignore file */

/*
 * This is a compatibility control mechanism based on version number,
 * to ensure the compatibility among provider, plugin and manager.
 */

import { MacroProvider } from '@/wrappers/macroProvider'
import { MacroPlugin } from '@/wrappers/macroPlugin'

/*
 * The current MacroProvider version.
 *
 * It represents whether the MacroProvider and MacroManager is compatible.
 * This involves the hooks and the interface that attach exports from Provider to the Runtime.
 *
 * @deps {@link MacroProvider}, {@link MacroProviderHooks}, {@link Attachable}
 */
export const PROVIDER_VERSION = 0

export type VersionedProvider = MacroProvider & {
  $__provider_version: number
}

export function versionedProvider(v: MacroProvider): MacroProvider {
  ;(v as VersionedProvider).$__provider_version = PROVIDER_VERSION
  return v
}

export function isProviderCompatible(v: MacroProvider) {
  return (v as VersionedProvider).$__provider_version === PROVIDER_VERSION
}

/*
 * The current MacroPlugin version.
 *
 * It represents whether the MacroPlugin and MacroManager is compatible.
 * This involves the interface that attach exports from Plugin to the Runtime.
 *
 * @deps {@link MacroPlugin}, {@link MacroPlugin.__consume}, {@link Attachable}
 */
export const PLUGIN_VERSION = 0

export type VersionedPlugin = MacroPlugin & {
  $__plugin_version: number
}

export function versionedPlugin(v: MacroPlugin): MacroPlugin {
  ;(v as VersionedPlugin).$__plugin_version = PLUGIN_VERSION
  return v
}

export function isPluginCompatible(v: MacroPlugin) {
  return (v as VersionedPlugin).$__plugin_version === PLUGIN_VERSION
}
