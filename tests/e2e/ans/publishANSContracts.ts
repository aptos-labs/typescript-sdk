import { execSync } from "child_process";
import "dotenv";
import { AccountAddress, Aptos, Ed25519PrivateKey } from "../../../src";
import { LOCAL_ANS_ACCOUNT_PK } from "../../../src/internal/ans";
import { AptosApiType } from "../../../src/utils/const";

/**
 * TS SDK supports ANS. Since ANS contract is not part of aptos-framework
 * we need to get the ANS contract, publish it to local testnet and test against it.
 * This script clones the aptos-names-contracts repo {@link https://github.com/aptos-labs/aptos-names-contracts},
 * uses a pre created account address and private key to fund that account and
 * then publish the contract under that account.
 * After the contract is published, we delete the cloned repo folder.
 *
 * This script runs when testing locally and on CI (as part of sdk-release.yaml) using `pnpm test`.
 */

/* eslint-disable no-console */
/* eslint-disable max-len */

// ANS account we use to publish the contract
const ANS_TEST_ACCOUNT_PRIVATE_KEY =
  process.env.ANS_TEST_ACCOUNT_PRIVATE_KEY || "0x37368b46ce665362562c6d1d4ec01a08c8644c488690df5a17e13ba163e20221";
const ANS_TEST_ACCOUNT_ADDRESS =
  process.env.ANS_TEST_ACCOUNT_ADDRESS || "0x585fc9f0f0c54183b039ffc770ca282ebd87307916c215a3e692f2f8e4305e82";

function execCmdString(command: string): string {
  console.log(`Executing '${command}'`);
  return execSync(command, { encoding: "utf8" });
}
function execCmdBuffer(command: string): Buffer {
  console.log(`Executing '${command}'`);
  return execSync(command, { stdio: "inherit" });
}

export async function publishAnsContract(
  aptos: Aptos,
): Promise<{ address: AccountAddress; privateKey: Ed25519PrivateKey }> {
  const ret = {
    address: AccountAddress.fromStringRelaxed(ANS_TEST_ACCOUNT_ADDRESS),
    privateKey: new Ed25519PrivateKey(LOCAL_ANS_ACCOUNT_PK),
  };
  try {
    await aptos.account.getAccountModule({
      accountAddress: ANS_TEST_ACCOUNT_ADDRESS.toString(),
      moduleName: "domains",
    });
    console.log("ANS contract already published");
    // If it's already published, we'll skip
    return ret;
  } catch {
    // If it fails, we'll publish
  }

  try {
    // 0. Create a temporary directory to clone the repo into. Note: For this to work in
    // CI, it is essential that TMPDIR is set to a directory that can actually be mounted.
    // Learn more here: https://stackoverflow.com/a/76523941/3846032.
    console.log("---creating temporary directory for ANS code---");
    const tempDir = execSync("mktemp -d").toString("utf8").trim();

    // 1. Clone the ANS repo into the temporary directory.
    console.log(`---cloning ANS repository to ${tempDir}---`);
    execSync(`git clone https://github.com/aptos-labs/aptos-names-contracts.git ${tempDir}`);

    // If we're using a local CLI we just use the temp dir directly.
    console.log("---running CLI using local binary---");
    // The command we use to run the CLI.
    const cliInvocation = "aptos";
    // Where the CLI should look to find the ANS repo.
    const repoDir = tempDir;

    // Derive the router signer address.
    // TODO: We should derive this with the SDK
    const ROUTER_SIGNER = `0x${
      JSON.parse(
        execCmdString(
          `${cliInvocation} account derive-resource-account-address --address ${ANS_TEST_ACCOUNT_ADDRESS} --seed "ANS ROUTER" --seed-encoding utf8`,
        ),
      ).Result
    }`;
    console.log(`Resource account ${ROUTER_SIGNER}`);

    // 2. Fund ANS account.
    console.log("---funding account---");
    const fundHash = await aptos.fundAccount({
      accountAddress: ANS_TEST_ACCOUNT_ADDRESS.toString(),
      amount: 100_000_000_000,
    });
    await aptos.waitForTransaction({ transactionHash: fundHash });
    console.log(`Test account funded ${ANS_TEST_ACCOUNT_ADDRESS}`);

    // 3. Publish the ANS modules under the ANS account.
    console.log("---publishing ans modules---");
    const contracts = ["core", "core_v2", "router"];
    // eslint-disable-next-line no-restricted-syntax
    for (const contract of contracts) {
      execCmdBuffer(
        `${cliInvocation} move publish --package-dir ${repoDir}/${contract} --assume-yes --private-key=${ANS_TEST_ACCOUNT_PRIVATE_KEY} --named-addresses aptos_names=${ANS_TEST_ACCOUNT_ADDRESS},router=${ANS_TEST_ACCOUNT_ADDRESS},aptos_names_v2_1=${ANS_TEST_ACCOUNT_ADDRESS},aptos_names_admin=${ANS_TEST_ACCOUNT_ADDRESS},aptos_names_funds=${ANS_TEST_ACCOUNT_ADDRESS},router_signer=${ROUTER_SIGNER} --url=${aptos.config.getRequestUrl(
          AptosApiType.FULLNODE,
        )}`,
      );
    }
    console.log("---module published---");

    return ret;
  } catch (error: any) {
    throw new Error(`Failed to publish ANS contract ${JSON.stringify(error)}`);
  }
}
