export type State = {
  thisTurn: object
  crossTurn: object
}

export type StateHelper = {
  thisTurnState(): any
  crossTurnState(): any
}

export function getStateHelper(state: State): StateHelper {
  const thisTurnState = () => state.thisTurn
  const crossTurnState = () => state.crossTurn
  return {
    thisTurnState,
    crossTurnState,
  }
}
