import { createTypeRenderer, TypeRenderer } from '../src'
import { readFile, writeFile } from 'fs/promises'
import { withTempPath } from './utils'

describe('TypeRenderer', () => {
  let renderer: TypeRenderer
  beforeEach(() => {
    renderer = createTypeRenderer()
  })

  it('should support append and render to string', () => {
    renderer.append('some', ['export type A = string'])
    expect(renderer.renderToString()).toMatchSnapshot()
    renderer.append('some', ['export type B = number'])
    renderer.append('other', ['export type A = string'])
    expect(renderer.renderToString()).toMatchSnapshot()
  })

  it('should support render to file', () => {
    renderer.append('some', ['export type A = string'])
    expect(async () => {
      await withTempPath(
        'not/exist/a.d.ts',
        async (tempPath) => await renderer.renderToFile(tempPath)
      )
    }).not.toThrow()
  })

  it('should truncate file before render', async () => {
    renderer.append('some', ['export type A = string'])
    await withTempPath('./a.d.ts', async (tempPath) => {
      await writeFile(tempPath, 'hello\n'.repeat(10))
      await renderer.renderToFile(tempPath)

      expect((await readFile(tempPath)).toString()).toBe(
        renderer.renderToString()
      )
    })
  })
})
