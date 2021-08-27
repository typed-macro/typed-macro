import { getStateHelper, StateHelper } from '@/core/helper/state'

describe('StateHelper', () => {
  let helper: StateHelper

  const reset = () => {
    helper = getStateHelper()
  }

  beforeEach(reset)

  it('should work', () => {
    expect(helper.thisTurnState()).not.toBeUndefined()
    expect(helper.crossTurnState()).not.toBeUndefined()
    expect(helper.clearTurnState()).not.toBeUndefined()

    helper.thisTurnState().ok = true
    helper.crossTurnState().ok = true
    expect(helper.thisTurnState().ok).toBe(true)
    expect(helper.crossTurnState().ok).toBe(true)

    helper.clearTurnState()
    expect(helper.thisTurnState().ok).toBeUndefined()
    expect(helper.crossTurnState().ok).toBe(true)
  })
})
