// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

/**
 * This file contains the underlying implementations for exposed API surface in
 * the {@link api/account}. By moving the methods out into a separate file,
 * other namespaces and processes can access these methods without depending on the entire
 * account namespace and without having a dependency cycle error.
 * @group Implementation
 */
import { AptosConfig } from "../api/aptosConfig";
import { getAptosFullNode, paginateWithCursor, paginateWithObfuscatedCursor } from "../client";
import {
  AccountData,
  GetAccountCoinsDataResponse,
  GetAccountCollectionsWithOwnedTokenResponse,
  GetAccountOwnedTokensFromCollectionResponse,
  GetAccountOwnedTokensQueryResponse,
  GetObjectDataQueryResponse,
  LedgerVersionArg,
  MoveModuleBytecode,
  MoveResource,
  MoveStructId,
  OrderByArg,
  PaginationArgs,
  TokenStandardArg,
  TransactionResponse,
  WhereArg,
} from "../types";
import { AccountAddress, AccountAddressInput } from "../core/accountAddress";
import { Account } from "../account";
import { AnyPublicKey, Ed25519PublicKey, PrivateKey } from "../core/crypto";
import { queryIndexer } from "./general";
import {
  GetAccountCoinsCountQuery,
  GetAccountCoinsDataQuery,
  GetAccountCollectionsWithOwnedTokensQuery,
  GetObjectDataQuery,
  GetAccountOwnedTokensFromCollectionQuery,
  GetAccountOwnedTokensQuery,
  GetAccountTokensCountQuery,
  GetAccountTransactionsCountQuery,
} from "../types/generated/operations";
import {
  GetAccountCoinsCount,
  GetAccountCoinsData,
  GetAccountCollectionsWithOwnedTokens,
  GetObjectData,
  GetAccountOwnedTokens,
  GetAccountOwnedTokensFromCollection,
  GetAccountTokensCount,
  GetAccountTransactionsCount,
} from "../types/generated/queries";
import { memoizeAsync } from "../utils/memoize";
import { Secp256k1PrivateKey, AuthenticationKey, Ed25519PrivateKey, createObjectAddress } from "../core";
import { CurrentFungibleAssetBalancesBoolExp } from "../types/generated/types";
import { getTableItem } from "./table";
import { APTOS_COIN } from "../utils";
import { AptosApiError } from "../errors";

/**
 * Retrieves account information for a specified account address.
 *
 * @param args - The arguments for retrieving account information.
 * @param args.aptosConfig - The configuration object for Aptos.
 * @param args.accountAddress - The address of the account to retrieve information for.
 * @group Implementation
 */
export async function getInfo(args: {
  aptosConfig: AptosConfig;
  accountAddress: AccountAddressInput;
}): Promise<AccountData> {
  const { aptosConfig, accountAddress } = args;
  const { data } = await getAptosFullNode<{}, AccountData>({
    aptosConfig,
    originMethod: "getInfo",
    path: `accounts/${AccountAddress.from(accountAddress).toString()}`,
  });
  return data;
}

/**
 * Retrieves the modules associated with a specified account address.
 *
 * @param args - The arguments for retrieving modules.
 * @param args.aptosConfig - The configuration for connecting to the Aptos blockchain.
 * @param args.accountAddress - The address of the account whose modules are to be retrieved.
 * @param args.options - Optional parameters for pagination and ledger version.
 * @param args.options.limit - The maximum number of modules to retrieve (default is 1000).
 * @param args.options.offset - The starting point for pagination.  Note, this is obfuscated and is not an index.
 * @param args.options.ledgerVersion - The specific ledger version to query.
 * @group Implementation
 */
export async function getModules(args: {
  aptosConfig: AptosConfig;
  accountAddress: AccountAddressInput;
  options?: PaginationArgs & LedgerVersionArg;
}): Promise<MoveModuleBytecode[]> {
  const { aptosConfig, accountAddress, options } = args;
  return paginateWithObfuscatedCursor<{}, MoveModuleBytecode[]>({
    aptosConfig,
    originMethod: "getModules",
    path: `accounts/${AccountAddress.from(accountAddress).toString()}/modules`,
    params: {
      ledger_version: options?.ledgerVersion,
      offset: options?.offset,
      limit: options?.limit ?? 1000,
    },
  });
}

