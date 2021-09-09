import { build } from 'vite'
import { join } from 'path'
import { readFile, access, writeFile } from 'fs/promises'
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

export async function isExist(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const needUpdate = process.argv.includes('-u')

export async function expectViteBuild(rootPath: string) {
  const result = await viteBuild(rootPath)
  const snapPath = join(rootPath, './output/index.js')
  if (needUpdate || !(await isExist(snapPath))) {
    await writeFile(snapPath, result)
    return
  }
  const expectation = (await readFile(snapPath)).toString()
  expect(result).toBe(expectation)
}

export function getSubDirectories(rootPath: string) {
  return readdirSync(rootPath)
    .map((file) => ({ path: join(rootPath, file), filename: file }))
    .filter((f) => statSync(f.path).isDirectory())
}
