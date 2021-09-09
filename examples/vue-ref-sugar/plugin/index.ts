import { defineMacro, defineMacroPlugin } from 'vite-plugin-macro'
import { join } from 'path'
import type { NodePath } from '@babel/traverse'
import type {
  MemberExpression,
  VariableDeclaration,
  VariableDeclarator,
} from '@babel/types'

const refMacro = defineMacro('$ref')
  .withSignature(`<T>(v: T): T`)
  .withHandler(({ path }, { types }, { appendImports }) => {
    const refExpr = path

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
      throw new Error(`$ref() macro can only be used within defineComponent().`)
    }

    const refID = path.scope.getProgramParent().generateUid('ref')

    // add helper
    appendImports({
      moduleName: 'vue',
      exportName: 'ref',
      localName: refID,
    })

    const letStmt = path.findParent((p) =>
      p.isVariableDeclaration()
    ) as NodePath<VariableDeclaration>
    if (!letStmt) {
      // case:
      // $ref(0)
      //   then just replace with ref()
      refExpr.node.callee = types.identifier(refID)
      return
    }
    if (letStmt.node.kind !== 'let') {
      // case:
      // const a = $ref(0)
      //   then throw out Error
      throw new Error(`Should use 'let' with $ref() macro.`)
    }
    if (letStmt.node.declarations.length > 1) {
      // case:
      //   let a = $ref(0), b = $ref(1)
      //   then throw out Error
      throw new Error(
        `Please declare one variable in one let statement with $ref() macro.`
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
      throw new Error(`Only identifier is allowed with $ref() macro.`)
    }
    // case:
    //   let a = $ref(0)
    //   then replace let with const, and replace all references in scope with a.value
    refExpr.node.callee = types.identifier(refID)
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
