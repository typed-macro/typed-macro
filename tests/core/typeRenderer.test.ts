import {
  createTypeRenderer,
  renderTypes,
  TypeRenderer,
} from '@/core/typeRenderer'
import { NamespacedTypes } from '@/core/exports'
import { readFileSync, writeFileSync } from 'fs'
import { withTempPath } from '../testutils'

describe('renderTypes()', () => {
  it('should work', () => {
    expect(
      renderTypes({
        '@macro': {
          moduleScope: [`type A = string`],
          macroScope: [`export function c():A`],
        },
      })
    ).toMatchSnapshot()
    expect(
      renderTypes({
        '@macro': {
          moduleScope: [],
          macroScope: [`export function c():A`],
        },
      })
    ).toMatchSnapshot()
    expect(
      renderTypes({
        '@macro': {
          moduleScope: [],
          macroScope: [`export function c():A`],
        },
        '@another': {
          moduleScope: [`type B = string`],
          macroScope: [`export function d():B`],
        },
      })
    ).toMatchSnapshot()
  })
})

describe('TypeRenderer', () => {
  let types: NamespacedTypes
  let renderer: TypeRenderer
  beforeEach(() => {
    types = {}
    renderer = createTypeRenderer({
      types,
      typesPath: '',
    })
  })
  it('should render() properly', () => {
    expect(renderer.render()).toMatchSnapshot()
    types['@macro'] = {
      moduleScope: [`type A = string`],
      macroScope: [],
    }
    expect(renderer.render()).toMatchSnapshot()
  })

  it('should append() properly and update properly', () => {
    types['@macro'] = {
      moduleScope: [`type A = string`],
      macroScope: [],
    }
    {
      // append to existed namespace
      const update = renderer.append('@macro', 'type B = string')
      expect(renderer.render()).toMatchSnapshot()
      update(`type C = string`)
      expect(renderer.render()).toMatchSnapshot()
    }
    {
      // append to non-existed namespace
      const update = renderer.append('@another', 'type B = string')
      expect(renderer.render()).toMatchSnapshot()
      update(`type C = string`)
      expect(renderer.render()).toMatchSnapshot()
    }
  })
})

describe('TypeRenderer#write()', () => {
  const types = {
    '@macros': {
      moduleScope: [`type A = string`],
      macroScope: [],
    },
  }

  it('should ensure directory existed', (done) => {
    withTempPath('not/exist/a.d.ts', (tempPath) =>
      createTypeRenderer({
        typesPath: tempPath,
        types,
      })
        .write()
        .then(() => done())
    )
  })

  it('should truncate file', (done) => {
    withTempPath('./a.d.ts', (tempPath) => {
      writeFileSync(tempPath, 'hello\n'.repeat(10))
      const renderer = createTypeRenderer({
        typesPath: tempPath,
        types,
      })
      return renderer.write().then(() => {
        expect(readFileSync(tempPath).toString()).toBe(renderer.render())
        done()
      })
    })
  })
})
