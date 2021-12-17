// <new version> [--dry-run] [--skip-tests] [--skip-build]
// the version has no leading `v`

import $ from "shelljs";
import minimist from "minimist";
import { resolve } from "path";
import { writeFileSync } from "fs";
import { log, info, error, success, readJSON, getPackages, dirname, scope } from "./utils.mjs";

/**
 * Env
 */
const { version: pkgVersion } = readJSON("../package.json");

if (!pkgVersion) {
  error("Fail to get the current version from root package.json");
  process.exit(1);
}

const packages = getPackages();

if (!packages || !packages.length) {
  error("Fail to get package list.");
  process.exit(1);
}

/**
 * Parse Arguments
 */
const args = minimist(process.argv.slice(2));
const targetVersion = args._[0];
const isDryRun = args["dry-run"];
const skipTests = args["skip-tests"];
const skipBuild = args["skip-build"];

if (!targetVersion) {
  error("No version specified!");
  process.exit(1);
}

/**
 * Handlers
 */
const run = isDryRun
  ? (cmd) =>
    info("DRY RUN", cmd)
  : (cmd, opts = {}) => {
    log(cmd);
    return $.exec(cmd, { silent: true, fatal: true, ...opts });
  };

/**
 * Start Release
 */

info("CURRENT VERSION", `v${pkgVersion}`);
info("TARGET VERSION", `v${targetVersion}`);

// run tests before release
console.log();
info("Testing...");
scope(() => {
  if (skipTests) log(`(skipped)`);
  else run("yarn test");
});

// update all package versions and inter-dependencies
console.log();
info("Updating version...");
scope(() => {
  updateVersions(targetVersion);
});

// build all packages with types
console.log();
info("Building...");
scope(() => {
  if (skipBuild) log(`(skipped)`);
  else run("yarn build");
});

// generate changelog
console.log();
info("Generating Changelog...");
scope(() => {
  run("yarn changelog");
});

// committing changes
console.log();
info("Committing...");
scope(() => {
  run("git add .");
  run(`git commit -m "chore(release): v${targetVersion}"`);
});

// publish to npm
console.log();
info("Publishing...");
scope(() => {
  publishPackages(targetVersion);
});

// push to GitHub
console.log();
info("Pushing...");
scope(() => {
  run(`git tag v${targetVersion}`);
  run(`git push origin refs/tags/v${targetVersion}`);
  run(`git push`);
});

if (!isDryRun) success("\nSuccess released!");

function updateVersions(version) {
  // 1. update root package.json
  updatePackage(resolve(dirname(), ".."), version);
  // 2. update all packages
  packages.forEach(p => updatePackage(resolve(dirname(), "../packages", p), version));
}

function updatePackage(pkgRoot, version) {
  const pkgPath = resolve(pkgRoot, "package.json");
  const pkg = readJSON(pkgPath);
  log(`${pkg.name}@${pkg.version} -> ${pkg.name}@${version}`);
  scope(() => {
    pkg.version = version;
    updateDeps(pkg, "dependencies", version);
    updateDeps(pkg, "peerDependencies", version);
    if (!isDryRun) writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  });
}

function updateDeps(pkg, depType, version) {
  const deps = pkg[depType];
  if (!deps) return;
  Object.keys(deps).forEach(dep => {
    if (
      dep === "typed-macro" ||
      (dep.startsWith("@typed-macro") && packages.includes(dep.replace(/^@typed-macro\//, "")))
    ) {
      log(`${pkg.name} -> ${depType} -> ${dep}@${version}`);
      deps[dep] = version;
    }
  });
}

function publishPackages(version) {
  packages.forEach(p => publishPackage(resolve(dirname(), "../packages", p), version));
}

function publishPackage(pkgRoot, version) {
  const pkgPath = resolve(pkgRoot, "package.json");
  const pkg = readJSON(pkgPath);
  if (pkg.private) return;

  const releaseTag =
    version.includes("alpha")
      ? "alpha"
      : version.includes("beta")
        ? "beta"
        : version.includes("rc")
          ? "rc"
          : null;

  log(pkg.name);
  scope(() => {
    const result = run(
      `yarn publish --new-version ${version} --access public` + (releaseTag ? ` --tag ${releaseTag}` : ""),
      { cwd: pkgRoot, fatal: false }
    );
    if (!isDryRun)
      if (result.code) {
        if (result.stderr.match(/previously published/)) error("already published");
        else error(result.stderr);
      }
  });
}