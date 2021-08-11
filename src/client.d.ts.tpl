{{#namespaces}}
declare module '{{path}}' {
{{#moduleTypes}}
  {{{.}}}
{{/moduleTypes}}
{{#macros}}
{{#macroTypes}}
  {{{.}}}
{{/macroTypes}}
{{#signature}}
{{#comment}}
  {{{.}}}
{{/comment}}
  export function {{name}}{{{signature}}}
{{/signature}}
{{/macros}}
}
{{/namespaces}}