/**
 * Queries for a move module given an account address and module name.
 * This function can help you retrieve the module's ABI and other relevant information.
 *
 * @param args - The arguments for retrieving the module.
 * @param args.aptosConfig - The configuration for the Aptos client.
 * @param args.accountAddress - The account address in hex-encoded 32 byte format.
 * @param args.moduleName - The name of the module to retrieve.
 * @param args.options - Optional parameters for the request.
 * @param args.options.ledgerVersion - Specifies the ledger version of transactions. By default, the latest version will be used.
 * @returns The move module.
 * @group Implementation
 */
export async function getModule(args: {
  aptosConfig: AptosConfig;
  accountAddress: AccountAddressInput;
  moduleName: string;
  options?: LedgerVersionArg;
}): Promise<MoveModuleBytecode> {
  // We don't memoize the account module by ledger version, as it's not a common use case, this would be handled
  // by the developer directly
  if (args.options?.ledgerVersion !== undefined) {
    return getModuleInner(args);
  }

  return memoizeAsync(
    async () => getModuleInner(args),
    `module-${args.accountAddress}-${args.moduleName}`,
    1000 * 60 * 5, // 5 minutes
  )();
}

/**
 * Retrieves the bytecode of a specified module from a given account address.
 *
 * @param args - The parameters for retrieving the module bytecode.
 * @param args.aptosConfig - The configuration for connecting to the Aptos network.
 * @param args.accountAddress - The address of the account from which to retrieve the module.
 * @param args.moduleName - The name of the module to retrieve.
 * @param args.options - Optional parameters for specifying the ledger version.
 * @param args.options.ledgerVersion - The specific ledger version to query.
 * @group Implementation
 */
async function getModuleInner(args: {
  aptosConfig: AptosConfig;
  accountAddress: AccountAddressInput;
  moduleName: string;
  options?: LedgerVersionArg;
}): Promise<MoveModuleBytecode> {
  const { aptosConfig, accountAddress, moduleName, options } = args;

  const { data } = await getAptosFullNode<{}, MoveModuleBytecode>({
    aptosConfig,
    originMethod: "getModule",
    path: `accounts/${AccountAddress.from(accountAddress).toString()}/module/${moduleName}`,
    params: { ledger_version: options?.ledgerVersion },
  });
  return data;
}

/**
 * Retrieves a list of transactions associated with a specific account address.
 * This function allows you to paginate through the transactions for better performance and usability.
 *
 * @param args - The arguments for retrieving transactions.
 * @param args.aptosConfig - The configuration settings for Aptos.
 * @param args.accountAddress - The account address for which to retrieve transactions.
 * @param args.options - Optional pagination parameters.
 * @param args.options.offset - The starting point for pagination.
 * @param args.options.limit - The maximum number of transactions to retrieve.
 * @group Implementation
 */
export async function getTransactions(args: {
  aptosConfig: AptosConfig;
  accountAddress: AccountAddressInput;
  options?: PaginationArgs;
}): Promise<TransactionResponse[]> {
  const { aptosConfig, accountAddress, options } = args;
  return paginateWithCursor<{}, TransactionResponse[]>({
    aptosConfig,
    originMethod: "getTransactions",
    path: `accounts/${AccountAddress.from(accountAddress).toString()}/transactions`,
    params: { start: options?.offset, limit: options?.limit },
  });
}

/**
 * Retrieves a list of resources associated with a specific account address.
 *
 * @param args - The arguments for retrieving resources.
 * @param args.aptosConfig - The configuration settings for Aptos.
 * @param args.accountAddress - The address of the account to fetch resources for.
 * @param args.options - Optional pagination and ledger version parameters.
 * @param args.options.offset - The starting point for pagination.  Note, this is obfuscated and is not an index.
 * @param args.options.limit - The maximum number of resources to retrieve (default is 999).
 * @param args.options.ledgerVersion - The specific ledger version to query.
 * @group Implementation
 */
export async function getResources(args: {
  aptosConfig: AptosConfig;
  accountAddress: AccountAddressInput;
  options?: PaginationArgs & LedgerVersionArg;
}): Promise<MoveResource[]> {
  const { aptosConfig, accountAddress, options } = args;
  return paginateWithObfuscatedCursor<{}, MoveResource[]>({
    aptosConfig,
    originMethod: "getResources",
    path: `accounts/${AccountAddress.from(accountAddress).toString()}/resources`,
    params: {
      ledger_version: options?.ledgerVersion,
      offset: options?.offset,
      limit: options?.limit ?? 999,
    },
  });
}

