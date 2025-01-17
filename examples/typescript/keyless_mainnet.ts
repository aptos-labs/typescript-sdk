/* eslint-disable max-len */
/* eslint-disable no-console */

/**
 * This example shows how to use the Keyless accounts on Aptos
 */

import { AccountAddress, Aptos, AptosConfig, EphemeralKeyPair, Network } from "@aptos-labs/ts-sdk";
import * as readlineSync from "readline-sync";

const TRANSFER_AMOUNT = 10; // octas
const MAX_GAS_UNITS = 200; // gas units
const GAS_UNIT_PRICE = 100; // octas / gas unit

/**
 * Prints the balance of an account
 * @param aptos
 * @param address
 * @returns {Promise<*>}
 *
 */
const balance = async (aptos: Aptos, address: AccountAddress): Promise<any> =>
  aptos.getAccountAPTAmount({
    accountAddress: address,
  });

const example = async () => {
  // Set up the client
  const config = new AptosConfig({ network: Network.MAINNET });
  const aptos = new Aptos(config);

  // Generate the ephemeral (temporary) key pair that will be used to sign transactions.
  const aliceEphem = EphemeralKeyPair.generate();

  console.log("\n=== Keyless Account Example (Mainnet) ===\n");

  const link = `https://accounts.google.com/o/oauth2/v2/auth/oauthchooseaccount?redirect_uri=https%3A%2F%2Fdevelopers.google.com%2Foauthplayground&prompt=consent&response_type=code&client_id=407408718192.apps.googleusercontent.com&scope=openid&access_type=offline&service=lso&o2v=2&theme=glif&flowName=GeneralOAuthFlow&nonce=${aliceEphem.nonce}`;
  console.log(`${link}\n`);

  console.log("1. Open the link above");
  console.log("2. Log in with your Google account");
  console.log("3. Click 'Exchange authorization code for tokens");
  console.log("4. Copy the 'id_token' - (toggling 'Wrap lines' option at the bottom makes this easier)\n");

  function inputJwt(): string {
    return readlineSync.question("Paste the JWT (id_token) token here and press enter: ", {
      hideEchoBack: false,
    });
  }

  const jwt = inputJwt();
  // Derive the Keyless Account from the JWT and ephemeral key pair.
  const alice = await aptos.deriveKeylessAccount({
    jwt,
    ephemeralKeyPair: aliceEphem,
  });

  console.log("=== Addresses ===\n");
  console.log(`Alice's keyless account address is: ${alice.accountAddress}`);
  console.log(`Alice's nonce is: ${aliceEphem.nonce}`);
  console.log(`Alice's ephemeral public key is: ${aliceEphem.getPublicKey().toString()}`);

  // Example:
  // Funded 0x3e42a237d4e6a504d1ce00fb12446be69cff8910e9e226e892558c094353c7dd with 0.03 APT and balance was 3,000,000
  // After the transfer(-to-self) of 10 octas with max gas 200 (gas units), the balance was 2,996,000 because TXN took 40 gas units of 100 octas each => 4,000 octas
  // https://explorer.aptoslabs.com/txn/0x52f6f117baa09b4afd50e3a1a77e89191a07bbf96ba7402211330eb510c62e72/userTxnOverview?network=mainnet
  let aliceBalance = await balance(aptos, alice.accountAddress);
  const minBalance = MAX_GAS_UNITS * GAS_UNIT_PRICE + TRANSFER_AMOUNT;
  while (aliceBalance < minBalance) {
    console.log("\n=== Fund the account ===\n");
    console.log(`Address: ${alice.accountAddress}\n`);
    console.log(
      `The account either does not exist or needs more than ${minBalance} octas balance. Fund the account to proceed.\n`,
    );
    console.log("Press ENTER once funded...");
    readlineSync.question("");

    try {
      console.log("Refetching balance...\n");
      // eslint-disable-next-line no-await-in-loop
      aliceBalance = await balance(aptos, alice.accountAddress);
    } catch (error) {
      console.log(`Error fetching balance: ${error}\n`);
    }
  }
  console.log("\n=== Balances ===\n");
  console.log(`Alice's balance is: ${aliceBalance}`);

  // Transfer to yourself to not waste APT
  const transaction = await aptos.transferCoinTransaction({
    sender: alice.accountAddress,
    recipient: alice.accountAddress,
    amount: TRANSFER_AMOUNT,
    options: {
      maxGasAmount: MAX_GAS_UNITS,
      gasUnitPrice: GAS_UNIT_PRICE,
    },
  });

  const committedTxn = await aptos.signAndSubmitTransaction({ signer: alice, transaction });

  await aptos.waitForTransaction({ transactionHash: committedTxn.hash });
  console.log(`Committed transaction: ${committedTxn.hash}`);

  console.log("\n=== Balances after transfer ===\n");
  const newAliceBalance = await balance(aptos, alice.accountAddress);
  console.log(`Alice's balance is: ${newAliceBalance}`);
  // Alice should have the remainder minus gas
  if (TRANSFER_AMOUNT >= aliceBalance - newAliceBalance) throw new Error("Alice's balance after transfer is incorrect");
};

example();
