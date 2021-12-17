/**
 * Global version number.
 *
 * When components are compatible, the version numbers must be equal;
 * when the version numbers are equal, the components must be compatible.
 *
 * Runtime should check the version of providers and macros.
 *
 * Provider doesn't need to check the version of macro because it is
 * only the wrapper of the macro,
 * which has nothing to do with the implementation and shape of macros,
 * and this independence should be guaranteed.
 */
export const VERSION = '1'
