// upgrade versions of `dependencies`/`peerDependencies` across packages according to the version in root package.json

import minimist from "minimist";
import { dirname, error, getPackages, info, log, readJSON, scope, success } from "./utils.mjs";
import { resolve } from "path";
import { writeFileSync } from "fs";

/**
 * Env
 */
const root = readJSON("../package.json");

if (!root) {
  error("Fail to get the root package.json");
  process.exit(1);
}

const target = {
  ...root["dependencies"],
  ...root["peerDependencies"]
};

info("Target");
scope(() => {
  Object.keys(target).forEach(dep => {
    log(`${dep}@${target[dep]}`);
  });
});

const packages = getPackages();

if (!packages || !packages.length) {
  error("Fail to get package list.");
  process.exit(1);
}

/**
 * Parse Arguments
 */
const args = minimist(process.argv.slice(2));
const isDryRun = args["dry-run"];

/**
 * Start Sync Dep
 */
console.log();
info("Upgrading...");
scope(() => {
  packages.forEach(p => updatePackage(resolve(dirname(), "../packages", p)));
});

function updatePackage(pkgRoot) {
  const pkgPath = resolve(pkgRoot, "package.json");
  const pkg = readJSON(pkgPath);
  log(pkg.name);
  scope(() => {
    if (pkg.dependencies) setVersion(pkg, "dependencies");
    if (pkg.peerDependencies) setVersion(pkg, "peerDependencies");
    if (!isDryRun) writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  });
}

function setVersion(pkg, depType) {
  const current = pkg[depType];
  if (!current) {
    log(`(no dependencies)`);
    return;
  }
  Object.keys(current).forEach(dep => {
    if (dep in target) {
      if (current[dep] === target[dep]) {
        log(`${dep}${current[dep]} (no changes)`);
        return;
      }
      success(`${dep}${current[dep]} -> ${dep}@${target[dep]}`);
      current[dep] = target[dep];
    }
  });
}
