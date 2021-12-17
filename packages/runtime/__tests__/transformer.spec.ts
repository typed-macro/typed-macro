import { createTransformer, Transformer } from '../src'
import { defineMacro, EnvContext } from '@typed-macro/core'
import { createMacroRemove } from '../../core/__tests__/macros'

describe('Transformer', () => {
  const env: EnvContext = {
    host: 'test',
    packageManager: 'test',
    projectPath: [''],
    dev: true,
    ssr: false,
  }
  let transformer: Transformer

  beforeEach(() => {
    transformer = createTransformer({})
  })

  it('should support set parser plugins', () => {
    transformer = createTransformer({ parserPlugins: ['decimal'] })
    const code = `let a = 0.3m`
    expect(() => transformer.transform(code, '', env)).not.toThrowError()
  })

  it('should support add parser plugins', () => {
    const code = `let a = 0.3m`
    expect(() => transformer.transform(code, '', env)).toThrowError()
    transformer.appendParserPlugins(['decimal'])
    expect(() => transformer.transform(code, '', env)).not.toThrowError()
  })

  it('should support add macros', () => {
    const macroA = defineMacro('macroA')
      .withSignature('(): void')
      .withHandler(({ path }) => path.remove())
    const macroB = defineMacro('macroB')
      .withSignature('(): void')
      .withHandler(({ path }) => path.remove())
    expect(() => transformer.appendMacros('macro', [macroA])).not.toThrowError()
    expect(() => transformer.appendMacros('macro', [macroB])).not.toThrowError()
    // throw error when macro duplicates
    expect(() => transformer.appendMacros('macro', [macroA])).toThrowError()
  })

  it('should apply macros', () => {
    transformer.appendMacros('macro', [createMacroRemove()])

    const applied = transformer.transform(
      `
    import 'macro'
    import { noop } from 'macro'
    noop()
    `,
      'test.ts',
      env
    )
    expect(applied).toMatchSnapshot()
    ;[
      `
    import * as m from 'macro'
    m.noop()
    m['noop']()
      `,
      `
    import { noop as n } from 'macro'
    n()
      `,
    ].forEach((code) => {
      expect(transformer.transform(code, 'test.ts', env)).toBe(applied)
    })

    expect(transformer.transform(`noop()`, 'test.ts', env)).toBeUndefined()
  })

  it('should support variable shadow', () => {
    transformer.appendMacros('macro', [createMacroRemove()])

    expect(
      transformer.transform(
        `
    import { noop as n } from 'macro'
    import * as m from 'macro'
    {
      const n = () => {}
      n()
    }
    n()
    m.noop()
    {
      const m = { noop() {} }
      m.noop()
    }
    `,
        'test.ts',
        env
      )
    ).toMatchSnapshot()
  })

  it('should support nested macros', () => {
    transformer.appendMacros('macro', [
      defineMacro('reverse')
        .withSignature('(s: string): string')
        .withHandler(({ path, args }, { types }) => {
          let content = 'default'
          if (args.length > 0 && args[0].isStringLiteral()) {
            content = args[0].node.value
          }
          path.replaceWith(
            types.stringLiteral(content.split('').reverse().join(''))
          )
        }),
    ])

    expect(
      transformer.transform(
        `
    import { reverse } from 'macro'
    console.log(reverse(reverse('hello world')))
    `,
        'test.ts',
        env
      )
    ).toMatchSnapshot()
  })

  it('should support helpers', () => {
    transformer.appendMacros('macro', [
      defineMacro('reverse')
        .withSignature('(s: string): string')
        // use generator function to disable auto macro expansion
        /* eslint-disable require-yield */
        .withHandler(function* ({ path, args }, { types, template }, helper) {
          expect(helper.containsMacros(args)).toEqual([true])

          helper.prependToBody(template.statement.ast('console.log(1)'))
          helper.prependToBody(
            template.statements.ast(`console.log(2); console.log(3)`)
          )

          helper.appendToBody(template.statement.ast('console.log(4)'))
          helper.appendToBody(
            template.statements.ast(`console.log(5); console.log(6)`)
          )

          const importA = {
            moduleName: 'some',
            exportName: 'funcA',
          }
          const importB = {
            moduleName: 'some',
            namespaceName: 'funcB',
          }

          const importC = {
            moduleName: 'some',
            exportName: 'funcC',
            localName: '_funcC',
          }

          const importD = {
            moduleName: 'other',
          }

          const importE = {
            moduleName: 'other',
            defaultName: '_other',
          }

          const insertedImportA = helper.prependImports(importA)
          const [insertedImportB] = helper.prependImports([importB])

          const insertedImportC = helper.appendImports(importC)
          const [insertedImportD] = helper.appendImports([importD])
          const [insertedImportE] = helper.appendImports([importE])

          expect(helper.findImported(importA)).toBe(insertedImportA)
          expect(helper.findImported([importB])[0]).toBe(insertedImportB)
          expect(helper.findImported(importC)).toBe(insertedImportC)
          expect(helper.findImported([importD])[0]).toBe(insertedImportD)
          expect(helper.findImported([importE])[0]).toBe(insertedImportE)

          let content = 'default'
          if (args.length > 0 && args[0].isStringLiteral()) {
            content = args[0].node.value
          }
          path.replaceWith(
            types.stringLiteral(content.split('').reverse().join(''))
          )
        }),
      /* eslint-enable require-yield */
    ])

    expect(
      transformer.transform(
        `
    import { reverse } from 'macro'
    console.log(reverse('' + reverse('hello world')))
    console.log(reverse(reverse('hello world')))
    `,
        'test.ts',
        env
      )
    ).toMatchSnapshot()
  })

  it('should support traversal/transform state', () => {
    transformer.appendMacros('macro', [
      defineMacro('noop')
        .withSignature('(): void')
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .withHandler(({ path, state }) => {
          const transformCount = (state.transform.get('count') || 0) as number
          if (transformCount === 0) {
            // test state
            expect(state.transform.has('unknown')).toBe(false)
            expect(state.transform.getOrSet('unknown', 0)).toBe(0)
            expect(state.transform.getOrSet('unknown', 1)).toBe(0)
            state.transform.delete('unknown')
            expect(state.transform.has('unknown')).toBe(false)
          }
          if (transformCount > 2) {
            path.remove()
            return
          }
          state.transform.set('count', transformCount + 1)
          expect(state.traversal.get('flag')).toBeUndefined()
          state.traversal.set('flag', 0)
        }),
    ])

    expect(() =>
      transformer.transform(
        `
    import { noop as n } from 'macro'
    n()
    `,
        'test.ts',
        env
      )
    ).not.toThrowError()
  })

  it('should limit max traversal times', () => {
    transformer = createTransformer({ maxTraversals: -1 })
    let count = 0
    transformer.appendMacros('macro', [
      defineMacro('noop')
        .withSignature('(): void')
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .withHandler((_) => {
          count++
        }),
    ])

    expect(() =>
      transformer.transform(
        `
    import { noop as n } from 'macro'
    n()
    `,
        'test.ts',
        env
      )
    ).toThrowError()

    expect(count > 2).toBe(true)
  })

  it('should throw error when call non-existed macro', () => {
    transformer.appendMacros('macro', [])

    expect(() =>
      transformer.transform(
        `
    import { noop as n } from 'macro'
    n()
    `,
        'test.ts',
        env
      )
    ).toThrowError()

    expect(() =>
      transformer.transform(
        `
    import m from 'macro'
    m.noop()
    `,
        'test.ts',
        env
      )
    ).toThrowError()
  })
})
