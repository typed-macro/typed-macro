import { echoReverse } from '@echo'
import { tryLoad, load } from '@load'

echoReverse('yeah yeah')

tryLoad('./**/*.css')
load('./**/*.css')

tryLoad('./scripts/*.ts')
load('./scripts/*.ts')
