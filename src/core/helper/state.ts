export type StateHelper = {
  /**
   * Get the state shared during this traversal.
   *
   * What is `turn`:
   * > In order to recursively expand all macros in a file,
   * > the transformer will traverse the AST many times,
   * > and each traversal is called a turn.
   */
  thisTurnState(): any
  /**
   * Get the state shared during all traversals.
   *
   * @see StateHelper.thisTurnState
   */
  crossTurnState(): any
  /**
   * Clear the state shared during this traversal.
   *
   * Dangerous operation:
   *   It may affect all macros depends on the state.
   *
   * @see StateHelper.thisTurnState
   */
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
