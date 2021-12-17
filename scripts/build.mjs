// [packages...] [--formats cjs,esm]

import $ from "shelljs";
import minimist from "minimist";
import { log, info, error, success, getPackages, scope, readJSON } from "./utils.mjs";
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";
import { existsSync } from "fs";

/**
 * Available Inputs
 */
const availableTargets = getPackages();

const availableFormats = ["cjs", "esm"];

/**
 * Parse Arguments
 */
const args = minimist(process.argv.slice(2));

const targets = args._.length
  ? args._.filter(t => availableTargets.includes(t))
  : availableTargets;

info("Targets", targets.join(" "));

const formats =  ((args.formats || args.f)?.split(' ') || ["cjs", "esm"])
  .filter(f => availableFormats.includes(f));

info("Formats", formats.join(" "));

/**
 * Start Build
 */
console.log();
info("Building");
const errorPackages = [];
scope(() => {
  targets.forEach(target => {
    log(target);
    scope(() => {
      try {
        const packageDir = `packages/${target}`;
        build(packageDir, formats);
      } catch (e) {
        errorPackages.push(target);
        error(e.message);
      }
    });
  });
});

if (errorPackages.length === 0) success("Build successfully");
else error(`Failed packages: ${errorPackages.join(" ")}`);

function build(packageDir, formats) {
  log(`rm -rf ${packageDir}/dist`);
  $.rm("-rf", `${packageDir}/dist`);
  const pkg = readJSON(`../${packageDir}/package.json`)

  const cmd = pkg?.scripts?.build || `yarn tsup src/index.ts --dts --format "${formats.join(",")}"`;
  log(`cd ${packageDir} && ${cmd}`);
  const result = $.exec(cmd, { silent: true, cwd: packageDir });
  if (result.code) throw new Error(result.stderr);

  const apiExtractorPath = `${packageDir}/api-extractor.json`;
  if (!existsSync(apiExtractorPath)) {
    log("api-extractor (skip)");
    return;
  }
  log("api-extractor");
  const extractorConfig = ExtractorConfig.loadFileAndPrepare(apiExtractorPath);
  const extractorResult = Extractor.invoke(extractorConfig, {
    localBuild: true,
    showDiagnostics: false,
  });
  if (!extractorResult.succeeded)
    throw new Error(
      `api-extractor completed with ${extractorResult.errorCount} errors` +
      ` and ${extractorResult.warningCount} warnings`
    );
}