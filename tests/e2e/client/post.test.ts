import {
  AptosConfig,
  GraphqlQuery,
  postAptosIndexer,
  postAptosFullNode,
  U8,
  postAptosFaucet,
  Account,
  InputViewFunctionData,
} from "../../../src";
import { GetChainTopUserTransactionsQuery } from "../../../src/types/generated/operations";
import { GetChainTopUserTransactions } from "../../../src/types/generated/queries";
import { getAptosClient, normalizeAptosResponseHeaders } from "../helper";

function getAptosConfig(): AptosConfig {
  const partialConfig = {
    clientConfig: {
      HEADERS: { clientConfig: "clientConfig-header" },
      API_KEY: "api-key",
    },
    fullnodeConfig: { HEADERS: { fullnodeHeader: "fullnode-header" } },
    indexerConfig: { HEADERS: { indexerHeader: "indexer-header" } },
    faucetConfig: { HEADERS: { faucetHeader: "faucet-header" }, AUTH_TOKEN: "auth-token" },
  };
  const { config } = getAptosClient(partialConfig);
  return config;
}

describe("post request", () => {
  describe("indexer", () => {
    test("it sets correct headers", async () => {
      const response = await postAptosIndexer<GraphqlQuery, GetChainTopUserTransactionsQuery>({
        aptosConfig: getAptosConfig(),
        originMethod: "testQueryIndexer",
        path: "",
        body: {
          query: GetChainTopUserTransactions,
          variables: { limit: 5 },
        },
        overrides: { WITH_CREDENTIALS: false },
      });
      const headers = normalizeAptosResponseHeaders(response.config.headers);
      expect(headers).toHaveProperty("clientconfig");
      expect(headers.clientconfig).toEqual("clientConfig-header");
      expect(headers).toHaveProperty("authorization");
      expect(headers.authorization).toEqual("Bearer api-key");
      expect(headers).toHaveProperty("indexerheader");
      expect(headers.indexerheader).toEqual("indexer-header");
      // Properties that should not be included
      expect(headers).not.toHaveProperty("fullnodeheader");
      expect(headers).not.toHaveProperty("faucetheader");
    });
  });
  describe("fullnode", () => {
    test("it sets correct headers on post request", async () => {
      const response = await postAptosFullNode<InputViewFunctionData, U8>({
        aptosConfig: getAptosConfig(),
        originMethod: "testPostFullnodeQuery",
        path: "view",
        body: {
          function: "0x1::chain_status::is_operating",
          type_arguments: [],
          arguments: [],
        },
      });
      // Normalize axios headers to an object for browser environment
      const headers = normalizeAptosResponseHeaders(response.config.headers);
      expect(headers).toHaveProperty("clientconfig");
      expect(headers.clientconfig).toEqual("clientConfig-header");
      expect(headers).toHaveProperty("authorization");
      expect(headers.authorization).toEqual("Bearer api-key");
      expect(headers).toHaveProperty("fullnodeheader");
      expect(headers.fullnodeheader).toEqual("fullnode-header");
      // Properties that should not be included
      expect(headers).not.toHaveProperty("indexerheader");
      expect(headers).not.toHaveProperty("faucetheader");
    });
  });
  describe("faucet", () => {
    test("it sets correct headers", async () => {
      const account = Account.generate();
      const response = await postAptosFaucet<any, { txn_hashes: Array<string> }>({
        aptosConfig: getAptosConfig(),
        path: "fund",
        body: {
          address: account.accountAddress.toString(),
          amount: 1000,
        },
        originMethod: "testQueryFaucet",
      });
      const headers = normalizeAptosResponseHeaders(response.config.headers);
      expect(headers).toHaveProperty("clientconfig");
      expect(headers.clientconfig).toEqual("clientConfig-header");
      expect(headers).toHaveProperty("authorization");
      expect(headers.authorization).toEqual("Bearer auth-token");
      expect(headers).toHaveProperty("faucetheader");
      expect(headers.faucetheader).toEqual("faucet-header");
      // Properties that should not be included
      expect(headers).not.toHaveProperty("fullnodeheader");
      expect(headers).not.toHaveProperty("indexerheader");
    });
  });
});
