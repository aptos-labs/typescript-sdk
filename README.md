# Typescript SDK for Aptos

![License][github-license]
[![Discord][discord-image]][discord-url]
[![NPM Package Version][npm-image-version]][npm-url]
![Node Version](https://img.shields.io/node/v/%40aptos-labs%2Fts-sdk)
![NPM bundle size](https://img.shields.io/bundlephobia/min/%40aptos-labs/ts-sdk)
[![NPM Package Downloads][npm-image-downloads]][npm-url]

The [TypeScript SDK](https://www.npmjs.com/package/@aptos-labs/ts-sdk) allows you to connect, explore, and interact on the Aptos blockchain. You can use it to request data, send transactions, set up test environments, and more!

## Learn How To Use The TypeScript SDK
### [Quickstart](https://aptos.dev/en/build/sdks/ts-sdk/quickstart)
### [Tutorials](https://aptos.dev/en/build/sdks/ts-sdk)
### [Examples](./examples/README.md)
### [Reference Docs (For looking up specific functions)](https://aptos-labs.github.io/aptos-ts-sdk/)


## Installation

### For use in Node.js or a web application

Install with your favorite package manager such as npm, yarn, or pnpm:

```bash
pnpm install @aptos-labs/ts-sdk
```

### For use in a browser (<= 1.9.1 version only)

You can add the SDK to your web application using a script tag:

```html
<script src="https://unpkg.com/@aptos-labs/ts-sdk/dist/browser/index.global.js" />
```

Then, the SDK can be accessed through `window.aptosSDK`.

## Usage

Create an `Aptos` client in order to access the SDK's functionality.

```ts
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk"

// You can use AptosConfig to choose which network to connect to
const config = new AptosConfig({ network: Network.TESTNET });
// Aptos is the main entrypoint for all functions
const aptos = new Aptos(config);
```

### Reading Data From Onchain ([Guide](https://aptos.dev/en/build/sdks/ts-sdk/fetch-data-via-sdk))

---

```ts
const fund = await aptos.getAccountInfo({ accountAddress: "0x123" });
const modules = await aptos.getAccountModules({ accountAddress: "0x123" });
const tokens = await aptos.getAccountOwnedTokens({ accountAddress: "0x123" });
```

### Account management (default to Ed25519)

> Note: We introduce a Single Sender authentication (as introduced in [AIP-55](https://github.com/aptos-foundation/AIPs/pull/263)). Generating an account defaults to Legacy Ed25519 authentication with the option to use the Single Sender unified authentication.

---

#### Generate new keys

```ts
const account = Account.generate(); // defaults to Legacy Ed25519
const account = Account.generate({ scheme: SigningSchemeInput.Secp256k1Ecdsa }); // Single Sender Secp256k1
const account = Account.generate({ scheme: SigningSchemeInput.Ed25519, legacy: false }); // Single Sender Ed25519
```

#### Derive from private key

```ts
// Create a private key instance for Ed25519 scheme
const privateKey = new Ed25519PrivateKey("myEd25519privatekeystring");
// Or for Secp256k1 scheme
const privateKey = new Secp256k1PrivateKey("mySecp256k1privatekeystring");

// Derive an account from private key

// This is used as a local calculation and therefore is used to instantiate an `Account`
// that has not had its authentication key rotated
const account = await Account.fromPrivateKey({ privateKey });

// Also, can use this function that resolves the provided private key type and derives the public key from it
// to support key rotation and differentiation between Legacy Ed25519 and Unified authentications
const aptos = new Aptos();
const account = await aptos.deriveAccountFromPrivateKey({ privateKey });
```

#### Derive from private key and address

```ts
// Create a private key instance for Ed25519 scheme
const privateKey = new Ed25519PrivateKey("myEd25519privatekeystring");
// Or for Secp256k1 scheme
const privateKey = new Secp256k1PrivateKey("mySecp256k1privatekeystring");

// Derive an account from private key and address

// create an AccountAddress instance from the account address string
const address = AccountAddress.from("myaccountaddressstring");
// Derive an account from private key and address
const account = await Account.fromPrivateKeyAndAddress({ privateKey, address });
```

#### Derive from path

```ts
const path = "m/44'/637'/0'/0'/1";
const mnemonic = "various float stumble...";
const account = Account.fromDerivationPath({ path, mnemonic });
```

### Submit transaction ([Tutorial](https://aptos.dev/en/build/sdks/ts-sdk/building-transactions))

---

```ts
/**
 * This example shows how to use the Aptos SDK to send a transaction.
 * Don't forget to install @aptos-labs/ts-sdk before running this example!
 */
 
import {
    Account,
    Aptos,
    AptosConfig,
    Network,
} from "@aptos-labs/ts-sdk";
 
async function example() {
    console.log("This example will create two accounts (Alice and Bob) and send a transaction transferring APT to Bob's account.");
 
    // 0. Setup the client and test accounts
    const config = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(config);
 
    let alice = Account.generate();
    let bob = Account.generate();
 
    console.log("=== Addresses ===\n");
    console.log(`Alice's address is: ${alice.accountAddress}`);
    console.log(`Bob's address is: ${bob.accountAddress}`);
 
    console.log("\n=== Funding accounts ===\n");
    await aptos.fundAccount({
        accountAddress: alice.accountAddress,
        amount: 100_000_000,
    });  
    await aptos.fundAccount({
        accountAddress: bob.accountAddress,
        amount: 100,
    });
    console.log("Funded Alice and Bob's accounts!")
 
    // 1. Build
    console.log("\n=== 1. Building the transaction ===\n");
    const transaction = await aptos.transaction.build.simple({
        sender: alice.accountAddress,
        data: {
        // All transactions on Aptos are implemented via smart contracts.
        function: "0x1::aptos_account::transfer",
        functionArguments: [bob.accountAddress, 100],
        },
    });
    console.log("Built the transaction!")
 
    // 2. Simulate (Optional)
    console.log("\n === 2. Simulating Response (Optional) === \n")
    const [userTransactionResponse] = await aptos.transaction.simulate.simple({
        signerPublicKey: alice.publicKey,
        transaction,
    });
    console.log(userTransactionResponse)
 
    // 3. Sign
    console.log("\n=== 3. Signing transaction ===\n");
    const senderAuthenticator = aptos.transaction.sign({
        signer: alice,
        transaction,
    });
    console.log("Signed the transaction!")
 
    // 4. Submit
    console.log("\n=== 4. Submitting transaction ===\n");
    const submittedTransaction = await aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator,
    });
 
    console.log(`Submitted transaction hash: ${submittedTransaction.hash}`);
 
    // 5. Wait for results
    console.log("\n=== 5. Waiting for result of transaction ===\n");
    const executedTransaction = await aptos.waitForTransaction({ transactionHash: submittedTransaction.hash });
    console.log(executedTransaction)
};
 
example();
```

## Troubleshooting

If you see import error when you do this

```typescript
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
```

It could be your `tsconfig.json` is not using `node`. Make sure your `moduleResolution` in the `tsconfig.json` is set to `node` instead of `bundler`.

## Contributing

If you found a bug or would like to request a feature, please file an [issue](https://github.com/aptos-labs/aptos-ts-sdk/issues/new/choose).
If, based on the discussion on an issue you would like to offer a code change, please make a [pull request](https://github.com/aptos-labs/aptos-ts-sdk/pulls).
If neither of these describes what you would like to contribute, check out the [contributing guide](https://github.com/aptos-labs/aptos-ts-sdk/blob/main/CONTRIBUTING.md).

[npm-image-version]: https://img.shields.io/npm/v/%40aptos-labs%2Fts-sdk.svg
[npm-image-downloads]: https://img.shields.io/npm/dm/%40aptos-labs%2Fts-sdk.svg
[npm-url]: https://npmjs.org/package/@aptos-labs/ts-sdk
[experimental-url]: https://www.npmjs.com/package/@aptos-labs/ts-sdk/v/experimental
[discord-image]: https://img.shields.io/discord/945856774056083548?label=Discord&logo=discord&style=flat
[discord-url]: https://discord.gg/aptosnetwork
[github-license]: https://img.shields.io/github/license/aptos-labs/aptos-ts-sdk