/**
 * Retrieves a specific resource of a given type for the specified account address.
 *
 * @param args - The arguments for retrieving the resource.
 * @param args.aptosConfig - The configuration settings for Aptos.
 * @param args.accountAddress - The address of the account from which to retrieve the resource.
 * @param args.resourceType - The type of the resource to retrieve, specified as a MoveStructId.
 * @param args.options - Optional parameters for specifying the ledger version.
 * @group Implementation
 */
export async function getResource<T extends {}>(args: {
  aptosConfig: AptosConfig;
  accountAddress: AccountAddressInput;
  resourceType: MoveStructId;
  options?: LedgerVersionArg;
}): Promise<T> {
  const { aptosConfig, accountAddress, resourceType, options } = args;
  const { data } = await getAptosFullNode<{}, MoveResource>({
    aptosConfig,
    originMethod: "getResource",
    path: `accounts/${AccountAddress.from(accountAddress).toString()}/resource/${resourceType}`,
    params: { ledger_version: options?.ledgerVersion },
  });
  return data.data as T;
}

/**
 * Retrieves the original account address associated with a given authentication key, which is useful for handling key rotations.
 *
 * @param args - The arguments for the lookup.
 * @param args.aptosConfig - The configuration for the Aptos client.
 * @param args.authenticationKey - The authentication key for which to look up the original address.
 * @param args.options - Optional parameters for specifying the ledger version.
 * @returns The original account address or the provided authentication key address if not found.
 * @throws Throws an error if the lookup fails for reasons other than the address not being found.
 * @group Implementation
 */
export async function lookupOriginalAccountAddress(args: {
  aptosConfig: AptosConfig;
  authenticationKey: AccountAddressInput;
  options?: LedgerVersionArg;
}): Promise<AccountAddress> {
  const { aptosConfig, authenticationKey, options } = args;
  type OriginatingAddress = {
    address_map: { handle: string };
  };
  const resource = await getResource<OriginatingAddress>({
    aptosConfig,
    accountAddress: "0x1",
    resourceType: "0x1::account::OriginatingAddress",
    options,
  });

  const {
    address_map: { handle },
  } = resource;

  const authKeyAddress = AccountAddress.from(authenticationKey);

  // If the address is not found in the address map, which means its not rotated
  // then return the address as is
  try {
    const originalAddress = await getTableItem<string>({
      aptosConfig,
      handle,
      data: {
        key: authKeyAddress.toString(),
        key_type: "address",
        value_type: "address",
      },
      options,
    });

    return AccountAddress.from(originalAddress);
  } catch (err) {
    if (err instanceof AptosApiError && err.data.error_code === "table_item_not_found") {
      return authKeyAddress;
    }

    throw err;
  }
}

/**
 * Retrieves the count of tokens owned by a specific account address.
 *
 * @param args - The arguments for retrieving the account tokens count.
 * @param args.aptosConfig - The configuration settings for the Aptos network.
 * @param args.accountAddress - The address of the account for which to count the tokens.
 * @returns The count of tokens owned by the specified account.
 * @group Implementation
 */
export async function getAccountTokensCount(args: {
  aptosConfig: AptosConfig;
  accountAddress: AccountAddressInput;
}): Promise<number> {
  const { aptosConfig, accountAddress } = args;

  const address = AccountAddress.from(accountAddress).toStringLong();

  const whereCondition: { owner_address: { _eq: string }; amount: { _gt: number } } = {
    owner_address: { _eq: address },
    amount: { _gt: 0 },
  };

  const graphqlQuery = {
    query: GetAccountTokensCount,
    variables: { where_condition: whereCondition },
  };

  const data = await queryIndexer<GetAccountTokensCountQuery>({
    aptosConfig,
    query: graphqlQuery,
    originMethod: "getAccountTokensCount",
  });

  // commonjs (aka cjs) doesn't handle Nullish Coalescing for some reason
  // might be because of how ts infer the graphql generated scheme type
  return data.current_token_ownerships_v2_aggregate.aggregate
    ? data.current_token_ownerships_v2_aggregate.aggregate.count
    : 0;
}

