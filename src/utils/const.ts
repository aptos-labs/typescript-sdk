// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

/**
 * Types of API endpoints used for routing requests in the Aptos network.
 * @group Implementation
 * @category Utils
 */
export enum AptosApiType {
  FULLNODE = "Fullnode",
  INDEXER = "Indexer",
  FAUCET = "Faucet",
  PEPPER = "Pepper",
  PROVER = "Prover",
}

/**
 * The default max gas amount when none is given.
 *
 * This is the maximum number of gas units that will be used by a transaction before being rejected.
 *
 * Note that max gas amount varies based on the transaction.  A larger transaction will go over this
 * default gas amount, and the value will need to be changed for the specific transaction.
 * @group Implementation
 * @category Utils
 */
export const DEFAULT_MAX_GAS_AMOUNT = 200000;

/**
 * The default transaction expiration seconds from now.
 *
 * This time is how long until the blockchain nodes will reject the transaction.
 *
 * Note that the transaction expiration time varies based on network connection and network load.  It may need to be
 * increased for the transaction to be processed.
 * @group Implementation
 * @category Utils
 */
export const DEFAULT_TXN_EXP_SEC_FROM_NOW = 20;

/**
 * The default number of seconds to wait for a transaction to be processed.
 *
 * This time is the amount of time that the SDK will wait for a transaction to be processed when waiting for
 * the results of the transaction.  It may take longer based on network connection and network load.
 * @group Implementation
 * @category Utils
 */
export const DEFAULT_TXN_TIMEOUT_SEC = 20;

/**
 * The default gas currency for the network.
 * @group Implementation
 * @category Utils
 */
export const APTOS_COIN = "0x1::aptos_coin::AptosCoin";
/**
 * @group Implementation
 * @category Utils
 */
export const APTOS_FA = "0x000000000000000000000000000000000000000000000000000000000000000a";
/**
 * @group Implementation
 * @category Utils
 */
export const RAW_TRANSACTION_SALT = "APTOS::RawTransaction";
/**
 * @group Implementation
 * @category Utils
 */
export const RAW_TRANSACTION_WITH_DATA_SALT = "APTOS::RawTransactionWithData";

/**
 * Supported processor types for the indexer API, sourced from the processor_status table in the indexer database.
 * {@link https://cloud.hasura.io/public/graphiql?endpoint=https://api.mainnet.aptoslabs.com/v1/graphql}
 * @group Implementation
 * @category Utils
 */
export enum ProcessorType {
  ACCOUNT_TRANSACTION_PROCESSOR = "account_transactions_processor",
  DEFAULT = "default_processor",
  EVENTS_PROCESSOR = "events_processor",
  // Fungible asset processor also handles coins
  FUNGIBLE_ASSET_PROCESSOR = "fungible_asset_processor",
  STAKE_PROCESSOR = "stake_processor",
  // Token V2 processor replaces Token processor (not only for digital assets)
  TOKEN_V2_PROCESSOR = "token_v2_processor",
  USER_TRANSACTION_PROCESSOR = "user_transaction_processor",
  OBJECT_PROCESSOR = "objects_processor",
}

/**
 * Regular expression pattern for Firebase Auth issuer URLs
 * Matches URLs in the format: https://securetoken.google.com/[project-id]
 * where project-id can contain letters, numbers, hyphens, and underscores
 */
export const FIREBASE_AUTH_ISS_PATTERN = /^https:\/\/securetoken\.google\.com\/[a-zA-Z0-9-_]+$/;

export const COGNITO_ISS_PATTERN = /^https:\/\/cognito-idp\.[a-zA-Z0-9-_]+\.amazonaws\.com\/[a-zA-Z0-9-_]+$/;
