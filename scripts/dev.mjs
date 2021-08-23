import $ from 'shelljs'
import chalk from 'chalk'

const log = (msg) => console.log(chalk.blue(msg))

log('Building...')
$.exec('yarn build')

log('Trying link...')
$.exec('yarn unlink')
$.exec('yarn link')

const exampleToBeRun = process.argv[2]
if (exampleToBeRun) {
  log(`Running example ${exampleToBeRun}...`)
  const cwd= `./examples/${exampleToBeRun}`
  $.exec('yarn link vite-plugin-macro', { cwd })
  $.exec('yarn dev', { cwd })
}