/**
 * Retrieves the tokens owned by a specified account address.
 *
 * @param args - The arguments for retrieving the account's tokens.
 * @param args.aptosConfig - The configuration for the Aptos client.
 * @param args.accountAddress - The address of the account whose tokens are being queried.
 * @param args.options - Optional parameters for filtering and pagination.
 * @param args.options.tokenStandard - The specific token standard to filter the results.
 * @param args.options.offset - The number of records to skip before starting to collect the result set.
 * @param args.options.limit - The maximum number of records to return.
 * @param args.options.orderBy - The criteria for ordering the results.
 * @returns A promise that resolves to the current token ownerships of the specified account.
 * @group Implementation
 */
export async function getAccountOwnedTokens(args: {
  aptosConfig: AptosConfig;
  accountAddress: AccountAddressInput;
  options?: TokenStandardArg & PaginationArgs & OrderByArg<GetAccountOwnedTokensQueryResponse[0]>;
}): Promise<GetAccountOwnedTokensQueryResponse> {
  const { aptosConfig, accountAddress, options } = args;
  const address = AccountAddress.from(accountAddress).toStringLong();

  const whereCondition: { owner_address: { _eq: string }; amount: { _gt: number }; token_standard?: { _eq: string } } =
    {
      owner_address: { _eq: address },
      amount: { _gt: 0 },
    };

  if (options?.tokenStandard) {
    whereCondition.token_standard = { _eq: options?.tokenStandard };
  }

  const graphqlQuery = {
    query: GetAccountOwnedTokens,
    variables: {
      where_condition: whereCondition,
      offset: options?.offset,
      limit: options?.limit,
      order_by: options?.orderBy,
    },
  };

  const data = await queryIndexer<GetAccountOwnedTokensQuery>({
    aptosConfig,
    query: graphqlQuery,
    originMethod: "getAccountOwnedTokens",
  });

  return data.current_token_ownerships_v2;
}

/**
 * Retrieves the tokens owned by a specific account from a particular collection address.
 *
 * @param args - The parameters required to fetch the owned tokens.
 * @param args.aptosConfig - The Aptos configuration object.
 * @param args.accountAddress - The address of the account whose tokens are being queried.
 * @param args.collectionAddress - The address of the collection from which tokens are being retrieved.
 * @param args.options - Optional parameters for filtering and pagination, including token standard, pagination arguments, and
 * order by options.
 * @group Implementation
 */
export async function getAccountOwnedTokensFromCollectionAddress(args: {
  aptosConfig: AptosConfig;
  accountAddress: AccountAddressInput;
  collectionAddress: AccountAddressInput;
  options?: TokenStandardArg & PaginationArgs & OrderByArg<GetAccountOwnedTokensFromCollectionResponse[0]>;
}): Promise<GetAccountOwnedTokensFromCollectionResponse> {
  const { aptosConfig, accountAddress, collectionAddress, options } = args;
  const ownerAddress = AccountAddress.from(accountAddress).toStringLong();
  const collAddress = AccountAddress.from(collectionAddress).toStringLong();

  const whereCondition: {
    owner_address: { _eq: string };
    current_token_data: { collection_id: { _eq: string } };
    amount: { _gt: number };
    token_standard?: { _eq: string };
  } = {
    owner_address: { _eq: ownerAddress },
    current_token_data: { collection_id: { _eq: collAddress } },
    amount: { _gt: 0 },
  };

  if (options?.tokenStandard) {
    whereCondition.token_standard = { _eq: options?.tokenStandard };
  }

  const graphqlQuery = {
    query: GetAccountOwnedTokensFromCollection,
    variables: {
      where_condition: whereCondition,
      offset: options?.offset,
      limit: options?.limit,
      order_by: options?.orderBy,
    },
  };

  const data = await queryIndexer<GetAccountOwnedTokensFromCollectionQuery>({
    aptosConfig,
    query: graphqlQuery,
    originMethod: "getAccountOwnedTokensFromCollectionAddress",
  });

  return data.current_token_ownerships_v2;
}

/**
 * Retrieves the collections owned by a specified account along with the tokens in those collections.
 *
 * @param args - The arguments for the function.
 * @param args.aptosConfig - The configuration for the Aptos client.
 * @param args.accountAddress - The address of the account whose collections are being queried.
 * @param args.options - Optional parameters for filtering and pagination.
 * @param args.options.tokenStandard - An optional token standard to filter the collections.
 * @param args.options.offset - An optional offset for pagination.
 * @param args.options.limit - An optional limit for the number of results returned.
 * @param args.options.orderBy - An optional parameter to specify the order of the results.
 * @group Implementation
 */
