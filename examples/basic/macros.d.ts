declare module '@echo' {
  export function echo(msg: string, repeat?: number): void
}
declare module '@load' {
  export function tryLoad(glob: string): void
  /* provide a glob pattern to load assets */
  export function load(glob: string): void
}