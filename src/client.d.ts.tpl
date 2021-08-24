{{#namespaces}}
declare module '{{module}}' {
{{#moduleScopeTypes}}
  {{{.}}}
{{/moduleScopeTypes}}
{{#macros}}
{{#macroScopeTypes}}
  {{{.}}}
{{/macroScopeTypes}}
{{#signature}}
{{#comment}}
  /** {{{.}}} **/
{{/comment}}
  export function {{name}}{{{signature}}}
{{/signature}}
{{/macros}}
}
{{/namespaces}}
