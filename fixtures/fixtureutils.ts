import { build } from 'vite'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { readdirSync, statSync } from 'fs'
import { withTempPath } from '#/testutils'

export async function viteBuildTo(inputDir: string, outputDir: string) {
  await build({
    build: {
      lib: {
        entry: join(inputDir, './index.ts'),
        formats: ['es'],
        fileName: 'index',
      },
      outDir: outputDir,
    },
    configFile: join(inputDir, './vite.config.ts'),
    logLevel: 'silent',
  })
  return (await readFile(join(outputDir, 'index.es.js'))).toString()
}

export async function viteBuild(rootPath: string) {
  return await withTempPath('.', (tempDir) =>
    viteBuildTo(join(rootPath, './input'), tempDir)
  )
}

export async function expectViteBuild(rootPath: string) {
  const result = await viteBuild(rootPath)
  const expectation = (
    await readFile(join(rootPath, './output/index.es.js'))
  ).toString()
  expect(result).toBe(expectation)
}

export function getSubDirectories(rootPath: string) {
  return readdirSync(rootPath)
    .map((file) => ({ path: join(rootPath, file), filename: file }))
    .filter((f) => statSync(f.path).isDirectory())
}
