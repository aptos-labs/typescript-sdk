// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import {
  APTOS_COIN,
  Account,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
  SigningSchemeInput,
  U64,
  AccountAddress,
  SingleKeyAccount,
  Secp256k1PrivateKey,
} from "../../../src";
import { getAptosClient } from "../helper";

describe("account api", () => {
  const FUND_AMOUNT = 100_000_000;

  describe("fetch data", () => {
    test("it fetches account data", async () => {
      const { aptos } = getAptosClient();
      const data = await aptos.getAccountInfo({
        accountAddress: "0x1",
      });
      expect(data).toHaveProperty("sequence_number");
      expect(data.sequence_number).toBe("0");
      expect(data).toHaveProperty("authentication_key");
      expect(data.authentication_key).toBe("0x0000000000000000000000000000000000000000000000000000000000000001");
    });

    test("it fetches account modules", async () => {
      const config = new AptosConfig({ network: Network.LOCAL });
      const aptos = new Aptos(config);
      const data = await aptos.getAccountModules({
        accountAddress: "0x1",
      });
      expect(data.length).toBeGreaterThan(0);
    });

    test("it fetches an account module", async () => {
      const config = new AptosConfig({ network: Network.LOCAL });
      const aptos = new Aptos(config);
      const data = await aptos.getAccountModule({
        accountAddress: "0x1",
        moduleName: "coin",
      });
      expect(data).toHaveProperty("bytecode");
    });

    test("it fetches account resources", async () => {
      const config = new AptosConfig({ network: Network.LOCAL });
      const aptos = new Aptos(config);
      const data = await aptos.getAccountResources({
        accountAddress: "0x1",
      });
      expect(data.length).toBeGreaterThan(0);
    });

    test("it fetches an account resource without a type", async () => {
      const config = new AptosConfig({ network: Network.LOCAL });
      const aptos = new Aptos(config);
      const data = await aptos.getAccountResource({
        accountAddress: "0x1",
        resourceType: "0x1::account::Account",
      });
      expect(data).toHaveProperty("sequence_number");
      expect(data.sequence_number).toBe("0");
      expect(data).toHaveProperty("authentication_key");
      expect(data.authentication_key).toBe("0x0000000000000000000000000000000000000000000000000000000000000001");
    });

    test("it fetches an account resource typed", async () => {
      const config = new AptosConfig({ network: Network.LOCAL });
      const aptos = new Aptos(config);
      type AccountRes = {
        authentication_key: string;
        coin_register_events: {
          counter: string;
          guid: {
            id: {
              addr: string;
              creation_num: string;
            };
          };
        };
        guid_creation_num: string;
        key_rotation_events: {
          counter: string;
          guid: {
            id: {
              addr: string;
              creation_num: string;
            };
          };
        };
        sequence_number: string;
      };

      const resource = await aptos.getAccountResource<AccountRes>({
        accountAddress: "0x1",
        resourceType: "0x1::account::Account",
      });
      expect(resource).toHaveProperty("sequence_number");
      expect(resource.sequence_number).toBe("0");
      expect(resource).toHaveProperty("authentication_key");
      expect(resource.authentication_key).toBe("0x0000000000000000000000000000000000000000000000000000000000000001");
    });

    test("it fetches account transactions", async () => {
      const config = new AptosConfig({ network: Network.LOCAL });
      const aptos = new Aptos(config);
      const senderAccount = Account.generate();
      await aptos.fundAccount({
        accountAddress: senderAccount.accountAddress,
        amount: FUND_AMOUNT,
      });
      const bob = Account.generate();
      const rawTxn = await aptos.transaction.build.simple({
        sender: senderAccount.accountAddress,
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: [bob.accountAddress, new U64(10)],
        },
      });
      const authenticator = aptos.transaction.sign({
        signer: senderAccount,
        transaction: rawTxn,
      });
      const response = await aptos.transaction.submit.simple({
        transaction: rawTxn,
        senderAuthenticator: authenticator,
      });
      const txn = await aptos.waitForTransaction({ transactionHash: response.hash });
      const accountTransactions = await aptos.getAccountTransactions({
        accountAddress: senderAccount.accountAddress,
      });
      expect(accountTransactions[0]).toStrictEqual(txn);
    });

    test("it fetches account transactions count", async () => {
      const config = new AptosConfig({ network: Network.LOCAL });
      const aptos = new Aptos(config);
      const senderAccount = Account.generate();
      const response = await aptos.fundAccount({
        accountAddress: senderAccount.accountAddress,
        amount: FUND_AMOUNT,
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });
      const accountTransactionsCount = await aptos.getAccountTransactionsCount({
        accountAddress: senderAccount.accountAddress,
      });
      expect(accountTransactionsCount).toBe(1);
    });

    test("it fetches account coins data", async () => {
      const config = new AptosConfig({ network: Network.LOCAL });
      const aptos = new Aptos(config);
      const senderAccount = Account.generate();
      const fundTxn = await aptos.fundAccount({
        accountAddress: senderAccount.accountAddress,
        amount: FUND_AMOUNT,
      });

      await aptos.waitForTransaction({ transactionHash: fundTxn.hash });
      const accountCoinData = await aptos.getAccountCoinsData({
        accountAddress: senderAccount.accountAddress,
      });
      expect(accountCoinData[0].amount).toBe(FUND_AMOUNT);
      expect(accountCoinData[0].asset_type).toBe("0x1::aptos_coin::AptosCoin");
    });

    test("it fetches account coins count", async () => {
      const config = new AptosConfig({ network: Network.LOCAL });
      const aptos = new Aptos(config);
      const senderAccount = Account.generate();
      const fundTxn = await aptos.fundAccount({
        accountAddress: senderAccount.accountAddress,
        amount: FUND_AMOUNT,
      });

      await aptos.waitForTransaction({ transactionHash: fundTxn.hash });
      const accountCoinsCount = await aptos.getAccountCoinsCount({
        accountAddress: senderAccount.accountAddress,
      });
      expect(accountCoinsCount).toBe(1);
    });

    test("it fetches account's coin amount", async () => {
      const config = new AptosConfig({ network: Network.LOCAL });
      const aptos = new Aptos(config);
      const senderAccount = Account.generate();
      const fundTxn = await aptos.fundAccount({
        accountAddress: senderAccount.accountAddress,
        amount: FUND_AMOUNT,
      });

      await aptos.waitForTransaction({ transactionHash: fundTxn.hash });
      // custom coin type that doesn't exist, will throw an error
      const getInvalidCoinAmount = aptos.getAccountCoinAmount({
        accountAddress: senderAccount.accountAddress,
        coinType: "0x12345::coin::Coin",
        minimumLedgerVersion: BigInt(fundTxn.version),
      });
      await expect(getInvalidCoinAmount).rejects.toThrow();
      // custom coin type struct that does exist, but is not a coin, will return 0, similar to a coin that exists
      const getOtherCoinAmount = await aptos.getAccountCoinAmount({
        accountAddress: senderAccount.accountAddress,
        coinType: "0x1::string::String",
        minimumLedgerVersion: BigInt(fundTxn.version),
      });
      expect(getOtherCoinAmount).toBe(0);

      // APT Aptos coin
      const accountAPTAmount = await aptos.getAccountCoinAmount({
        accountAddress: senderAccount.accountAddress,
        coinType: APTOS_COIN,
        minimumLedgerVersion: BigInt(fundTxn.version),
      });
      expect(accountAPTAmount).toBe(100000000);

      // APT Aptos coin by fungible asset metadata
      const accountAPTAmount2 = await aptos.getAccountCoinAmount({
        accountAddress: senderAccount.accountAddress,
        faMetadataAddress: AccountAddress.A,
        minimumLedgerVersion: BigInt(fundTxn.version),
      });
      expect(accountAPTAmount2).toBe(100000000);
      // By both
      // APT Aptos coin by fungible asset metadata
      const accountAPTAmount3 = await aptos.getAccountCoinAmount({
        accountAddress: senderAccount.accountAddress,
        coinType: APTOS_COIN,
        faMetadataAddress: "0xA",
        minimumLedgerVersion: BigInt(fundTxn.version),
      });
      expect(accountAPTAmount3).toBe(100000000);
      // By neither
      const failForNoCoinTypeGiven = aptos.getAccountCoinAmount({
        accountAddress: senderAccount.accountAddress,
        minimumLedgerVersion: BigInt(fundTxn.version),
      });
      await expect(failForNoCoinTypeGiven).rejects.toThrow();
    });

    test("lookupOriginalAccountAddress - Look up account address before key rotation", async () => {
      const config = new AptosConfig({ network: Network.LOCAL });
      const aptos = new Aptos(config);
      const account = Account.generate();

      // Fund and create account on-chain
      await aptos.fundAccount({ accountAddress: account.accountAddress, amount: FUND_AMOUNT });

      const lookupAccount = await aptos.lookupOriginalAccountAddress({
        authenticationKey: account.accountAddress,
      });
      expect(lookupAccount).toStrictEqual(account.accountAddress);
    });

    test("it fetches account owned token from collection", async () => {
      const config = new AptosConfig({ network: Network.LOCAL });
      const aptos = new Aptos(config);
      const creator = Account.generate();
      await aptos.fundAccount({ accountAddress: creator.accountAddress, amount: FUND_AMOUNT });
      const collectionCreationTransaction = await aptos.createCollectionTransaction({
        creator,
        description: "My new collection!",
        name: "Test Collection",
        uri: "Test Collection",
      });
      const pendingCollectionCreationTransaction = await aptos.signAndSubmitTransaction({
        signer: creator,
        transaction: collectionCreationTransaction,
      });
      await aptos.waitForTransaction({ transactionHash: pendingCollectionCreationTransaction.hash });
      const transaction = await aptos.mintDigitalAssetTransaction({
        creator,
        collection: "Test Collection",
        description: "My new collection!",
        name: "Test Token",
        uri: "http://aptos.dev/nft",
        propertyKeys: ["my bool key", "my array key"],
        propertyTypes: ["BOOLEAN", "ARRAY"],
        propertyValues: [false, "[value]"],
      });
      const pendingTxn = await aptos.signAndSubmitTransaction({ signer: creator, transaction });
      const response = await aptos.waitForTransaction({ transactionHash: pendingTxn.hash });

      const address = await aptos.getCollectionId({
        collectionName: "Test Collection",
        creatorAddress: creator.accountAddress,
      });
      const tokens = await aptos.getAccountOwnedTokensFromCollectionAddress({
        accountAddress: creator.accountAddress,
        collectionAddress: address,
        minimumLedgerVersion: BigInt(response.version),
      });

      expect(tokens.length).toBe(1);
      expect(tokens[0].current_token_data?.token_name).toBe("Test Token");
    });

    test("it verifies a secp256k1 signature", async () => {
      const config = new AptosConfig({ network: Network.LOCAL });
      const aptos = new Aptos(config);
      const account = new SingleKeyAccount({
        privateKey: new Secp256k1PrivateKey(
          "secp256k1-priv-0x1111111111111111111111111111111111111111111111111111111111111111",
        ),
      });
      await aptos.fundAccount({ accountAddress: account.accountAddress, amount: 100 });
      const message = new TextEncoder().encode("hello");
      const signature = account.sign(message);

      const pubKey = await aptos.verifySecp256k1Account({
        message,
        signature,
        accountAddress: account.accountAddress,
      });
      expect(pubKey.toString()).toBe(account.publicKey.toString());
    });

    test("verification of a secp256k1 signature fails with invalid message", async () => {
      const config = new AptosConfig({ network: Network.LOCAL });
      const aptos = new Aptos(config);
      const account = new SingleKeyAccount({
        privateKey: new Secp256k1PrivateKey(
          "secp256k1-priv-0x1111111111111111111111111111111111111111111111111111111111111111",
        ),
      });
      await aptos.fundAccount({ accountAddress: account.accountAddress, amount: 100 });
      const message = new TextEncoder().encode("hello");
      const signature = account.sign(message);

      await expect(
        aptos.verifySecp256k1Account({
          message: new TextEncoder().encode("hi"),
          signature,
          accountAddress: account.accountAddress,
        }),
      ).rejects.toThrow("Failed to recover the public key");
    });

    test("verification of a secp256k1 signature fails with wrong address", async () => {
      const config = new AptosConfig({ network: Network.LOCAL });
      const aptos = new Aptos(config);
      const account = new SingleKeyAccount({
        privateKey: new Secp256k1PrivateKey(
          "secp256k1-priv-0x1111111111111111111111111111111111111111111111111111111111111111",
        ),
      });
      await aptos.fundAccount({ accountAddress: account.accountAddress, amount: 100 });
      const message = new TextEncoder().encode("hello");
      const signature = account.sign(message);

      await expect(
        aptos.verifySecp256k1Account({
          message,
          signature,
          accountAddress: "0x1",
        }),
      ).rejects.toThrow("Failed to recover the public key");
    });

    test("verification of a secp256k1 signature fails with invalid recovery bit", async () => {
      const config = new AptosConfig({ network: Network.LOCAL });
      const aptos = new Aptos(config);
      const account = new SingleKeyAccount({
        privateKey: new Secp256k1PrivateKey(
          "secp256k1-priv-0x1111111111111111111111111111111111111111111111111111111111111111",
        ),
      });
      await aptos.fundAccount({ accountAddress: account.accountAddress, amount: 100 });
      const message = new TextEncoder().encode("hello");
      const signature = account.sign(message);

      await expect(
        aptos.verifySecp256k1Account({
          message,
          signature,
          accountAddress: account.accountAddress,
          recoveryBit: 0,
        }),
      ).rejects.toThrow("does not match the authentication key");

      await expect(
        aptos.verifySecp256k1Account({
          message,
          signature,
          accountAddress: account.accountAddress,
          recoveryBit: 3,
        }),
      ).rejects.toThrow("recovery id 2 or 3 invalid");
    });

    describe("it derives an account from a private key", () => {
      test("single sender ed25519", async () => {
        const config = new AptosConfig({ network: Network.LOCAL });
        const aptos = new Aptos(config);
        const account = Account.generate({ scheme: SigningSchemeInput.Ed25519, legacy: false });
        await aptos.fundAccount({ accountAddress: account.accountAddress, amount: 100 });

        const derivedAccount = await aptos.deriveAccountFromPrivateKey({ privateKey: account.privateKey });
        expect(derivedAccount).toStrictEqual(account);
      });
      test("single sender secp256k1", async () => {
        const config = new AptosConfig({ network: Network.LOCAL });
        const aptos = new Aptos(config);
        const account = Account.generate({ scheme: SigningSchemeInput.Secp256k1Ecdsa });

        const derivedAccount = await aptos.deriveAccountFromPrivateKey({ privateKey: account.privateKey });
        expect(derivedAccount).toStrictEqual(account);
      });
      test("legacy ed25519", async () => {
        const config = new AptosConfig({ network: Network.LOCAL });
        const aptos = new Aptos(config);
        const account = Account.generate({ scheme: SigningSchemeInput.Ed25519, legacy: true });
        await aptos.fundAccount({ accountAddress: account.accountAddress, amount: 100 });

        const derivedAccount = await aptos.deriveAccountFromPrivateKey({ privateKey: account.privateKey });
        expect(derivedAccount).toStrictEqual(account);
      });
    });
  });

  describe("Key Rotation", () => {
    test("it should rotate ed25519 to ed25519 auth key correctly", async () => {
      const config = new AptosConfig({ network: Network.LOCAL });
      const aptos = new Aptos(config);

      // Current Account
      const account = Account.generate({ scheme: SigningSchemeInput.Ed25519, legacy: true });
      await aptos.fundAccount({ accountAddress: account.accountAddress, amount: 1_000_000_000 });

      // account that holds the new key
      const rotateToPrivateKey = Ed25519PrivateKey.generate();

      // Rotate the key
      const pendingTxn = await aptos.rotateAuthKey({ fromAccount: account, toNewPrivateKey: rotateToPrivateKey });
      const response = await aptos.waitForTransaction({ transactionHash: pendingTxn.hash });

      // lookup original account address
      const lookupAccountAddress = await aptos.lookupOriginalAccountAddress({
        authenticationKey: rotateToPrivateKey.publicKey().authKey().derivedAddress(),
        minimumLedgerVersion: BigInt(response.version),
      });

      // Check if the lookup account address is the same as the original account address
      expect(lookupAccountAddress).toStrictEqual(account.accountAddress);
    });
  });
});
