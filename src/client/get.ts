import { AptosConfig } from "../api/aptosConfig";
import { aptosRequest } from "./core";
import { AptosResponse, AnyNumber, ClientConfig, MimeType } from "../types";
import { AptosApiType } from "../utils/const";

/**
 * Options for making a GET request, including configuration for the API client.
 * @group Implementation
 * @category Client
 */
export type GetRequestOptions = {
  /**
   * The config for the API client
   * @group Implementation
   * @category Client
   */
  aptosConfig: AptosConfig;
  /**
   * The type of API endpoint to call e.g. fullnode, indexer, etc
   * @group Implementation
   * @category Client
   */
  type: AptosApiType;
  /**
   * The name of the API method
   * @group Implementation
   * @category Client
   */
  originMethod: string;
  /**
   * The URL path to the API method
   * @group Implementation
   * @category Client
   */
  path: string;
  /**
   * The content type of the request body
   * @group Implementation
   * @category Client
   */
  contentType?: MimeType;
  /**
   * The accepted content type of the response of the API
   * @group Implementation
   * @category Client
   */
  acceptType?: MimeType;
  /**
   * The query parameters for the request
   * @group Implementation
   * @category Client
   */
  params?: Record<string, string | AnyNumber | boolean | undefined>;
  /**
   * Specific client overrides for this request to override aptosConfig
   * @group Implementation
   * @category Client
   */
  overrides?: ClientConfig;
};

/**
 * Options for making a request to the Aptos API, excluding the "type" field.
 * @group Implementation
 * @category Client
 */
export type GetAptosRequestOptions = Omit<GetRequestOptions, "type">;

/**
 * Executes a GET request to retrieve data based on the provided options.
 *
 * @param options - The options for the GET request.
 * @param options.aptosConfig - The configuration object for Aptos requests.
 * @param options.overrides - Optional overrides for the request configuration.
 * @param options.params - Query parameters to include in the request.
 * @param options.contentType - The content type of the request.
 * @param options.acceptType - The accepted response type.
 * @param options.path - The specific path for the request.
 * @param options.originMethod - The original method of the request.
 * @param options.type - The type of request being made.
 * @returns The response from the GET request.
 * @group Implementation
 * @category Client
 */
export async function get<Req extends {}, Res extends {}>(
  options: GetRequestOptions,
): Promise<AptosResponse<Req, Res>> {
  const { aptosConfig, overrides, params, contentType, acceptType, path, originMethod, type } = options;
  const url = aptosConfig.getRequestUrl(type);

  return aptosRequest<Req, Res>(
    {
      url,
      method: "GET",
      originMethod,
      path,
      contentType,
      acceptType,
      params,
      overrides: {
        ...aptosConfig.clientConfig,
        ...overrides,
      },
    },
    aptosConfig,
    options.type,
  );
}

/**
 * Retrieves data from the Aptos full node using the provided options.
 *
 * @param options - The options for the request to the Aptos full node.
 * @param options.aptosConfig - Configuration settings specific to the Aptos client and full node.
 * @param options.aptosConfig.clientConfig - The client configuration settings.
 * @param options.aptosConfig.fullnodeConfig - The full node configuration settings.
 * @param options.overrides - Additional overrides for the request.
 * @param options.type - The type of API request being made.
 *
 * @returns A promise that resolves with the response from the Aptos full node.
 * @group Implementation
 * @category Client
 */
export async function getAptosFullNode<Req extends {}, Res extends {}>(
  options: GetAptosRequestOptions,
): Promise<AptosResponse<Req, Res>> {
  const { aptosConfig } = options;

  return get<Req, Res>({
    ...options,
    type: AptosApiType.FULLNODE,
    overrides: {
      ...aptosConfig.clientConfig,
      ...aptosConfig.fullnodeConfig,
      ...options.overrides,
      HEADERS: { ...aptosConfig.clientConfig?.HEADERS, ...aptosConfig.fullnodeConfig?.HEADERS },
    },
  });
}

/**
 * Makes a GET request to the Aptos Pepper service to retrieve data.
 *
 * @param options - The options for the request.
 * @param options.param1 - Description of param1.
 * @param options.param2 - Description of param2.
 * @returns AptosResponse - The response from the Aptos Pepper service.
 * @group Implementation
 * @category Client
 */
export async function getAptosPepperService<Req extends {}, Res extends {}>(
  options: GetAptosRequestOptions,
): Promise<AptosResponse<Req, Res>> {
  return get<Req, Res>({ ...options, type: AptosApiType.PEPPER });
}

/**
 * This function is a helper for paginating using a function wrapping an API
 * @group Implementation
 * @category Client
 */
export async function paginateWithCursor<Req extends Record<string, any>, Res extends Array<{}>>(
  options: GetAptosRequestOptions,
): Promise<Res> {
  const out: any[] = [];
  let cursor: string | undefined;
  const requestParams = options.params as { start?: string; limit?: number };
  do {
    // eslint-disable-next-line no-await-in-loop
    const response = await get<Req, Res>({
      type: AptosApiType.FULLNODE,
      aptosConfig: options.aptosConfig,
      originMethod: options.originMethod,
      path: options.path,
      params: requestParams,
      overrides: options.overrides,
    });
    /**
     * the cursor is a "state key" from the API perspective. Client
     * should not need to "care" what it represents but just use it
     * to query the next chunk of data.
     * @group Implementation
     * @category Client
     */
    cursor = response.headers["x-aptos-cursor"];
    // Now that we have the cursor (if any), we remove the headers before
    // adding these to the output of this function.
    delete response.headers;
    out.push(...response.data);
    requestParams.start = cursor;
  } while (cursor !== null && cursor !== undefined);
  return out as Res;
}

/// This function is a helper for paginating using a function wrapping an API using offset instead of start
export async function paginateWithObfuscatedCursor<Req extends Record<string, any>, Res extends Array<{}>>(
  options: GetAptosRequestOptions,
): Promise<Res> {
  const out: any[] = [];
  let cursor: string | undefined;
  const requestParams = options.params as { offset?: string; limit?: number };
  const totalLimit = requestParams.limit;
  do {
    // eslint-disable-next-line no-await-in-loop
    const response = await get<Req, Res>({
      type: AptosApiType.FULLNODE,
      aptosConfig: options.aptosConfig,
      originMethod: options.originMethod,
      path: options.path,
      params: requestParams,
      overrides: options.overrides,
    });
    /**
     * the cursor is a "state key" from the API perspective. Client
     * should not need to "care" what it represents but just use it
     * to query the next chunk of data.
     */
    cursor = response.headers["x-aptos-cursor"];
    // Now that we have the cursor (if any), we remove the headers before
    // adding these to the output of this function.
    delete response.headers;
    out.push(...response.data);
    requestParams.offset = cursor;

    // Re-evaluate length
    if (totalLimit !== undefined) {
      const newLimit = totalLimit - out.length;
      if (newLimit <= 0) {
        break;
      }
      requestParams.limit = newLimit;
    }
  } while (cursor !== null && cursor !== undefined);
  return out as Res;
}
