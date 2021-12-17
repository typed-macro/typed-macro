import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

export async function withTempPath<T>(
  path: string,
  fn: (path: string) => T | Promise<T>
) {
  const tempDir = await mkdtemp(join(tmpdir(), 'macros-'))
  const result = await fn(join(tempDir, path))
  await rm(tempDir, {
    force: true,
    recursive: true,
  })
  return result
}
