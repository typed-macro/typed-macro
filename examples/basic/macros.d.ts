declare module '@echo' {
  export function echoReverse(msg: string): void
}
declare module '@string' {
  export function reverse(msg: string): string
}
declare module '@load' {
  export function tryLoad(glob: string): void
  /* provide a glob pattern to load assets */
  export function load(glob: string): void
}