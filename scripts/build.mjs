import $ from 'shelljs'
import chalk from 'chalk'

const log = (msg) => console.log(chalk.yellow(msg))

log('Cleaning...')
$.rm('-rf', './dist')

log('Bundling...')
$.exec('yarn tsup src/index.ts --dts --format cjs,esm')

log('Copying assets...')
$.cp('./src/client.d.ts.tpl', './dist')

log('Done.')