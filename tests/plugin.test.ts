import { vitePluginMacro } from '@/plugin'

describe('vitePluginMacro', () => {
  it('should work', () => {
    expect(() => vitePluginMacro()).not.toThrow()
    expect(() => {
      expect(vitePluginMacro({ name: 'test' }).toPlugin()[0].name).toBe('test')
    }).not.toThrow()
  })
})
