declare module '@echo' {
  export interface DummyType {}
  export function echo(msg: string, repeat?: number): void
}
declare module '@load' {
  export function load(glob: string): void
}
