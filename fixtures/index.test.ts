import { join } from 'path'
import { expectViteBuild, getSubDirectories } from './fixtureutils'

describe('fixtures', () => {
  {
    // vite-build
    test.each(getSubDirectories(join(__dirname, 'vite-build')))(
      'test build $filename using vite',
      async ({ path }) => {
        await expectViteBuild(path)
      },
      30 * 1000
    )
  }
})
