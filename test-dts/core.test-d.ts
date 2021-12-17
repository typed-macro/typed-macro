import {
  Babel,
  defineMacro,
  defineMacroProvider,
  EnvContext,
  ImportOption,
  Macro,
  MacroContext,
  MacroHandler,
  MacroHelper,
  MacroProvider,
  ModularizedExportable,
} from '@typed-macro/core'
import { describe, expectType } from './utils'
import { NodePath } from '@babel/traverse'
import { ImportDeclaration, Node } from '@babel/types'

describe('define macro', () => {
  expectType<Macro>(
    defineMacro('test')
      .withCustomType('')
      .withSignature('')
      .withHandler((ctx, babel, helper) => {
        expectType<MacroContext>(ctx)
        expectType<Babel>(babel)
        expectType<MacroHelper>(helper)
      })
  )
  // TODO: how to reject user-created macro?
  /*
  // @ts-expect-error
  expectType<Macro>({})
  */
})

describe('macro handler', () => {
  expectType<MacroHandler>(function* (ctx, _, helper) {
    yield ctx.path // NodePath
    yield ctx.args // NodePath[]
    yield helper.prependImports({ moduleName: '' }) // NodePath<ImportDeclaration>
    yield helper.prependImports([{ moduleName: '' }]) // NodePath<ImportDeclaration>[]
    yield undefined // Do nothing
  })

  // eslint-disable-next-line @typescript-eslint/no-empty-function, require-yield
  expectType<MacroHandler>(function* () {})

  expectType<MacroHandler>(({ path }) => path.remove())

  // @ts-expect-error
  expectType<MacroHandler>(({ path }) => {
    path.remove()
    return ''
  })

  // @ts-expect-error
  expectType<MacroHandler>(function* () {
    yield ''
  })
})

describe('common types', () => {
  expectType<ImportOption>({ moduleName: '', exportName: '' })
  expectType<ImportOption>({ moduleName: '', exportName: '', localName: '' })
  expectType<ImportOption>({ moduleName: '', namespaceName: '' })
  expectType<ImportOption>({ moduleName: '', defaultName: '' })
})

describe('macro helper', () => {
  expectType<MacroHandler>((_, __, h) => {
    const imp = { moduleName: '', exportName: '' }
    const node = null as any as Node
    const nodePath = null as any as NodePath

    expectType<NodePath<ImportDeclaration>>(h.prependImports(imp))
    expectType<NodePath<ImportDeclaration>[]>(h.prependImports([]))

    expectType<NodePath<ImportDeclaration>>(h.appendImports(imp))
    expectType<NodePath<ImportDeclaration>[]>(h.appendImports([]))

    expectType<NodePath>(h.prependToBody(node))
    expectType<NodePath[]>(h.prependToBody([]))

    expectType<NodePath>(h.appendToBody(node))
    expectType<NodePath[]>(h.appendToBody([]))

    expectType<boolean>(h.containsMacros(nodePath))
    expectType<boolean[]>(h.containsMacros([nodePath]))

    expectType<NodePath<ImportDeclaration> | undefined>(h.findImported(imp))
    expectType<(NodePath<ImportDeclaration> | undefined)[]>(h.findImported([]))
  })
})

describe('define provider', () => {
  expectType<MacroProvider>(
    defineMacroProvider((env) => {
      expectType<EnvContext>(env)
      return {
        id: '',
        exports: {},
        hooks: {},
        options: {},
      }
    })
  )

  expectType<MacroProvider>(
    defineMacroProvider({
      id: '',
      exports: {},
      hooks: {},
      options: {},
    })
  )

  // TODO: how to reject user-created macro provider?
  /*
  // @ts-expect-error
  expectType<MacroProvider>({ id: '', exports: {} })
  */
})

describe('modularized exportable', () => {
  expectType<ModularizedExportable>({})
  expectType<ModularizedExportable>({
    moduleName: {
      macros: [],
      types: '',
    },
  })
  expectType<ModularizedExportable>({
    moduleName: {
      code: '',
      types: '',
    },
  })
})
