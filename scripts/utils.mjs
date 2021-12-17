import chalk from "chalk";
import { fileURLToPath } from "url";
import { readdirSync, readFileSync, statSync } from "fs";
import { resolve, parse } from "path";

let layer = 0

export function scope(fn) {
  layer++
  fn()
  layer--
}

function consoleWithIdent(...message) {
  if (layer > 0) console.log('  '.repeat(layer), ...message)
  else console.log(...message)
}

export function log(msg) {
  consoleWithIdent(chalk.cyan(msg));
}

export function info(label, msg) {
  const pad = Math.ceil(label.length / 4) * 4
  if (msg) consoleWithIdent(chalk.bgGray.whiteBright` ${label.padEnd(pad)} `, msg);
  else consoleWithIdent(chalk.cyanBright(label.padEnd(pad)))
}

export function error(msg) {
  consoleWithIdent(chalk.red(msg));
}

export function success(msg) {
  consoleWithIdent(chalk.green(msg));
}

export function readJSON(path) {
  return JSON.parse((readFileSync(resolve(dirname(), path))).toString());
}

export function getPackages() {
  return readdirSync(resolve(dirname(), '../packages'))
    .filter(f => statSync(`packages/${f}`).isDirectory());
}

export function dirname() {
 return  parse(fileURLToPath(import.meta.url)).dir
}