import { ParserPlugin } from '@babel/parser'

export type MacroProviderOptions = {
  /**
   * Babel plugins to be applied during parsing.
   *
   * 'typescript' and 'jsx' are included by default and cannot be removed.
   *
   * Some plugins are enabled automatically by the latest babel parser
   * because they have been regarded as part of the language.
   *
   * @see https://babeljs.io/docs/en/babel-parser#plugins
   * @see https://babeljs.io/docs/en/babel-parser#latest-ecmascript-features
   */
  parserPlugins?: ParserPlugin[]
}
