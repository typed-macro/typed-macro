import { createModules } from '../src/plugin/impl/modules'
import { NO_OP } from '@typed-macro/shared'

describe('Vite Plugin Modules', () => {
  it('should work', () => {
    // DO NOT USE createServer FROM vite
    const modules = createModules({
      moduleGraph: {
        getModuleById: (id: string) => (id.endsWith('tsx') ? undefined : {}),
        invalidateModule: NO_OP,
      },
    } as any)
    // set & get & unset
    {
      modules.setTag('test.ts', 'some_thing')
      expect(modules.getTag('test.ts')).toBe('some_thing')
      modules.unsetTag('test.ts')
      expect(modules.getTag('test.ts')).toBeUndefined()
    }
    // query & invalidate
    {
      modules.setTag('some.ts', 'some_thing')
      modules.setTag('some.tsx', 'other_thing')

      expect(modules.queryByTag('some_thing')).toEqual(['some.ts'])
      expect(modules.queryByTag('thing').length).toBe(0)
      expect(modules.queryByTag(/thing/).length).toBe(2)

      expect(modules.invalidateByTag('thing').length).toBe(0)
      // because test.tsx is removed
      expect(modules.invalidateByTag(/thing/).length).toBe(1)
    }
  })
})
