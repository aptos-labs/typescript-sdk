/**
 * This example shows how to use the Aptos client to create accounts, fund them, and transfer between them.
 */

import {
  Account,
  AccountAddress,
  Aptos,
  AptosConfig,
  Network,
  SigningScheme,
  StructTag,
  TypeTagStruct,
  U64,
} from "aptos";

const APTOS_COIN = "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>";
const ALICE_INITIAL_BALANCE = 100_000_000;
const BOB_INITIAL_BALANCE = 100;
const TRANSFER_AMOUNT = 0;

/**
 * Prints the balance of an account
 * @param aptos
 * @param name
 * @param address
 * @returns {Promise<*>}
 *
 */
const balance = async (aptos: Aptos, name: string, address: AccountAddress) => {
  let resource = await aptos.getAccountResource({ accountAddress: address.toUint8Array(), resourceType: APTOS_COIN });
  let amount = Number((resource.data as { coin: { value: string } }).coin.value);

  console.log(`${name}'s balance is: ${amount}`);
  return amount;
};

const example = async () => {
  console.log("This example will create two accounts (Alice and Bob), fund them, and transfer between them.");

  // Setup the client
  const config = new AptosConfig({ network: Network.DEVNET });
  const aptos = new Aptos(config);

  // Create two accounts
  let alice = Account.generate({ scheme: SigningScheme.Ed25519 });
  let bob = Account.generate({ scheme: SigningScheme.Ed25519 });

  console.log("=== Addresses ===\n");
  console.log(`Alice's address is: ${alice.accountAddress.toString()}`);
  console.log(`Bob's address is: ${bob.accountAddress.toString()}`);

  // Fund the accounts
  console.log("\n=== Funding accounts ===\n");

  const aliceFundTxn = await aptos.faucet.fundAccount({
    accountAddress: alice.accountAddress.toUint8Array(),
    amount: ALICE_INITIAL_BALANCE,
  });
  console.log("Alice's fund transaction: ", aliceFundTxn);

  const bobFundTxn = await aptos.faucet.fundAccount({
    accountAddress: bob.accountAddress.toUint8Array(),
    amount: BOB_INITIAL_BALANCE,
  });
  console.log("Bob's fund transaction: ", bobFundTxn);

  // Show the balances
  console.log("\n=== Balances ===\n");
  let aliceBalance = await balance(aptos, "Alice", alice.accountAddress);
  let bobBalance = await balance(aptos, "Bob", bob.accountAddress);

  if (aliceBalance !== ALICE_INITIAL_BALANCE) throw new Error("Alice's balance is incorrect");
  if (bobBalance !== BOB_INITIAL_BALANCE) throw new Error("Bob's balance is incorrect");

  // Transfer between users
  const txn = await aptos.transactionSubmission.generateTransaction({
    sender: alice.accountAddress.toString(),
    data: {
      function: "0x1::coin::transfer",
      type_arguments: [new TypeTagStruct(StructTag.fromString("0x1::aptos_coin::AptosCoin"))],
      arguments: [AccountAddress.fromHexInput({ input: bob.accountAddress.toString() }), new U64(TRANSFER_AMOUNT)],
    },
  });

  console.log("\n=== Transfer transaction ===\n");
  let signature = aptos.transactionSubmission.signTransaction({ signer: alice, transaction: txn });
  const committedTxn = await aptos.transactionSubmission.submitTransaction({
    transaction: txn,
    senderAuthenticator: signature,
  });
  console.log(`Committed transaction: ${committedTxn.hash}`);

  console.log("\n=== Balances after transfer ===\n");
  let newAliceBalance = await balance(aptos, "Alice", alice.accountAddress);
  let newBobBalance = await balance(aptos, "Bob", bob.accountAddress);

  // Bob should have the transfer amount
  if (newBobBalance !== TRANSFER_AMOUNT + BOB_INITIAL_BALANCE)
    throw new Error("Bob's balance after transfer is incorrect");

  // Alice should have the remainder minus gas
  if (newAliceBalance < ALICE_INITIAL_BALANCE - TRANSFER_AMOUNT)
    throw new Error("Alice's balance after transfer is incorrect");
};

example();
