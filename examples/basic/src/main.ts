import { echo } from '@echo'
import { tryLoad, load } from '@load'

echo('yeah', 3)

tryLoad('./**/*.css')
load('./**/*.css')

tryLoad('./scripts/*.ts')
load('./scripts/*.ts')
