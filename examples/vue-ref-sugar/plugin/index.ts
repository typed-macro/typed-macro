import { defineMacro, defineMacroPlugin } from 'vite-plugin-macro'
import { join } from 'path'
import type { NodePath } from '@babel/traverse'
import type {
  CallExpression,
  MemberExpression,
  VariableDeclaration,
  VariableDeclarator,
} from '@babel/types'

const refMacro = defineMacro('$ref')
  .withSignature(`<T>(v: T): T`)
  .withHandler(({ path }, { types }, { appendImports }) => {
    const refExpr = path as NodePath<CallExpression>

    if (
      !refExpr.findParent(
        (p) =>
          p.isCallExpression() &&
          types.isIdentifier(p.node.callee) &&
          p.node.callee.name === 'defineComponent'
      )
    ) {
      // case:
      // call $ref() outside defineComponent()
      //   then throw out Error
      throw new Error(
        `$ref() macro can only be used within defineComponent(), around line ${
          refExpr.node.loc?.start.line ?? 'unknown'
        }.`
      )
    }

    // add helper
    appendImports({
      moduleName: 'vue',
      exportName: 'ref',
      localName: '__ref',
    })

    const letStmt = path.findParent((p) =>
      p.isVariableDeclaration()
    ) as NodePath<VariableDeclaration>
    if (!letStmt) {
      // case:
      // $ref(0)
      //   then just replace with ref()
      refExpr.node.callee = types.identifier('__ref')
      return
    }
    if (letStmt.node.kind !== 'let') {
      // case:
      // const a = $ref(0)
      //   then throw out Error
      throw new Error(
        `Should use 'let' with $ref() macro, around line ${
          refExpr.node.loc?.start.line ?? 'unknown'
        }.`
      )
    }
    if (letStmt.node.declarations.length > 1) {
      // case:
      //   let a = $ref(0), b = $ref(1)
      //   then throw out Error
      throw new Error(
        `Please declare one variable in one let statement with $ref() macro, around line ${
          refExpr.node.loc?.start.line ?? 'unknown'
        }.`
      )
    }

    // use findParent to get node path
    const declExpr = refExpr.findParent((p) =>
      p.isVariableDeclarator()
    ) as NodePath<VariableDeclarator>
    if (!types.isIdentifier(declExpr.node.id)) {
      // case:
      //   let {} = $ref(0)
      //   then throw out Error
      throw new Error(
        `Only identifier is allowed with $ref() macro, around line ${
          refExpr.node.loc?.start.line ?? 'unknown'
        }.`
      )
    }
    // case:
    //   let a = $ref(0)
    //   then replace let with const, and replace all references in scope with a.value
    refExpr.node.callee = types.identifier('__ref')
    letStmt.node.kind = 'const'
    const id = declExpr.node.id.name
    declExpr.scope.getBinding(id)?.referencePaths.forEach((p) => {
      const node = p.node as MemberExpression
      node.type = 'MemberExpression'
      node.object = types.identifier(id)
      node.property = types.identifier('value')
      node.computed = false
    })
  })

export default function refSugar() {
  return defineMacroPlugin({
    name: 'ref-sugar',
    typesPath: join(__dirname, '../macros.d.ts'),
    exports: {
      '@ref-sugar': {
        macros: [refMacro],
      },
    },
  })
}
