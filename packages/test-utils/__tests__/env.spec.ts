import { createTestEnvContext } from '../src'

describe('TestEnvContext', () => {
  it('should work', () => {
    // watcher and modules should be undefined by default
    {
      const env = createTestEnvContext()
      expect(env.watcher).toBeUndefined()
      expect(env.modules).toBeUndefined()
    }
    // watchOptions enable watcher
    {
      const env = createTestEnvContext({ watchOptions: {} })
      expect(env.watcher).not.toBeUndefined()
    }
    // modules strategy
    {
      const env = createTestEnvContext({ modules: true })
      expect(env.modules).not.toBeUndefined()
    }
    {
      const env = createTestEnvContext({ modules: false })
      expect(env.modules).toBeUndefined()
    }
  })
})
