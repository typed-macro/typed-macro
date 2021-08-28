import { getDevServerHelper } from '@/helper/server'
import { withDevServer } from '../testutils'

describe('DevServerHelper', () => {
  it('should work', async () => {
    await withDevServer(async (server) => {
      server.pluginContainer.resolveId = async (id) => ({ id })
      // see:
      // https://github.com/vitejs/vite/blob/da0abc59935/packages/vite/src/node/plugins/importAnalysis.ts#L214
      const source = await server.moduleGraph.ensureEntryFromUrl('/@id/source')
      const user = await server.moduleGraph.ensureEntryFromUrl('/@id/user')
      source.importers.add(user)
      user.importedModules.add(source)

      const helper = getDevServerHelper(server)
      expect(helper.findImporters('source')).toMatchSnapshot()
      expect(() => helper.invalidateCache('source')).not.toThrow()
    })
  })
})
