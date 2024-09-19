// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import {
  Account,
  AccountAddress,
  AccountAuthenticator,
  AccountAuthenticatorEd25519,
  buildTransaction,
  deriveTransactionType,
  Deserializer,
  EntryFunctionABI,
  FeePayerRawTransaction,
  generateRawTransaction,
  generateSignedTransaction,
  generateSignedTransactionForSimulation,
  generateTransactionPayload,
  generateTransactionPayloadWithABI,
  generateUserTransactionHash,
  KeylessPublicKey,
  MultiAgentRawTransaction,
  parseTypeTag,
  RawTransaction,
  SignedTransaction,
  TransactionPayloadEntryFunction,
  TransactionPayloadMultiSig,
  TransactionPayloadScript,
  U64,
} from "../../../src";
import { FUND_AMOUNT, longTestTimeout } from "../../unit/helper";
import { getAptosClient } from "../helper";
import {
  EPHEMERAL_KEY_PAIR,
  fundAccounts,
  multiSignerScriptBytecode,
  publishTransferPackage,
  TYPED_SCRIPT_TEST,
} from "./helper";

const { aptos, config } = getAptosClient();

/* eslint-disable max-len */
describe("transaction builder", () => {
  // TODO: The example function deployed here has all the arguments backwards from normal transfers, we should fix that
  const contractPublisherAccount = Account.generate();
  beforeAll(async () => {
    await fundAccounts(aptos, [contractPublisherAccount]);
    await publishTransferPackage(aptos, contractPublisherAccount);
  }, longTestTimeout);
  describe("generate transaction payload", () => {
    test("it generates a script transaction payload", async () => {
      const payload = await generateTransactionPayload({
        bytecode: multiSignerScriptBytecode,
        functionArguments: [
          new U64(100),
          new U64(200),
          Account.generate().accountAddress,
          Account.generate().accountAddress,
          new U64(50),
        ],
      });
      expect(payload instanceof TransactionPayloadScript).toBeTruthy();
    });
    test("it generates a multi sig transaction payload", async () => {
      const payload = await generateTransactionPayload({
        aptosConfig: config,
        multisigAddress: Account.generate().accountAddress,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [200, "0x1"],
      });
      expect(payload instanceof TransactionPayloadMultiSig).toBeTruthy();
    });
    test("it generates an entry function transaction payload", async () => {
      const payload = await generateTransactionPayload({
        aptosConfig: config,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [200, "0x1"],
      });
      expect(payload instanceof TransactionPayloadEntryFunction).toBeTruthy();
    });
    test("it generates an entry function transaction payload with encoded inputs", async () => {
      const payload = await generateTransactionPayload({
        aptosConfig: config,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [100, AccountAddress.ONE],
      });
      expect(payload instanceof TransactionPayloadEntryFunction).toBeTruthy();
    });
    test("it generates an entry function transaction payload with mixed arguments", async () => {
      const payload = await generateTransactionPayload({
        aptosConfig: config,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: ["0x2", AccountAddress.ONE],
      });
      expect(payload instanceof TransactionPayloadEntryFunction).toBeTruthy();
      const payload2 = await generateTransactionPayload({
        aptosConfig: config,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [10, "0x1"],
      });
      expect(payload2 instanceof TransactionPayloadEntryFunction).toBeTruthy();
    });
  });
  describe("generate transaction payload with preset ABI", () => {
    const functionAbi: EntryFunctionABI = {
      typeParameters: [],
      parameters: [parseTypeTag("address"), parseTypeTag("0x1::object::Object<T0>", { allowGenerics: true })],
    };

    test("it generates a multi sig transaction payload", async () => {
      const payload = generateTransactionPayloadWithABI({
        multisigAddress: Account.generate().accountAddress,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: ["0x1", "0x1"],
        abi: functionAbi,
      });
      expect(payload instanceof TransactionPayloadMultiSig).toBeTruthy();
    });
    test("it generates an entry function transaction payload", async () => {
      const payload = generateTransactionPayloadWithABI({
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: ["0x1", "0x1"],
        abi: functionAbi,
      });
      expect(payload instanceof TransactionPayloadEntryFunction).toBeTruthy();
    });
    test("it generates an entry function transaction payload with mixed arguments", async () => {
      const payload = generateTransactionPayloadWithABI({
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [AccountAddress.ONE, "0x1"],
        abi: functionAbi,
      });
      expect(payload instanceof TransactionPayloadEntryFunction).toBeTruthy();
      const payload2 = generateTransactionPayloadWithABI({
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: ["0x1", AccountAddress.ONE],
        abi: functionAbi,
      });
      expect(payload2 instanceof TransactionPayloadEntryFunction).toBeTruthy();
    });
  });
  describe("generate raw transaction", () => {
    test("it generates a raw transaction with script payload", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const payload = await generateTransactionPayload({
        bytecode: multiSignerScriptBytecode,
        functionArguments: [
          new U64(100),
          new U64(200),
          Account.generate().accountAddress,
          Account.generate().accountAddress,
          new U64(50),
        ],
      });
      const rawTxn = await generateRawTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
      });
      expect(rawTxn instanceof RawTransaction).toBeTruthy();
      expect(rawTxn.payload instanceof TransactionPayloadScript).toBeTruthy();
    });

    test("it generates a raw transaction with script payload and string type arguments", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const payload = await generateTransactionPayload({
        bytecode: TYPED_SCRIPT_TEST,
        typeArguments: ["0x1::aptos_coin::AptosCoin"],
        functionArguments: [Account.generate().accountAddress, new U64(50)],
      });
      const rawTxn = await generateRawTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
      });
      expect(rawTxn instanceof RawTransaction).toBeTruthy();
      expect(rawTxn.payload instanceof TransactionPayloadScript).toBeTruthy();
    });

    test("it generates a raw transaction with script payload and typed type arguments", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const payload = await generateTransactionPayload({
        bytecode: TYPED_SCRIPT_TEST,
        typeArguments: [parseTypeTag("0x1::aptos_coin::AptosCoin")],
        functionArguments: [Account.generate().accountAddress, new U64(50)],
      });
      const rawTxn = await generateRawTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
      });
      expect(rawTxn instanceof RawTransaction).toBeTruthy();
      expect(rawTxn.payload instanceof TransactionPayloadScript).toBeTruthy();
    });

    test("it generates a raw transaction with a multi sig payload", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const bob = Account.generate();
      const payload = await generateTransactionPayload({
        aptosConfig: config,
        multisigAddress: bob.accountAddress,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [1, bob.accountAddress],
      });
      const rawTxn = await generateRawTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
      });
      expect(rawTxn instanceof RawTransaction).toBeTruthy();
      expect(rawTxn.payload instanceof TransactionPayloadMultiSig).toBeTruthy();
    });

    test("it generates a raw transaction with an entry function payload", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const bob = Account.generate();
      const payload = await generateTransactionPayload({
        aptosConfig: config,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [1, bob.accountAddress],
      });
      const rawTxn = await generateRawTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
      });
      expect(rawTxn instanceof RawTransaction).toBeTruthy();
      expect(rawTxn.payload instanceof TransactionPayloadEntryFunction).toBeTruthy();
    });

    test("it uses the correct max gas amount value", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const bob = Account.generate();
      const payload = await generateTransactionPayload({
        aptosConfig: config,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [1, bob.accountAddress],
      });
      const rawTxnWithCustomMaxGasAmount = await generateRawTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
        options: { maxGasAmount: 20 },
      });
      expect(rawTxnWithCustomMaxGasAmount.max_gas_amount).toBe(20n);

      const rawTxnWithDefaultMaxGasAmount = await generateRawTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
      });
      expect(rawTxnWithDefaultMaxGasAmount.max_gas_amount).toBe(200000n);
    });

    test("it generates a raw transaction with account not on chain and account sequence number set to 0", async () => {
      const alice = Account.generate();
      const bob = Account.generate();
      const payload = await generateTransactionPayload({
        aptosConfig: config,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [1, bob.accountAddress],
      });
      const rawTransaction = await generateRawTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
        options: { accountSequenceNumber: 0 },
      });
      expect(rawTransaction.sequence_number).toBe(0n);
      expect(() =>
        generateRawTransaction({
          aptosConfig: config,
          sender: alice.accountAddress,
          payload,
        }),
      ).rejects.toThrow();
    });
  });
  describe("generate transaction", () => {
    test("it returns a serialized raw transaction", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({
        accountAddress: alice.accountAddress,
        amount: FUND_AMOUNT,
        options: { waitForIndexer: true },
      });
      const payload = await generateTransactionPayload({
        bytecode: multiSignerScriptBytecode,
        functionArguments: [
          new U64(100),
          new U64(200),
          Account.generate().accountAddress,
          Account.generate().accountAddress,
          new U64(50),
        ],
      });
      const transaction = await buildTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
      });
      expect(transaction.rawTransaction instanceof RawTransaction).toBeTruthy();
    });

    test("it returns a serialized raw transaction and secondary signers addresses", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const bob = Account.generate();
      const payload = await generateTransactionPayload({
        aptosConfig: config,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [1, bob.accountAddress],
      });
      const secondarySignerAddress = Account.generate();
      const transaction = await buildTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
        secondarySignerAddresses: [secondarySignerAddress.accountAddress],
      });
      expect(transaction.rawTransaction instanceof RawTransaction).toBeTruthy();
      expect(transaction.secondarySignerAddresses).not.toBeUndefined();
      expect(transaction.secondarySignerAddresses?.length).toBe(1);
      expect(transaction.secondarySignerAddresses![0].data).toStrictEqual(
        secondarySignerAddress.accountAddress.toUint8Array(),
      );
    });

    test("it returns a serialized raw transaction and a fee payer address", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const bob = Account.generate();
      const payload = await generateTransactionPayload({
        aptosConfig: config,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [1, bob.accountAddress],
      });
      const feePayer = Account.generate();
      const transaction = await buildTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
        feePayerAddress: feePayer.accountAddress,
      });
      expect(transaction.rawTransaction instanceof RawTransaction).toBeTruthy();
      expect(transaction.secondarySignerAddresses).toBe(undefined);
      expect(transaction.feePayerAddress).not.toBeUndefined();
      expect(transaction.feePayerAddress?.data).toStrictEqual(feePayer.accountAddress.toUint8Array());
    });

    test(
      "it returns a serialized raw transaction, secondary signers addresses and a fee payer address",
      async () => {
        const alice = Account.generate();
        await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
        const bob = Account.generate();
        const payload = await generateTransactionPayload({
          aptosConfig: config,
          function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
          functionArguments: [1, bob.accountAddress],
        });
        const feePayer = Account.generate();
        const secondarySignerAddress = Account.generate();
        const transaction = await buildTransaction({
          aptosConfig: config,
          sender: alice.accountAddress,
          payload,
          secondarySignerAddresses: [secondarySignerAddress.accountAddress],
          feePayerAddress: feePayer.accountAddress,
        });
        expect(transaction.rawTransaction instanceof RawTransaction).toBeTruthy();
        expect(transaction.secondarySignerAddresses).not.toBeUndefined();
        expect(transaction.secondarySignerAddresses?.length).toBe(1);
        expect(transaction.secondarySignerAddresses![0].data).toStrictEqual(
          secondarySignerAddress.accountAddress.toUint8Array(),
        );
        expect(transaction.feePayerAddress).not.toBeUndefined();
        expect(transaction.feePayerAddress?.data).toStrictEqual(feePayer.accountAddress.toUint8Array());
      },
      longTestTimeout,
    );
  });
  describe("generateSignedTransactionForSimulation", () => {
    test("it generates a signed raw transaction for simulation", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const payload = await generateTransactionPayload({
        bytecode: multiSignerScriptBytecode,
        functionArguments: [
          new U64(100),
          new U64(200),
          Account.generate().accountAddress,
          Account.generate().accountAddress,
          new U64(50),
        ],
      });
      const transaction = await buildTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
      });

      const bcsTransaction = await generateSignedTransactionForSimulation({
        transaction,
        signerPublicKey: alice.publicKey,
      });
      expect(bcsTransaction instanceof Uint8Array).toBeTruthy();
      const deserializer = new Deserializer(bcsTransaction);
      const signedTransaction = SignedTransaction.deserialize(deserializer);
      expect(signedTransaction instanceof SignedTransaction).toBeTruthy();
    });

    test("it generates a keyless signed raw transaction for simulation", async () => {
      const jwt =
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3QtcnNhIn0.eyJpc3MiOiJ0ZXN0Lm9pZGMucHJvdmlkZXIiLCJhdWQiOiJ0ZXN0LWtleWxlc3MtZGFwcCIsInN1YiI6InRlc3QtdXNlci0xMDAwIiwiZW1haWwiOiJ0ZXN0QGFwdG9zbGFicy5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaWF0IjoxNzI1NDc1MTEyLCJleHAiOjI3MDAwMDAwMDAsIm5vbmNlIjoiNzA5NTI0MjMzMzk2NDQ1NzI2NzkzNDcyMzc2ODA4MDMwMzMyNDQ2MjgyMTE5MTc1NjQwOTQ1MDA5OTUxOTc4MTA1MTkxMDE4NzExOCJ9.vNtz77nUUq_E0LEKqqpPEkF6LTTNk9UomfPlfbQ41-RjSxTHU9ht1df1PFrCMzO_4k0fo8JZt7P5e4qvmxQjZlA66wO9e9L0j29UlL8ZKSkZko_VLGh3hvUXL1dMviQEe4MrXR515b-m4krAPRP6n6bagksFnooA9pPOXW5WTIsjgRfQefLP9VDyxJ1Br0pAGq9LYkrXWGDegjiv35MYr6PM3ao7yq7x-wAvF3wIqjTxnmuaAln5itThuKG8kQ1IsbOJP1G_EyyHszH6Xd7TXPwbcFLBqs-az1zjvTSA1YlsdgbT2m5dTt8YaThm5ZX6cmlOHVvhfSM-CZlAWy5JOg";
      const ephemeralKeyPair = EPHEMERAL_KEY_PAIR;
      const pepper = await aptos.getPepper({ jwt, ephemeralKeyPair });
      const publicKey = KeylessPublicKey.fromJwtAndPepper({ jwt, pepper });
      const accountAddress = publicKey.authKey().derivedAddress();
      await aptos.fundAccount({ accountAddress, amount: FUND_AMOUNT });
      const payload = await generateTransactionPayload({
        bytecode: multiSignerScriptBytecode,
        functionArguments: [
          new U64(100),
          new U64(200),
          Account.generate().accountAddress,
          Account.generate().accountAddress,
          new U64(50),
        ],
      });
      const transaction = await buildTransaction({
        aptosConfig: config,
        sender: accountAddress,
        payload,
      });

      const bcsTransaction = await generateSignedTransactionForSimulation({
        transaction,
        signerPublicKey: publicKey,
      });
      expect(bcsTransaction instanceof Uint8Array).toBeTruthy();
      const deserializer = new Deserializer(bcsTransaction);
      const signedTransaction = SignedTransaction.deserialize(deserializer);
      expect(signedTransaction instanceof SignedTransaction).toBeTruthy();
    });
  });
  describe("sign", () => {
    test("it signs a raw transaction", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const payload = await generateTransactionPayload({
        bytecode: multiSignerScriptBytecode,
        functionArguments: [
          new U64(100),
          new U64(200),
          Account.generate().accountAddress,
          Account.generate().accountAddress,
          new U64(50),
        ],
      });
      const transaction = await buildTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
      });
      const senderAuthenticator = alice.signTransactionWithAuthenticator(transaction);
      expect(senderAuthenticator instanceof AccountAuthenticator).toBeTruthy();
      const deserializer = new Deserializer(senderAuthenticator.bcsToBytes());
      const authenticator = AccountAuthenticator.deserialize(deserializer);
      expect(authenticator instanceof AccountAuthenticatorEd25519).toBeTruthy();
    });

    test("it signs a fee payer transaction", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const bob = Account.generate();
      const payload = await generateTransactionPayload({
        aptosConfig: config,
        multisigAddress: bob.accountAddress,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [1, bob.accountAddress],
      });
      const transaction = await buildTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
        feePayerAddress: Account.generate().accountAddress,
      });
      const senderAuthenticator = alice.signTransactionWithAuthenticator(transaction);
      expect(senderAuthenticator instanceof AccountAuthenticator).toBeTruthy();
      const deserializer = new Deserializer(senderAuthenticator.bcsToBytes());
      const authenticator = AccountAuthenticator.deserialize(deserializer);
      expect(authenticator instanceof AccountAuthenticatorEd25519).toBeTruthy();
    });

    test("it signs a multi agent transaction", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const bob = Account.generate();
      const payload = await generateTransactionPayload({
        bytecode: multiSignerScriptBytecode,
        functionArguments: [
          new U64(100),
          new U64(200),
          Account.generate().accountAddress,
          Account.generate().accountAddress,
          new U64(50),
        ],
      });
      const transaction = await buildTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
        secondarySignerAddresses: [bob.accountAddress],
      });
      const senderAuthenticator = alice.signTransactionWithAuthenticator(transaction);
      expect(senderAuthenticator instanceof AccountAuthenticator).toBeTruthy();
      const deserializer = new Deserializer(senderAuthenticator.bcsToBytes());
      const authenticator = AccountAuthenticator.deserialize(deserializer);
      expect(authenticator instanceof AccountAuthenticatorEd25519).toBeTruthy();
    });
  });
  describe("generateSignedTransaction", () => {
    test("it generates a single signer signed transaction", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const payload = await generateTransactionPayload({
        bytecode: multiSignerScriptBytecode,
        functionArguments: [
          new U64(100),
          new U64(200),
          Account.generate().accountAddress,
          Account.generate().accountAddress,
          new U64(50),
        ],
      });
      const transaction = await buildTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
      });
      const senderAuthenticator = alice.signTransactionWithAuthenticator(transaction);
      const bcsTransaction = await generateSignedTransaction({
        transaction,
        senderAuthenticator,
      });
      expect(bcsTransaction instanceof Uint8Array).toBeTruthy();
      const deserializer = new Deserializer(bcsTransaction);
      const signedTransaction = SignedTransaction.deserialize(deserializer);
      expect(signedTransaction instanceof SignedTransaction).toBeTruthy();
    });

    test("it generates a multi agent signed transaction", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const bob = await Account.generate();
      const payload = await generateTransactionPayload({
        aptosConfig: config,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [1, bob.accountAddress],
      });
      const transaction = await buildTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
        secondarySignerAddresses: [bob.accountAddress],
      });
      const authenticator = alice.signTransactionWithAuthenticator(transaction);
      const secondaryAuthenticator = bob.signTransactionWithAuthenticator(transaction);
      const bcsTransaction = await generateSignedTransaction({
        transaction,
        senderAuthenticator: authenticator,
        additionalSignersAuthenticators: [secondaryAuthenticator],
      });
      expect(bcsTransaction instanceof Uint8Array).toBeTruthy();
      const deserializer = new Deserializer(bcsTransaction);
      const signedTransaction = SignedTransaction.deserialize(deserializer);
      expect(signedTransaction instanceof SignedTransaction).toBeTruthy();
    });

    test("it generates a fee payer signed transaction", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const bob = Account.generate();
      const payload = await generateTransactionPayload({
        aptosConfig: config,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [1, bob.accountAddress],
      });
      const transaction = await buildTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
        feePayerAddress: bob.accountAddress,
      });
      const senderAuthenticator = alice.signTransactionWithAuthenticator(transaction);
      const feePayerAuthenticator = bob.signTransactionWithAuthenticator(transaction);
      const bcsTransaction = await generateSignedTransaction({
        transaction,
        senderAuthenticator,
        feePayerAuthenticator,
      });
      expect(bcsTransaction instanceof Uint8Array).toBeTruthy();
      const deserializer = new Deserializer(bcsTransaction);
      const signedTransaction = SignedTransaction.deserialize(deserializer);
      expect(signedTransaction instanceof SignedTransaction).toBeTruthy();
    });
  });

  describe("generateUserTransactionHash", () => {
    test("it generates a single signer signed transaction hash", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const transaction = await aptos.coin.transferCoinTransaction({
        sender: alice.accountAddress,
        recipient: "0x1",
        amount: 1,
      });

      const senderAuthenticator = alice.signTransactionWithAuthenticator(transaction);

      // Generate hash
      const signedTxnInput = {
        transaction,
        senderAuthenticator,
      };
      const transactionHash = generateUserTransactionHash(signedTxnInput);

      // Submit transaction
      const submitted = await aptos.transaction.submit.simple(signedTxnInput);

      expect(submitted.hash).toBe(transactionHash);
    });

    test("it generates a multi agent signed transaction", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const bob = await Account.generate();
      await aptos.fundAccount({ accountAddress: bob.accountAddress, amount: 1 });
      const payload = await generateTransactionPayload({
        aptosConfig: config,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [1, bob.accountAddress],
      });
      const transaction = await buildTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
        secondarySignerAddresses: [bob.accountAddress],
      });
      const senderAuthenticator = alice.signTransactionWithAuthenticator(transaction);
      const secondaryAuthenticator = bob.signTransactionWithAuthenticator(transaction);
      // Generate hash
      const signedTxnInput = {
        transaction,
        senderAuthenticator,
        additionalSignersAuthenticators: [secondaryAuthenticator],
      };
      const transactionHash = generateUserTransactionHash(signedTxnInput);

      // Submit transaction
      const submitted = await aptos.transaction.submit.multiAgent(signedTxnInput);
      expect(submitted.hash).toBe(transactionHash);
    });

    test("it generates a fee payer signed transaction", async () => {
      const alice = Account.generate();
      const bob = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const transaction = await aptos.transaction.build.simple({
        sender: bob.accountAddress,
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: ["0x1", 1],
        },
        withFeePayer: true,
      });

      // Bob signs without knowing the fee payer
      const senderAuthenticator = bob.signTransactionWithAuthenticator(transaction);
      // Alice signs after putting themselves in as fee payer
      transaction.feePayerAddress = alice.accountAddress;
      const feePayerAuthenticator = alice.signTransactionWithAuthenticator(transaction);

      // Generate hash
      const signedTxnInput = {
        transaction,
        senderAuthenticator,
        feePayerAuthenticator,
      };
      const transactionHash = generateUserTransactionHash(signedTxnInput);

      // Submit transaction
      const submitted = await aptos.transaction.submit.simple(signedTxnInput);

      expect(submitted.hash).toBe(transactionHash);
    });
  });
  describe("deriveTransactionType", () => {
    test("it derives the transaction type as a RawTransaction", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const bob = Account.generate();
      const payload = await generateTransactionPayload({
        aptosConfig: config,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [1, bob.accountAddress],
      });
      const transaction = await buildTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
      });
      const transactionType = deriveTransactionType(transaction);
      expect(transactionType instanceof RawTransaction).toBeTruthy();
    });

    test("it derives the transaction type as a FeePayerRawTransaction", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const bob = Account.generate();
      const payload = await generateTransactionPayload({
        aptosConfig: config,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [1, bob.accountAddress],
      });
      const transaction = await buildTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
        feePayerAddress: Account.generate().accountAddress,
      });

      const transactionType = deriveTransactionType(transaction);
      expect(transactionType instanceof FeePayerRawTransaction).toBeTruthy();
    });

    test("it derives the transaction type as a MultiAgentRawTransaction", async () => {
      const alice = Account.generate();
      await aptos.fundAccount({ accountAddress: alice.accountAddress, amount: FUND_AMOUNT });
      const bob = Account.generate();
      const payload = await generateTransactionPayload({
        aptosConfig: config,
        function: `${contractPublisherAccount.accountAddress}::transfer::transfer`,
        functionArguments: [1, bob.accountAddress],
      });
      const transaction = await buildTransaction({
        aptosConfig: config,
        sender: alice.accountAddress,
        payload,
        secondarySignerAddresses: [Account.generate().accountAddress],
      });
      const transactionType = deriveTransactionType(transaction);
      expect(transactionType instanceof MultiAgentRawTransaction).toBeTruthy();
    });
  });
});