export async function getAccountCollectionsWithOwnedTokens(args: {
  aptosConfig: AptosConfig;
  accountAddress: AccountAddressInput;
  options?: TokenStandardArg & PaginationArgs & OrderByArg<GetAccountCollectionsWithOwnedTokenResponse[0]>;
}): Promise<GetAccountCollectionsWithOwnedTokenResponse> {
  const { aptosConfig, accountAddress, options } = args;
  const address = AccountAddress.from(accountAddress).toStringLong();

  const whereCondition: {
    owner_address: { _eq: string };
    current_collection?: { token_standard: { _eq: string } };
  } = {
    owner_address: { _eq: address },
  };

  if (options?.tokenStandard) {
    whereCondition.current_collection = {
      token_standard: { _eq: options?.tokenStandard },
    };
  }

  const graphqlQuery = {
    query: GetAccountCollectionsWithOwnedTokens,
    variables: {
      where_condition: whereCondition,
      offset: options?.offset,
      limit: options?.limit,
      order_by: options?.orderBy,
    },
  };

  const data = await queryIndexer<GetAccountCollectionsWithOwnedTokensQuery>({
    aptosConfig,
    query: graphqlQuery,
    originMethod: "getAccountCollectionsWithOwnedTokens",
  });

  return data.current_collection_ownership_v2_view;
}

/**
 * Retrieves the count of transactions associated with a specified account.
 *
 * @param args - The arguments for the function.
 * @param args.aptosConfig - The configuration settings for Aptos.
 * @param args.accountAddress - The address of the account for which to retrieve the transaction count.
 * @returns The number of transactions associated with the specified account.
 * @group Implementation
 */
export async function getAccountTransactionsCount(args: {
  aptosConfig: AptosConfig;
  accountAddress: AccountAddressInput;
}): Promise<number> {
  const { aptosConfig, accountAddress } = args;

  const address = AccountAddress.from(accountAddress).toStringLong();

  const graphqlQuery = {
    query: GetAccountTransactionsCount,
    variables: { address },
  };

  const data = await queryIndexer<GetAccountTransactionsCountQuery>({
    aptosConfig,
    query: graphqlQuery,
    originMethod: "getAccountTransactionsCount",
  });

  // commonjs (aka cjs) doesn't handle Nullish Coalescing for some reason
  // might be because of how ts infer the graphql generated scheme type
  return data.account_transactions_aggregate.aggregate ? data.account_transactions_aggregate.aggregate.count : 0;
}

/**
 * Retrieves the amount of a specific coin held by an account.
 *
 * @param args - The parameters for the request.
 * @param args.aptosConfig - The Aptos configuration object.
 * @param args.accountAddress - The address of the account to query.
 * @param args.coinType - Optional; the type of coin to check the amount for.
 * @param args.faMetadataAddress - Optional; the address of the fungible asset metadata.
 * @returns The amount of the specified coin held by the account, or 0 if none is found.
 * @throws Error if neither coinType nor faMetadataAddress is provided.
 * @group Implementation
 */
export async function getAccountCoinAmount(args: {
  aptosConfig: AptosConfig;
  accountAddress: AccountAddressInput;
  coinType?: MoveStructId;
  faMetadataAddress?: AccountAddressInput;
}): Promise<number> {
  const { aptosConfig, accountAddress, coinType, faMetadataAddress } = args;

  let coinAssetType: string | undefined = coinType;
  let faAddress: string;

  if (coinType !== undefined && faMetadataAddress !== undefined) {
    faAddress = AccountAddress.from(faMetadataAddress).toStringLong();
  } else if (coinType !== undefined && faMetadataAddress === undefined) {
    // TODO Move to a separate function as defined in the AIP for coin migration
    if (coinType === APTOS_COIN) {
      faAddress = AccountAddress.A.toStringLong();
    } else {
      faAddress = createObjectAddress(AccountAddress.A, coinType).toStringLong();
    }
  } else if (coinType === undefined && faMetadataAddress !== undefined) {
    const addr = AccountAddress.from(faMetadataAddress);
    faAddress = addr.toStringLong();
    if (addr === AccountAddress.A) {
      coinAssetType = APTOS_COIN;
    }
    // The paired CoinType should be populated outside of this function in another
    // async call. We cannot do this internally due to dependency cycles issue.
  } else {
    throw new Error("Either coinType, fungibleAssetAddress, or both must be provided");
  }
  const address = AccountAddress.from(accountAddress).toStringLong();

  // Search by fungible asset address, unless it has a coin it migrated from
  let where: any = { asset_type: { _eq: faAddress } };
  if (coinAssetType !== undefined) {
    where = { asset_type: { _in: [coinAssetType, faAddress] } };
  }

  const data = await getAccountCoinsData({
    aptosConfig,
    accountAddress: address,
    options: {
      where,
    },
  });

  // commonjs (aka cjs) doesn't handle Nullish Coalescing for some reason
  // might be because of how ts infer the graphql generated scheme type
  return data[0] ? data[0].amount : 0;
}

