export type StateHelper = {
  thisTurnState(): any
  crossTurnState(): any
  clearTurnState(): any
}

export function getStateHelper(): StateHelper {
  const state = { thisTurn: {}, crossTurn: {} }
  const clearTurnState = () => (state.thisTurn = {})
  const thisTurnState = () => state.thisTurn
  const crossTurnState = () => state.crossTurn
  return {
    thisTurnState,
    crossTurnState,
    clearTurnState,
  }
}
