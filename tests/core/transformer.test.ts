import { getAST, macroSerializer, mockMacro } from '#/testutils'
import { StringLiteral } from '@babel/types'
import { applyMacros, createTransformer } from '@/core/transformer'
import { Macro } from '@/core/macro'
import { NamespacedMacros } from '@/core/exports'
import { createState } from '@/core/helper/state'
import { ImportedMacrosContainer } from '@/core/helper/traverse'

expect.addSnapshotSerializer(macroSerializer)

describe('applyMacros()', () => {
  it('should work', () => {
    const testCases: {
      code: string
      macros: Record<string, Macro[]>
      applied: boolean
    }[] = [
      {
        code: `import {a} from '@a'`,
        macros: {
          '@a': [mockMacro('a')],
        },
        applied: false,
      },
      {
        code: `import {a} from '@a'; a()`,
        macros: {
          '@a': [mockMacro('a')],
        },
        applied: true,
      },
    ]
    testCases.forEach((c) => {
      const ast = getAST(c.code)
      const importedMacros = new ImportedMacrosContainer(
        c.macros
      ).collectFromAST(ast)

      expect(
        applyMacros({
          code: c.code,
          filepath: '',
          ast,
          importedMacros,
          ssr: false,
          dev: false,
          transformState: createState(),
        })
      ).toBe(c.applied)
    })
  })

  it('should throw error when call non-existent macro', () => {
    const code = `import a from '@a'; a.a()`
    const ast = getAST(code)
    const importedMacros = new ImportedMacrosContainer({
      '@a': [],
    }).collectFromAST(ast)

    expect(() =>
      applyMacros({
        code: code,
        filepath: '',
        ast,
        dev: false,
        importedMacros,
        ssr: false,
        transformState: createState(),
      })
    ).toThrow()
  })
})

describe('transformer', () => {
  it('should work', () => {
    const transform = createTransformer({
      parserPlugins: [],
      maxRecursions: 5,
    })

    expect(
      transform(
        {
          code: `import { echo } from '@echo'; echo('yeah')`,
          filepath: '',
          dev: true,
        },
        {
          '@echo': [
            mockMacro('echo', ({ path, args }, { template }) => {
              const msg = (args[0] as StringLiteral).value
              path.replaceWith(
                template.statement.ast`console.log("${Array.from(
                  { length: 3 },
                  () => msg
                ).join(' ')}")`
              )
            }),
          ],
        }
      )
    ).toMatchSnapshot()
  })

  it('should throw errors if there is wrong in steps', () => {
    const macros: NamespacedMacros = {
      '@echo': [
        mockMacro('echo', ({ path, args }) => {
          if (args.length === 0) throw new Error('')
          path.remove()
        }),
      ],
    }
    const transformer = createTransformer({
      parserPlugins: [],
      maxRecursions: 5,
    })
    const transform = (code: string) =>
      transformer(
        {
          code,
          filepath: '',
          dev: false,
        },
        macros
      )
    // args.length === 0
    expect(() => transform(`import { echo } from '@echo'; echo()`)).toThrow()
    // import non-existent macro and call
    expect(() => transform(`import { abc } from '@echo'; abc()`)).toThrow()
    // import non-existent macro but no call
    expect(() => transform(`import { abc } from '@echo';`)).not.toThrow()
    // call non-existent macro
    expect(() => transform(`import echo from '@echo'; echo.abc()`)).toThrow()
  })

  it('should throw errors if reached max recursion', () => {
    const transform = createTransformer({
      parserPlugins: [],
      maxRecursions: 5,
    })
    // recursion
    expect(() => {
      let max = 5
      transform(
        {
          code: `import {echo} from '@echo'; echo('yeah')`,
          filepath: '',
          dev: false,
        },
        {
          '@echo': [
            mockMacro('echo', ({ path }) => {
              if (--max === 0) path.remove()
            }),
          ],
        }
      )
    }).not.toThrow()
    expect(() => {
      let max = 6
      transform(
        {
          code: `import {echo} from '@echo'; echo('yeah')`,
          filepath: '',
          dev: false,
        },
        {
          '@echo': [
            mockMacro('echo', ({ path }) => {
              if (--max === 0) path.remove()
            }),
          ],
        }
      )
    }).toThrow()
  })

  it('should recollect imported macros every loop', () => {
    const fn = jest.fn()
    const transform = createTransformer({
      parserPlugins: [],
      maxRecursions: 5,
    })

    expect(
      transform(
        {
          code: `import { a } from '@echo'; a()`,
          filepath: '',
          dev: false,
        },
        {
          '@echo': [
            mockMacro('a', ({ path }, { template }, { appendToBody }) => {
              appendToBody(
                template.statements.ast(`import {b} from '@echo'; b()`)
              )
              path.remove()
            }),
            mockMacro('b', ({ path }, { template }) => {
              fn()
              path.replaceWith(
                template.statement.ast(`console.log('hello world')`)
              )
            }),
          ],
        }
      )
    ).toMatchSnapshot()
    expect(fn).toBeCalled()
  })

  it('should not transform normal function calls', () => {
    const transform = createTransformer({
      parserPlugins: [],
      maxRecursions: 5,
    })

    const macros = {
      '@macro': [
        mockMacro('a', ({ path }) => {
          path.remove()
        }),
      ],
    }

    expect(
      transform(
        {
          code: `    
  import { a } from '@macro'
  a()
  {
    const a = () => {}
    a()
  }
  `,
          filepath: '',
          dev: false,
        },
        macros
      )
    ).toMatchSnapshot()
    expect(
      transform(
        {
          code: `    
  import ns from '@macro'
  ns.a()
  {
    const ns = {}
    ns.a()
  }
  `,
          filepath: '',
          dev: false,
        },
        macros
      )
    ).toMatchSnapshot()
  })

  it('should support yield', () => {
    const transform = createTransformer({
      parserPlugins: [],
      maxRecursions: 5,
    })

    const stack: string[] = []
    const outMacro = mockMacro('outer', function* ({ path }, { template }) {
      stack.push('enter out')
      yield path.get('arguments')
      path.replaceWith(template.expression.ast(`"out"`))
      stack.push('leave out')
    })

    const inMacro = mockMacro('inner', ({ path }, { template }) => {
      stack.push('enter in')
      path.replaceWith(template.expression.ast(`"in"`))
      stack.push('leave in')
    })

    const macros = {
      '@macro': [inMacro, outMacro],
    }
    {
      transform(
        {
          code: `import { outer, inner } from '@macro'; outer(inner(), inner())`,
          filepath: '',
          dev: false,
        },
        macros
      )

      expect(stack).toEqual([
        'enter out',
        'enter in',
        'leave in',
        'enter in',
        'leave in',
        'leave out',
      ])
    }
    stack.length = 0
    {
      transform(
        {
          code: `import { outer, inner } from '@macro'; outer(inner(), outer(inner()))`,
          filepath: '',
          dev: false,
        },
        macros
      )

      expect(stack).toEqual([
        'enter out',
        'enter in',
        'leave in',
        'enter out',
        'enter in',
        'leave in',
        'leave out',
        'leave out',
      ])
    }
  })
})
