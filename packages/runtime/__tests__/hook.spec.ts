import { createHookContainer } from '../src'
import { MacroProviderHooks } from '@typed-macro/core'

describe('HookContainer', () => {
  it('should work', async () => {
    const hooks = createHookContainer()

    const executed: string[] = []

    const mockedHooksA = {
      _: () => {
        executed.push('hooks A: bad hook!')
      },
      onStart: () => {
        executed.push('hooks A: onStart()')
      },
      onStop: () => {
        executed.push('hooks A: onStop()')
      },
      beforeTransform: (code: string) => {
        executed.push('hooks A: beforeTransform()')
        return 'a' + code
      },
      afterTransform: () => {
        executed.push('hooks A: afterTransform()')
        return {}
      },
    } as any

    const mockedHooksB: MacroProviderHooks = {
      onStart: () => {
        executed.push('hooks B: onStart()')
      },
      onStop: () => {
        executed.push('hooks B: onStop()')
      },
      beforeTransform: (code) => {
        executed.push('hooks B: beforeTransform()')
        return {
          code: 'b' + code,
        }
      },
      afterTransform: (code) => {
        executed.push('hooks B: afterTransform()')
        return {
          code: code + 'b',
        }
      },
    }
    hooks.append(mockedHooksA)
    hooks.append(mockedHooksB)

    await hooks.onStart()
    await hooks.onStop()
    expect(await hooks.beforeTransform('code', '')).toMatchSnapshot()
    expect(await hooks.afterTransform('code', '')).toMatchSnapshot()

    expect(executed).toMatchSnapshot()
  })

  it('should have short circuit rule in filter()', async () => {
    const filterTrue = jest.fn(() => true)
    const filterFalse = jest.fn(() => false)

    const hooksA = createHookContainer()
    hooksA.append({ onFilter: filterFalse })
    hooksA.append({ onFilter: filterTrue })
    hooksA.append({ onFilter: filterTrue })
    expect(await hooksA.onFilter('')).toBe(true)
    expect(filterTrue.mock.calls.length).toBe(1)
    expect(filterFalse.mock.calls.length).toBe(1)

    const hooksB = createHookContainer()
    hooksB.append({ onFilter: filterFalse })
    hooksB.append({ onFilter: filterFalse })
    hooksB.append({ onFilter: filterFalse })
    expect(await hooksB.onFilter('')).toBe(false)
    expect(filterTrue.mock.calls.length).toBe(1)
    expect(filterFalse.mock.calls.length).toBe(4)
  })
})
