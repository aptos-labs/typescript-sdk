import {
  Account,
  AptosApiType,
  aptosRequest,
  generateSignedTransaction,
  GraphqlQuery,
  NetworkToIndexerAPI,
  NetworkToNodeAPI,
  U64,
} from "../../../src";
import { AptosApiError } from "../../../src/errors";
import { VERSION } from "../../../src/version";
import { longTestTimeout } from "../../unit/helper";
import { getAptosClient, normalizeAptosResponseHeaders } from "../helper";
import { singleSignerScriptBytecode } from "../transaction/helper";

const { aptos, config } = getAptosClient();

const fullnodeUrl = config.fullnode ?? NetworkToNodeAPI[config.network];
const indexerUrl = config.indexer ?? NetworkToIndexerAPI[config.network];

const dummyKey = "aptoslabs_secret1";

describe("aptos request", () => {
  describe("headers", () => {
    test(
      "call should include all expected headers",
      async () => {
        const sender = Account.generate();
        const receiverAccounts = Account.generate();
        await aptos.fundAccount({ accountAddress: sender.accountAddress, amount: 100_000_000 });
        const transaction = await aptos.transaction.build.simple({
          sender: sender.accountAddress,
          data: {
            bytecode: singleSignerScriptBytecode,
            functionArguments: [new U64(1), receiverAccounts.accountAddress],
          },
        });
        const authenticator = aptos.transaction.sign({
          signer: sender,
          transaction,
        });
        const signedTransaction = generateSignedTransaction({ transaction, senderAuthenticator: authenticator });
        try {
          const response = await aptosRequest(
            {
              url: fullnodeUrl,
              method: "POST",
              path: "transactions",
              body: signedTransaction,
              originMethod: "test request includes all headers",
              contentType: "application/x.aptos.signed_transaction+bcs",
              overrides: { HEADERS: { my: "header" } },
            },
            config,
            AptosApiType.FULLNODE,
          );
          const headers = normalizeAptosResponseHeaders(response.config.headers);
          expect(headers).toHaveProperty("x-aptos-client", `aptos-typescript-sdk/${VERSION}`);
          expect(headers).toHaveProperty("my", "header");
          expect(headers).toHaveProperty("content-type", "application/x.aptos.signed_transaction+bcs");
          expect(headers).toHaveProperty("x-aptos-typescript-sdk-origin-method", "test request includes all headers");
        } catch (error: any) {
          // should not get here
          // eslint-disable-next-line no-console
          console.log("Error in 'headers'", error);
          expect(true).toBe(false);
        }
      },
      longTestTimeout,
    );
  });

  describe("api key", () => {
    test(
      "should set api_token for full node requests",
      async () => {
        try {
          const response = await aptosRequest(
            {
              url: fullnodeUrl,
              method: "GET",
              path: "",
              overrides: { API_KEY: dummyKey },
              originMethod: "test when token is set",
            },
            config,
            AptosApiType.FULLNODE,
          );
          const headers = normalizeAptosResponseHeaders(response.config.headers);
          expect(headers).toHaveProperty("authorization", `Bearer ${dummyKey}`);
        } catch (error: any) {
          // should not get here
          // eslint-disable-next-line no-console
          console.log("Error in 'api_token for full node requests'", error);
          expect(true).toBe(false);
        }
      },
      longTestTimeout,
    );
  });

  describe("full node", () => {
    describe("200 response", () => {
      test(
        "when fullnode server returns 200 status code",
        async () => {
          try {
            const response = await aptosRequest(
              {
                url: fullnodeUrl,
                method: "GET",
                path: "accounts/0x1",
                originMethod: "test fullnode 200 status",
              },
              config,
              AptosApiType.FULLNODE,
            );
            expect(response).toHaveProperty("data", {
              sequence_number: "0",
              authentication_key: "0x0000000000000000000000000000000000000000000000000000000000000001",
            });
          } catch (error: any) {
            // should not get here
            // eslint-disable-next-line no-console
            console.log("Error in 'fullnode server returns 200 status code'", error);
            expect(true).toBe(false);
          }
        },
        longTestTimeout,
      );
    });

    describe("400 error", () => {
      test(
        "when server returns 400 status code",
        async () => {
          try {
            await aptosRequest(
              {
                url: fullnodeUrl,
                method: "GET",
                path: "transactions/by_hash/0x123",
                originMethod: "test 400 status",
              },
              config,
              AptosApiType.FULLNODE,
            );
          } catch (error: any) {
            expect(error).toBeInstanceOf(AptosApiError);
            expect(error.url).toBe(`${fullnodeUrl}/transactions/by_hash/0x123`);
            expect(error.status).toBe(400);
            expect(error.statusText).toBe("Bad Request");
            expect(error.data).toEqual({
              message:
                // eslint-disable-next-line quotes
                'failed to parse path `txn_hash`: failed to parse "string(HashValue)": unable to parse HashValue',
              error_code: "web_framework_error",
              vm_error_code: null,
            });
            expect(error.request).toEqual({
              url: `${fullnodeUrl}`,
              method: "GET",
              originMethod: "test 400 status",
              path: "transactions/by_hash/0x123",
            });
          }
        },
        longTestTimeout,
      );
      test(
        "when server returns 404 status code",
        async () => {
          try {
            await aptosRequest(
              {
                url: `${fullnodeUrl}`,
                method: "GET",
                path: "transactions/by_hash/0x23851af73879128b541bafad4b49d0b6f1ac0d49ed2400632d247135fbca7bea",
                originMethod: "test 404 status",
              },
              config,
              AptosApiType.FULLNODE,
            );
          } catch (error: any) {
            expect(error).toBeInstanceOf(AptosApiError);
            expect(error.url).toBe(
              `${fullnodeUrl}/transactions/by_hash/0x23851af73879128b541bafad4b49d0b6f1ac0d49ed2400632d247135fbca7bea`,
            );
            expect(error.status).toBe(404);
            expect(error.statusText).toBe("Not Found");
            expect(error.data).toEqual({
              message:
                "Transaction not found by Transaction hash(0x23851af73879128b541bafad4b49d0b6f1ac0d49ed2400632d247135fbca7bea)",
              error_code: "transaction_not_found",
              vm_error_code: null,
            });
            expect(error.request).toEqual({
              url: `${fullnodeUrl}`,
              method: "GET",
              originMethod: "test 404 status",
              path: "transactions/by_hash/0x23851af73879128b541bafad4b49d0b6f1ac0d49ed2400632d247135fbca7bea",
            });
          }
        },
        longTestTimeout,
      );

      test(
        "when server returns transaction submission error",
        async () => {
          try {
            await aptosRequest(
              {
                url: `${fullnodeUrl}`,
                method: "POST",
                path: "transactions",
                body: new Uint8Array([1, 2, 3]),
                originMethod: "test transaction submission error",
                contentType: "application/x.aptos.signed_transaction+bcs",
              },
              config,
              AptosApiType.FULLNODE,
            );
          } catch (error: any) {
            expect(error).toBeInstanceOf(AptosApiError);
            expect(error.url).toBe(`${fullnodeUrl}/transactions`);
            expect(error.status).toBe(400);
            expect(error.statusText).toBe("Bad Request");
            expect(error.data).toEqual({
              message: "Failed to deserialize input into SignedTransaction: unexpected end of input",
              error_code: "invalid_input",
              vm_error_code: null,
            });
            expect(error.request).toEqual({
              url: `${fullnodeUrl}`,
              method: "POST",
              originMethod: "test transaction submission error",
              path: "transactions",
              body: new Uint8Array([1, 2, 3]),
              contentType: "application/x.aptos.signed_transaction+bcs",
            });
          }
        },
        longTestTimeout,
      );
    });
  });

  describe("indexer", () => {
    describe("200 response", () => {
      test(
        "when indexer server returns 200 status code",
        async () => {
          try {
            const query: GraphqlQuery = {
              query: `query MyQuery {
                ledger_infos {
                  chain_id
                }
              }`,
            };
            const response = await aptosRequest(
              {
                url: `${indexerUrl}`,
                method: "POST",
                body: query,
                originMethod: "test indexer 200 status",
              },
              config,
              AptosApiType.INDEXER,
            );
            expect(response).toHaveProperty("data", {
              ledger_infos: [
                {
                  chain_id: 4,
                },
              ],
            });
          } catch (error: any) {
            // should not get here
            expect(true).toBe(false);
          }
        },
        longTestTimeout,
      );
    });
    describe("errors", () => {
      test(
        "test indexer 400 status",
        async () => {
          try {
            const query: GraphqlQuery = {
              query: `query MyQuery {
                ledger_inos {
                  chain_id
                }
              }`,
            };
            await aptosRequest(
              {
                url: `${indexerUrl}`,
                method: "POST",
                body: query,
                originMethod: "test indexer 400 status",
              },
              config,
              AptosApiType.INDEXER,
            );
          } catch (error: any) {
            expect(error).toBeInstanceOf(AptosApiError);
            expect(error.url).toBe(`${indexerUrl}`);
            expect(error.status).toBe(200);
            expect(error.statusText).toBe("OK");
            expect(error.data).toHaveProperty("errors");
            expect(error.data.errors).toEqual([
              {
                message: "field 'ledger_inos' not found in type: 'query_root'",
                extensions: { path: "$.selectionSet.ledger_inos", code: "validation-failed" },
              },
            ]);
            expect(error.request).toEqual({
              url: `${indexerUrl}`,
              method: "POST",
              originMethod: "test indexer 400 status",
              body: {
                query: `query MyQuery {
                ledger_inos {
                  chain_id
                }
              }`,
              },
            });
          }
        },
        longTestTimeout,
      );
    });
  });
});
