import { createTestEnvContext } from '../src'

describe('Mock Modules', () => {
  it('should work', () => {
    const env = createTestEnvContext({ modules: true })
    const modules = env.modules!
    // set & get & unset
    {
      modules.setTag('test.ts', 'some_thing')
      expect(modules.getTag('test.ts')).toBe('some_thing')
      modules.unsetTag('test.ts')
      expect(modules.getTag('test.ts')).toBeUndefined()
    }
    // query & invalidate
    {
      modules.setTag('test.ts', 'some_thing')
      modules.setTag('test.tsx', 'other_thing')

      expect(modules.queryByTag('some_thing')).toEqual(['test.ts'])
      expect(modules.queryByTag('thing').length).toBe(0)
      expect(modules.queryByTag(/thing/).length).toBe(2)

      expect(modules.invalidateByTag('thing').length).toBe(0)
      expect(modules.invalidateByTag(/thing/).length).toBe(2)
    }
  })
})