/**
 * Retrieves the current fungible asset balances for a specified account.
 *
 * @param args - The arguments for retrieving account coins data.
 * @param args.aptosConfig - The configuration for connecting to the Aptos network.
 * @param args.accountAddress - The address of the account for which to retrieve coin data.
 * @param args.options - Optional parameters for pagination and filtering the results.
 * @param args.options.offset - The number of items to skip before starting to collect the result set.
 * @param args.options.limit - The maximum number of items to return.
 * @param args.options.orderBy - The criteria for ordering the results.
 * @param args.options.where - Conditions to filter the results based on the current fungible asset balances.
 * @group Implementation
 */
export async function getAccountCoinsData(args: {
  aptosConfig: AptosConfig;
  accountAddress: AccountAddressInput;
  options?: PaginationArgs & OrderByArg<GetAccountCoinsDataResponse[0]> & WhereArg<CurrentFungibleAssetBalancesBoolExp>;
}): Promise<GetAccountCoinsDataResponse> {
  const { aptosConfig, accountAddress, options } = args;
  const address = AccountAddress.from(accountAddress).toStringLong();

  const whereCondition: { owner_address: { _eq: string } } = {
    ...options?.where,
    owner_address: { _eq: address },
  };

  const graphqlQuery = {
    query: GetAccountCoinsData,
    variables: {
      where_condition: whereCondition,
      offset: options?.offset,
      limit: options?.limit,
      order_by: options?.orderBy,
    },
  };

  const data = await queryIndexer<GetAccountCoinsDataQuery>({
    aptosConfig,
    query: graphqlQuery,
    originMethod: "getAccountCoinsData",
  });

  return data.current_fungible_asset_balances;
}

/**
 * Retrieves the count of fungible asset coins held by a specified account.
 *
 * @param args - The arguments for the function.
 * @param args.aptosConfig - The configuration settings for the Aptos network.
 * @param args.accountAddress - The address of the account for which to retrieve the coin count.
 * @throws Error if the count of account coins cannot be retrieved.
 * @group Implementation
 */
export async function getAccountCoinsCount(args: {
  aptosConfig: AptosConfig;
  accountAddress: AccountAddressInput;
}): Promise<number> {
  const { aptosConfig, accountAddress } = args;
  const address = AccountAddress.from(accountAddress).toStringLong();

  const graphqlQuery = {
    query: GetAccountCoinsCount,
    variables: { address },
  };

  const data = await queryIndexer<GetAccountCoinsCountQuery>({
    aptosConfig,
    query: graphqlQuery,
    originMethod: "getAccountCoinsCount",
  });

  if (!data.current_fungible_asset_balances_aggregate.aggregate) {
    throw Error("Failed to get the count of account coins");
  }

  return data.current_fungible_asset_balances_aggregate.aggregate.count;
}

/**
 * Retrieves the objects owned by a specified account.
 *
 * @param args - The parameters for the request.
 * @param args.aptosConfig - The configuration for the Aptos client.
 * @param args.accountAddress - The address of the account whose owned objects are to be retrieved.
 * @param args.options - Optional parameters for pagination and ordering of the results.
 * @param args.options.offset - The number of items to skip before starting to collect the result set.
 * @param args.options.limit - The maximum number of items to return.
 * @param args.options.orderBy - The criteria to order the results by.
 * @returns A promise that resolves to the current objects owned by the specified account.
 * @group Implementation
 */
