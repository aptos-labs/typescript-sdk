# Aptos TypeScript SDK Changelog

All notable changes to the Aptos TypeScript SDK will be captured in this file. This changelog is written by hand for now. It adheres to the format set out by [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

# Unreleased
- Added `verifySecp256k1Account` function to verify secp256k1 signatures to prove account ownership. Also enables public key recovery for such accounts.

- node now no longer supports older than v20
- overriding cross spawn for patch
- Add `AccountUtils` class to help with account serialization and deserialization
- Add `SingleKeySigner` interface which adds the ability to get the `AnyPublicKey` from a `SingleKeyAccount`
- We now throw an error earlier when you try to use the faucet with testnet or mainnet, rather than letting the call happen and then fail later.

# 1.33.1 (2024-11-28)

- Add `gasProfile` function to `Move` class to allow for gas profiling of Aptos Move functions
- `PrivateKey.formatPrivateKey` now supports formatting AIP-80 strings
- Removed strictness warnings for bytes AIP-80 private key parsing formatting.
- Add accidentally deleted `deserializeOptionStr` and mark deprecated to unbreak Wallet Adapter

# 1.33.0 (2024-11-13)

- Allow optional provision of public keys in transaction simulation
- Update the multisig v2 example to demonstrate a new way to pre-check a multisig payload before it is created on-chain

# 1.32.1 (2024-11-11)

- Add support for Firebase issuers in the `updateFederatedKeylessJwkSetTransaction` function
- [`Breaking`] Revert new `scriptComposer` api in transactionSubmission api to allow SDK callers to invoke multiple Move functions inside a same transaction and compose the calls dynamically.

# 1.32.0 (2024-11-08)

- [`Breaking`] Updated `AccountAddress.fromString` and `AccountAddress.from` to only accept SHORT strings that are 60-64 characters long by default (with the exception of special addresses). This can be adjusted using `maxMissingChars` which is set to `4` by default. If you would like to keep the previous behavior, set `maxMissingChars` to `63` for relaxed parsing.
- Add support for AIP-80 compliant private key imports and exports through `toAIP80String`
- Add `PrivateKey` helpers for AIP-80: `PrivateKey.parseHexInput`, `PrivateKey.formatPrivateKey`, and `PrivateKey.AIP80_PREFIXES`.
- Adds explicit error handling Keyless accounts using `KeylessError`. Handles JWK rotations and Verifying Key rotations.
- Includes the address in the `AbstractKeylessAccount` serialization to prevent information loss for key rotated accounts.
- [`Breaking`] Deprecate `serializeOptionStr` and `deserializeOptionStr` in favor of `serializeOption` and `deserializeOption`.
- [`Breaking`] Renames `KeylessConfiguration.verficationKey` to `verificationKey`
- Add a new `scriptComposer` api in transactionSubmission api to allower SDK callers to invoke multiple Move functions inside a same transaction and compose the calls dynamically.

# 1.31.0 (2024-10-24)

- Bump `@aptos-labs/aptos-cli` to `1.0.2`
- Fix the `Move` CLI command to correctly handle the success/error outputs

# 1.30.0 (2024-10-21)

- Add the `isPrimitive` function to `TypeTag`.
- Add `showStdout` optional property to `Move` and `LocalNode` classes to control the output of the CLI commands
- Add support for MultiKey's in transaction simulations
- Adds default implementation for `toString` and `toStringWithoutPrefix` for `Serializable`
- Bump `@aptos-labs/aptos-cli` to `1.0.1`

# 1.29.1 (2024-10-09)

- Fix the `FederatedKeylessAccount` constructor to derive the correct address.

# 1.29.0 (2024-10-04)

- Remove usage of Buffer.from and replace with TextEncoder for greater compatibility
- Switch `getAccountCoinAmount` to use a `view` function for more up to date data
- Add support for federated keyless accounts as defined in AIP-96
- Add a `signAndSubmitAsFeePayer` function to the API to allow for submission by the fee payer.
- Add an optional `feePayerAuthenticator` and `feePayer` parameter to `signAndSubmitTransaction` to support signing and submitting in one line.

# 1.28.0 (2024-09-19)

- Support `Serialized Type` to Script txn. Now can use vector<String> for example.
- Add optional address parameter to MultiKeyAccount constructor.
- Populate `coinType` for `getAccountCoinAmount` if only `faMetadataAddress` is provided.
- [`Fix`] `getModuleEventsByEventType` will also account for EventHandle events.
- [`Hot Fix`] change regex to find object address when using `createObjectAndPublishPackage` move function

# 1.27.1 (2024-08-23)

- [Security Fix] Bump `@aptos-labs/aptos-client` to version 0.1.1

# 1.27.0 (2024-08-15)

- Upgrade `@aptos-labs/aptos-cli` version to `0.2.0`
- Update Indexer GraphQL schema
- Add `convertAmountFromHumanReadableToOnChain` and `convertAmountFromOnChainToHumanReadable` helper methods
- Export `helpers.ts` file
- Add `remaining()` function to deserializer, to tell remaining byte size
- Add BCS spec for testing purposes with Cucumber

# 1.26.0 (2024-07-18)

- Support `extraArguments` optional property on the cli Move commands
- Update `fundWallet` check to be more explicit that `undefined` in `waitForIndexer` defaults to waiting.
- [`Fix`] Fixes transactions simulations using an `AnyPublicKey` with a `KeylessPublicKey`

# 1.25.0 (2024-07-17)

- Change the `stop()` function on `LocalNode` to return a `Promise` so we can wait for the processes to be killed
- Introduce `buildPublishPayload` CLI function to build a publication transaction payload and store it in a JSON output file

# 1.24.0 (2024-07-12)

- Make `fundAccount` to wait for the `fungible_asset_processor` indexer processor
- Removed `instanceof` where input might come from other bundle

# 1.23.0 (2024-07-09)

- Adds a base implementation of verify signature for Keyless Accounts
- [`Fix`] Support migrated coins in coin balance lookup indexer queries
- Add support for BlockEpilogueTransaction
- [`Fix`] Fixes a bug with ANS not returning subdomains with an expiration policy of 1 when the subdomain is expired but the parent domain is not.
- Marked AptosApiError.constructor function as @internal and changed its signature
- AptosApiError.message contains a more descriptive and more detailed error message to ease troubleshooting

# 1.22.2 (2024-06-26)

- Release an updated build to npm due to issues with latest release

# 1.22.1 (2024-06-24)

- Fix unit test of ts sdk.

# 1.22.0 (2024-06-24)

- Bump Aptos CLI version that will auto upgrade Aptos CLI to 0.1.9.

# 1.21.0 (2024-06-21)

- Export `core/account` folder and the functions: `createObjectAddress` `createResourceAddress` `createTokenAddress`
- [`Fix`] Respect pagination arguments on `Events` queries
- Add `createObjectAndPublishPackage`, `upgradeObjectPackage` and `runScript` to cli in ts.

# 1.20.0 (2024-06-18)

- Introduce `AptosObject` API for all Object queries
- Add `getObjectDataByObjectAddress` API function to fetch an object data by the object address
- [`Breaking`] `GetAccountOwnedObjectsResponse` type renamed to `GetObjectDataQueryResponse`
- Add `getCollectionDataByCreatorAddressAndCollectionName` and `getCollectionDataByCreatorAddress` API queries
- Add `PaginationArgs` argument to `getCollectionDataByCollectionId` API query
- Mark `getCollectionData` API query as `@deprecated`
- [`Fix`] `getAccountCollectionsWithOwnedTokens` no longer uses amount query

# 1.19.0 (2024-06-11)

- Add `getFungibleAssetMetadataByCreatorAddress` API function to fetch fungible asset metadata by the creator address
- [`Fix`] Allow for empty array in MoveVector.U8
- [`Fix`] Correctly type MoveOption when empty for some cases
- [`Fix`] Add better error handling for empty string "" when used for a u8-u32 argument input type
- [`Fix`] Always fetch latest git dependency when running move cli.

# 1.18.1 (2024-06-05)

- [`Fix`] Keyless transaction simulation now reports gas correctly
- [`Fix`] Fix cli move commands when multiple `namedAddresses` are given

# 1.18.0 (2024-06-03)

- Adds Keyless Account support
- Add `supply_v2` and `maximum_v2` scheme fields to `getFungibleAssetMetadata` query

# 1.17.0 (2024-05-30)

- TypeTag parsing now support references, uppercase types, and more complete error handling
- Allow simple string inputs as type arguments in move scripts
- [`Fix`] Block APIs will now pull all associated transactions in the block, not just the first `100`

# 1.16.0 (2024-05-22)

- Upgrade `@aptos-labs/aptos-cli` package to version `0.1.8`
- [`Fix`] CLI scripts to be OS compatible with Mac, Linux and Windows
- [`Fix`] Support generating transactions with loose types for SDK V1 backward compatibility

# 1.15.0 (2024-05-21)

- [`Breaking`] Removes private key from the Account class to support MultiKey accounts.
- [`Breaking`] Removes the `sign` function from transactionBuilder.ts. Use `Account.signTransactionWithAuthenticator` instead.
- Refactors the core/accounts folder to the top level
- Separates the signing message functionality out of the transactionSubmission.ts file
- Adds an Account implementation for MultiKey accounts
- Upgrade `@aptos-labs/aptos-cli` package to version `0.1.7`
- Introduce `table` function APIs
- Add `getTableItemsData` and `getTableItemsMetadata` API queries
- Add `decimal` prop back to `current_token_ownerships_v2.current_token_data` response

# 1.14.0 (2024-05-09)

- [`Fix`] fixed `transferFungibleAsset` function
- Run all examples in CI
- Introduce cli `Move` class that holds `move` related commands
- Add common cli commands - `move.init()`, `move.compile()`, `move.test()`, `move.publish()`
- [`Fix`] Fix `generateSigningMessage` to check type explicitly instead of using `instanceOf`
- Remove `randomnet` from the known Network enum

# 1.13.3 (2024-04-30)

- Export `MultiAgentTransaction` class

# 1.13.2 (2024-04-29)

- [`Fix`] Fix `generateSignedTransaction` so that it works with object instances from different bundles
- [`Fix`] Preventing undefined options from overriding fallbacks in `generateRawTransaction`
- Use `@aptos-labs/aptos-cli` as a regular dependency

# 1.13.1 (2024-04-23)

- [`Fix`] Fixes Local ABI to use it locally rather than make an external network call
- Performance improvements to transaction build times

# 1.13.0 (2024-04-19)

- [`Breaking`] Change ed25519 library to be `@noble/curves/ed25519`
- Fix ed25519 signature verification to ensure for canonical signatures to prevent malleability
- Include `x-aptos-typescript-sdk-origin-method` header on server request
- Export `LocalNode` module using the module relative path
- Change the `waitForTransaction` SDK API to try long poll

# 1.12.2 (2024-04-10)

- Revert export `LocalNode` module

# 1.12.1 (2024-04-09)

- Export `LocalNode` module

# 1.12.0 (2024-04-08)

- [`Breaking`] Change `getOwnerAddress` and `getTargetAddress` return type to `AccountAddress`
- Add `message` input type verification on `sign` and `verifySignature` functions and convert it into a correct type if needed
- [`Breaking`] Change `fromString` to `fromHexString` on `Hex` class
- Introduce Serializable `SimpleTransaction` and `MultiAgentTransaction` modules
- [`Breaking`] Change any generate transaction function to return `SimpleTransaction` or `MultiAgentTransaction` instance
- Adds `getUserTransactionHash` which can generate a transaction hash after signing, but before submission
- Add function to create resource address locally

# 1.11.0 (2024-03-26)

- Use indexer API via API Gateway
- Add support to allow setting per-backend (fullnode, indexer, faucet) configuration
- [`Breaking`] `AUTH_TOKEN` client config moved to be under `faucetConfig` property
- Handle `Unauthorized` server error
- Add function to create object address locally
- Add function to create token object address locally
- Add signers to entry function ABI for future signature count checking
- [`Breaking`] Add type-safe view functions with ABI support
- [`Fix`] ANS `getName` and `getDomainSubdomains` now appropriately ignores invalid and expired names

# 1.10.0 (2024-03-11)

- [`Deprecate`] IIFE build support
- Use node API via API Gateway
- [`Fix`] Filter `getCurrentDigitalAssetOwnership` where amount > 0

# 1.9.1 (2024-02-28)

- [`Fix`] Remove decimals field from `CurrentTokenOwnershipFields` gql fragment

# 1.9.0 (2024-02-27)

- Add `getCollectionByCollectionId` API
- Changed `Account` into an abstract class, and defined strongly-typed specializations.

# 1.8.0 (2024-02-24)

- Add `decimals` field to token data queries
- Add support for `validator_transaction` type introduced in 1.10
- Add `getModuleEventsByEventType` API

# 1.7.0 (2024-02-13)

- Add ability to provide ABI to skip ABI fetch, and get roughly 50% performance improvement

# 1.6.0 (2024-02-08)

- Add optional `options` param to `getAccountEventsByCreationNumber` query for paginations and order by
- Add more meaningful API error messages
- Support automated account creation for sponsored transactions
- Add randomnet to known networks

# 1.5.1 (2024-01-24)

- Move eventemitter3 to runtime dependency

# 1.5.0 (2024-01-24)

- Remove request URLs forward slash append
- Add events to `TransactionWorker` module that dapps can listen to
- Introduce `aptos.transaction.batch` namespace to handle batch transactions
- Support `aptos.transaction.batch.forSingleAccount()` to send batch transactions for a single account
- Label `aptos.batchTransactionsForSingleAccount()` as `deprecated` to prefer using `aptos.transaction.batch.forSingleAccount()`

# 1.4.0 (2024-01-08)

- Omit `"build" | "simulate" | "submit"` from `aptos` namespace
- [`Breaking`] Change `sender` property type to `AccountAddressInput` in `transferCoinTransaction()`

# 1.3.0 (2024-01-03)

- [`Breaking`] Capitalize `TransactionPayloadMultiSig` type
- Add support to Array value in digital asset property map
- [`Breaking`] Change `maxGasAmount, gasUnitPrice and expireTimestamp` properties in `InputGenerateTransactionOptions` type to `number` type
- Add `@aptos-labs/aptos-cli` npm package as a dev dependency
- Implement a `LocalNode` module to run a local testnet with in the SDK environment
- Use `LocalNode` module to spin up a local testnet pre running SDK tests
- Update BigInt constants to be hardcoded rather than use Math.pow

# 1.2.0 (2023-12-14)

- Fixed examples to use wait on indexer rather than sleep
- Fixed `waitOnIndexer` to wait on correct tables / remove duplicate or unnecessary waits on indexer
- [`Breaking`] Changed output of `getIndexerLastSuccessVersion` to `bigint` from `number`
- Update dependencies in the Typescript SDK to keep up with latest changes
- Updated @aptos-labs/aptos-client dependency
- [`Breaking`] Hex string inputs to `vector<u8>` entry function arguments will now be interpreted as a string instead of hex
- String inputs to `vector<u8>` entry function arguments will now be interpreted as UTF-8 bytes
- ArrayBuffer is now a possible input for `vector<u8>` entry function arguments

## 1.1.0 (2023-12-11)

- Add release automation, so version updates can be made with simply `pnpm update-version`
- Rename custom request header to `aptos-typescript-sdk`
- [`Breaking`] Rename `token` to `digitalAsset` and add digital asset built in transaction generation functions
- [`Breaking`] change transaction submission builder flow namespace to be under a `transaction` namespace
- [`Breaking`] Rename `SingleSignerTransaction` type to `SimpleTransaction`

## 1.0.0 (2023-12-04)

Release Stable version `1.0.0`

## 0.0.8 (2023-11-29)

- Respect `API_KEY` option in `clientConfig` when making indexer and/or fullnode queries
- [`Added`] Added `waitForIndexer` function to wait for indexer to sync up with full node. All indexer query functions now accepts a new optional param `minimumLedgerVersion` to wait for indexer to sync up with the target processor.
- Add `getSigningMessage` to allow users to sign transactions with external signers and other use cases
- [`Breaking`] Changes ANS date usage to consistently use epoch timestamps represented in milliseconds.
  - `getExpiration`: Previously returned seconds, now returns milliseconds
  - `registerName`: Argument `expiration.expirationDate` was previously a `Date` object, now it is an epoch timestamp represented in milliseconds
  - All query functions return epoch milliseconds instead of ISO date strings.
- [`Breaking`] Flatten options for all functions to be a single level
- Cleanup internal usage of casting
- Export `AnyPublicKey` and `AnySignature` types
- Add `transferFungibleAsset` function to easily generate a transaction to transfer a fungible asset from sender's primary store to recipient's primary store
- [`Breaking`] `AccountAddress.fromRelaxed` is now `AccountAddress.from`, and a new `AccountAddress.fromStrict` has the old functionality.
- Implement transaction management worker layer to manage transaction submission for a single account with a high throughput
- [`Fixed`] Allow for Uint8Array to be passed as a `vector<u8>` argument on entry functions
- [`Fixed`] Allow for raw vectors to be passed as arguments with encoded types within them for Remote ABI on entry functions e.g. [AccountAddress]

## 0.0.7 (2023-11-16)

- Adds additional ANS APIs

  - Transactions
    - setPrimaryName
    - setTargetAddress
    - registerName
    - renew_domain
  - Queries
    - getPrimaryName
    - getOwnerAddress
    - getExpiration
    - getTargetAddress
    - getName
    - getAccountNames
    - getAccountDomains
    - getAccountSubdomains
    - getDomainSubdomains

- [`Breaking`] Refactor transaction builder flow
  - Each builder step is under a dedicated namespace - `aptos.build.transaction`, `aptos.sign.transaction`, `aptos.submit.transaction`
  - Supports and implements 2 types of transactions - single signer as `aptos.*.transaction` and multi agent as `aptos.*.multiAgentTransaction`
  - A boolean `withFeePayer` argument can be passed to any transaction `build` function to make it a Sponsor transaction
  - Different functions `aptos.sign.transaction` to sign a transaction as a single signer and `aptos.sign.transactionAsFeePayer`to sign a transaction as a sponsor
  - Return `InputSingleSignerTransaction` type changed to `SingleSignerTransaction` type
  - Return `InputMultiAgentTransaction` type changed to `MultiAgentTransaction` type

## 0.0.6 (2023-11-14)

- [`Breaking`] Changed `ViewRequestData` to `InputViewRequestData`
- Respect max gas amount value when generating a transaction
- Added a clearer error message for when the typeTagParser encounters a possible generic TypeTag but generics are disallowed
- Update all dependencies to the latest version
- Added ability for providing own output types for view functions

## 0.0.5 (2023-11-09)

- [`Breaking`] Update and changed the flow of Fee payer transaction to be "Optional Fee Payer". A fee payer is now required to sign the transaction `asFeePayer`
- `getAccountEventsByEventType` query uses new `indexed_type` indexed field to avoid rate limit
- [`Breaking`] Rename `TOKEN` to `AUTH_TOKEN` for better visibility
- Set the `AUTH_TOKEN` only for faucet queries

## 0.0.4 (2023-11-03)

- [`Breaking`] Changed all instances of `AccountAddress.fromHexInput` to `AccountAddress.from` to accept AccountAddress as well
- [`Fixed`] Fixed a bug where an entry function with only signers would fail due to type tag parsing
- [`Fixed`] REST API errors now properly give error messages in JSON rather than just `BadRequest`
- All address inputs now also accept AccountAddress
- Support derive account from private key `Account.fromPrivateKey()`
- Derive account from derivation path secp256k1 support
- Default Account generation to Legacy Ed25519
- Remove unnecessary pre-emptive serialization of the field `rawTransaction: Uint8Array` by replacing it with the unserialized `rawTransaction: RawTransaction` class
- ANS (Aptos Names Service) SDK initial support for creation and lookup of names
- Initial Auth key rotation support

## 0.0.3 (2023-10-31)

- Remove MoveObject in favor of AccountAddress, use AccountAddress for Object inputs
- Use revamped parseTypeTag function instead of StructTag.fromString()
- Allow use of generics in parseTypeTag
- Rename publishModuleTransaction to publishPackageTransaction and fix functionality accordingly
- Added toString() for type tags, and reference placeholder type
- Add ability to generate transactions with known ABI and remote ABI
- Fix verify signature logic
- Implement `MultiKey` support for multi authentication key

## 0.0.2 (2023-10-25)

- Build package before publishing\
- Add `AccountAddress.ZERO` to support the frequent future use of an optional fee payer address

## 0.0.1 (2023-10-25)

- [`Breaking`] Changed all instances of `arguments` to `functionArguments` to avoid the reserved keyword in `strict` mode.
- Support publish move module API function
- Fix client config not being added to the request
- Support to config a custom client instance
- Changed all Regex based inputs requiring a `0x` to be optional. This is to allow for easier copy/pasting of addresses and keys.
- Change GetAccountResource to take in a generic output type that matches the struct
- Add support for Single Sender

## 0.0.0 (2023-10-18)

- Fetch data from chain
- Fund account with APT coins
- Proper formatting and parsing of account addresses as defined by [AIP-40](https://github.com/aptos-foundation/AIPs/blob/main/aips/aip-40.md)
- Submit transactions
  - Single signer
  - Fee payer
  - Multi agent
  - With payloads
    - Entry function
    - Script
    - Multisig
- Simulate a transaction
  - Single signer
  - Fee payer
  - Multi agent
- Built in transaction generation
  - Transfer coins
  - Mint collection
  - Mint nft
- Keys management
  - ED25519
  - Secp256k1 - to go in next devnet release
  - Generate new keys
  - Derive from existing private key
  - Derive from mnemonics path
  - Derive from private key and address (for account that has it's key rotated)
  - Sign
  - Verify signature
- BCS support
  - Move sub-classes to easily serialize and deserialize Move types
  - Unified Argument class for entry function and script payload argument types
  - Full nested serialization/deserialization support
- Examples (both typescript and javascript)
  - Simple transfer transaction example
  - Transfer transaction example using built in transferCoinTransaction
  - Fee payer (aka sponsored) transaction example
  - Multi agent transaction example
  - Mint collection and nft
- Local custom types (instead of generating types)
- In depths type checking on compile time
  - Typescript can infer the return type based on the argument being passed into `generateTransaction` function (singlesigner,multiagent,feepayer)
  - Support for orderBy keys type checking for indexer queries
