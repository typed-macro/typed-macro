import {
  ImportDeclaration,
  isIdentifier,
  isImportDefaultSpecifier,
  isImportNamespaceSpecifier,
  isImportSpecifier,
} from '@babel/types'

/**
 * ```typescript
 * import 'moduleName'
 * { moduleName: string }
 *
 * import defaultName from 'moduleName'
 * { defaultName: string; moduleName: string }
 *
 * import { exportName } from 'moduleName'
 * { exportName: string; moduleName: string }
 *
 * import { exportName as localName } from 'moduleName'
 * { localName: string; exportName: string; moduleName: string }
 *
 * import * as namespaceName from 'moduleName'
 * { namespaceName: string; moduleName: string }
 * ```
 */
export type ImportOption =
  | { moduleName: string }
  | { defaultName: string; moduleName: string }
  | { localName: string; exportName: string; moduleName: string }
  | { exportName: string; moduleName: string }
  | { namespaceName: string; moduleName: string }

export const renderImportStmt = (imp: ImportOption) =>
  'defaultName' in imp
    ? `import ${imp.defaultName} from '${imp.moduleName}'`
    : 'localName' in imp
    ? `import { ${imp.exportName} as ${imp.localName} } from '${imp.moduleName}'`
    : 'exportName' in imp
    ? `import { ${imp.exportName} } from '${imp.moduleName}'`
    : 'namespaceName' in imp
    ? `import * as ${imp.namespaceName} from '${imp.moduleName}'`
    : `import '${imp.moduleName}'`

export function matchImportStmt(
  imp: ImportOption,
  node: ImportDeclaration,
  loose = true
) {
  if (node.source.value !== imp.moduleName) return false
  if ('defaultName' in imp) {
    // import defaultName from 'moduleName'
    for (const s of node.specifiers) {
      if (isImportDefaultSpecifier(s) && s.local.name === imp.defaultName)
        return true
    }
  } else if ('localName' in imp) {
    // import { exportName as localName } from 'moduleName'
    for (const s of node.specifiers) {
      if (
        isImportSpecifier(s) &&
        s.local.name === imp.localName &&
        isIdentifier(s.imported) &&
        s.imported.name === imp.exportName
      )
        return true
    }
  } else if ('exportName' in imp) {
    // import { exportName } from 'moduleName'
    for (const s of node.specifiers) {
      if (
        isImportSpecifier(s) &&
        isIdentifier(s.imported) &&
        s.imported.name === imp.exportName &&
        (loose || s.local.name === imp.exportName)
      )
        return true
    }
  } else if ('namespaceName' in imp) {
    // import * as defaultName from 'moduleName'
    for (const s of node.specifiers) {
      if (isImportNamespaceSpecifier(s) && s.local.name === imp.namespaceName)
        return true
    }
  } else {
    // import 'moduleName'
    if (loose || node.specifiers.length === 0) return true
  }
  return false
}