export async function getAccountOwnedObjects(args: {
  aptosConfig: AptosConfig;
  accountAddress: AccountAddressInput;
  options?: PaginationArgs & OrderByArg<GetObjectDataQueryResponse[0]>;
}): Promise<GetObjectDataQueryResponse> {
  const { aptosConfig, accountAddress, options } = args;
  const address = AccountAddress.from(accountAddress).toStringLong();

  const whereCondition: { owner_address: { _eq: string } } = {
    owner_address: { _eq: address },
  };
  const graphqlQuery = {
    query: GetObjectData,
    variables: {
      where_condition: whereCondition,
      offset: options?.offset,
      limit: options?.limit,
      order_by: options?.orderBy,
    },
  };
  const data = await queryIndexer<GetObjectDataQuery>({
    aptosConfig,
    query: graphqlQuery,
    originMethod: "getAccountOwnedObjects",
  });

  return data.current_objects;
}

/**
 * Derives an account from the provided private key and Aptos configuration.
 * This function helps in obtaining the account details associated with a given private key,
 * considering both unified and legacy authentication schemes.
 *
 * NOTE: There is a potential issue once the unified single signer scheme is adopted by the community.
 * Because one could create two accounts with the same private key with this new authenticator type,
 * we’ll need to determine the order in which we look up the accounts: first unified scheme and then legacy scheme,
 * or first legacy scheme and then unified scheme.
 *
 * @param args - The arguments for deriving the account.
 * @param args.aptosConfig - The Aptos configuration used for account lookup.
 * @param args.privateKey - The private key used to derive the account.
 * @throws Error if the account cannot be derived from the private key.
 * @group Implementation
 */
export async function deriveAccountFromPrivateKey(args: {
  aptosConfig: AptosConfig;
  privateKey: PrivateKey;
}): Promise<Account> {
  const { aptosConfig, privateKey } = args;
  const publicKey = new AnyPublicKey(privateKey.publicKey());

  if (privateKey instanceof Secp256k1PrivateKey) {
    // private key is secp256k1, therefore we know it for sure uses a single signer key
    const authKey = AuthenticationKey.fromPublicKey({ publicKey });
    const address = authKey.derivedAddress();
    return Account.fromPrivateKey({ privateKey, address });
  }

  if (privateKey instanceof Ed25519PrivateKey) {
    // lookup single sender ed25519
    const singleSenderTransactionAuthenticatorAuthKey = AuthenticationKey.fromPublicKey({
      publicKey,
    });
    const isSingleSenderTransactionAuthenticator = await isAccountExist({
      authKey: singleSenderTransactionAuthenticatorAuthKey,
      aptosConfig,
    });
    if (isSingleSenderTransactionAuthenticator) {
      const address = singleSenderTransactionAuthenticatorAuthKey.derivedAddress();
      return Account.fromPrivateKey({ privateKey, address, legacy: false });
    }
    // lookup legacy ed25519
    const legacyAuthKey = AuthenticationKey.fromPublicKey({
      publicKey: publicKey.publicKey as Ed25519PublicKey,
    });
    const isLegacyEd25519 = await isAccountExist({ authKey: legacyAuthKey, aptosConfig });
    if (isLegacyEd25519) {
      const address = legacyAuthKey.derivedAddress();
      return Account.fromPrivateKey({ privateKey, address, legacy: true });
    }
  }
  // if we are here, it means we couldn't find an address with an
  // auth key that matches the provided private key
  throw new Error(`Can't derive account from private key ${privateKey}`);
}

/**
 * Checks if an account exists by verifying its information against the Aptos blockchain.
 *
 * @param args - The arguments for the function.
 * @param args.aptosConfig - The configuration for connecting to the Aptos blockchain.
 * @param args.authKey - The authentication key used to derive the account address.
 * @returns A promise that resolves to a boolean indicating whether the account exists.
 *
 * @throws Throws an Error if there is an issue while looking for account information.
 * @group Implementation
 */
export async function isAccountExist(args: { aptosConfig: AptosConfig; authKey: AuthenticationKey }): Promise<boolean> {
  const { aptosConfig, authKey } = args;
  const accountAddress = await lookupOriginalAccountAddress({
    aptosConfig,
    authenticationKey: authKey.derivedAddress(),
  });

  try {
    await getInfo({
      aptosConfig,
      accountAddress,
    });
    return true;
  } catch (error: any) {
    // account not found
    if (error.status === 404) {
      return false;
    }
    throw new Error(`Error while looking for an account info ${accountAddress.toString()}`);
  }
}
