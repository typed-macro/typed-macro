import $ from 'shelljs'

$.rm('-rf', './dist')

$.exec('yarn tsup src/index.ts --dts --format cjs,esm')

$.cp('./src/client.d.ts.tpl', './dist')
