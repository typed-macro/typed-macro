import $ from 'shelljs'
import chalk from 'chalk'
import { getExamples } from "./utils.mjs";

const log = (msg) => console.log(chalk.blue(msg))

getExamples().forEach(({name, path}) => {
  log(`processing example ${name} ...`)
  $.exec(`yarn`, {
    cwd: path
  })
})
