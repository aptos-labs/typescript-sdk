import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { AccountAddress } from "@aptos-labs/ts-sdk";

/* eslint-disable no-console */
/* eslint-disable max-len */

/**
 * A convenience function to compile a package locally with the CLI
 * @param packageDir
 * @param outputFile
 * @param namedAddresses
 */
export function compilePackage(
  packageDir: string,
  outputFile: string,
  namedAddresses: Array<{ name: string; address: AccountAddress }>,
  args?: string[],
) {
  console.log("In order to run compilation, you must have the `aptos` CLI installed.");
  try {
    execSync("aptos --version");
  } catch (e) {
    console.log("aptos is not installed. Please install it from the instructions on aptos.dev");
  }

  const addressArg = namedAddresses.map(({ name, address }) => `${name}=${address}`).join(" ");

  // Assume-yes automatically overwrites the previous compiled version, only do this if you are sure you want to overwrite the previous version.
  let compileCommand = `aptos move build-publish-payload --json-output-file ${outputFile} --package-dir ${packageDir} --named-addresses ${addressArg} --assume-yes`;
  if (args) compileCommand += ` ${args.join(" ")}`;

  console.log("Running the compilation locally, in a real situation you may want to compile this ahead of time.");
  console.log(compileCommand);
  execSync(compileCommand);
}

/**
 * A convenience function to get the compiled package metadataBytes and byteCode
 * @param filePath
 */
export function getPackageBytesToPublish(filePath: string) {
  // current working directory - the root folder of this repo
  const cwd = process.cwd();
  // target directory - current working directory + filePath (filePath json file is generated with the previous, compilePackage, cli command)
  const modulePath = path.join(cwd, filePath);

  const jsonData = JSON.parse(fs.readFileSync(modulePath, "utf8"));

  const metadataBytes = jsonData.args[0].value;
  const byteCode = jsonData.args[1].value;

  return { metadataBytes, byteCode };
}
