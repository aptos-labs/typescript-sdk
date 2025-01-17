import { Aptos, AptosConfig, Network, NetworkToNetworkName } from "../../src";

/**
 * Use this function whenever you want an Aptos client.
 *
 * By default it uses Network.LOCAL. You can change this in one of two ways:
 *
 * 1. If you set the APTOS_NETWORK env var, it will use that Network. For example,
 *    export APTOS_NETWORK=devnet.
 * 2. For more control, you can set the APTOS_NODE_API_URL, APTOS_INDEXER_API_URL, and
 *    APTOS_FAUCET_API_URL env vars.
 *
 * The APTOS_NETWORK env var is applied first, followed by the others. So if you set
 * APTOS_NETWORK=devnet and APTOS_NODE_API_URL=http://localhost:8080, it will use the
 * given URL for the node API and the default URLs for devnet for the other APIs.
 */
export function getAptosClient(additionalConfig?: Partial<AptosConfig>): { aptos: Aptos; config: AptosConfig } {
  const networkRaw = process.env.APTOS_NETWORK;
  const network = networkRaw ? NetworkToNetworkName[networkRaw] : Network.LOCAL;
  if (!network) {
    throw new Error(`Unknown network, confirm APTOS_NETWORK env var is valid: ${networkRaw}`);
  }
  const config = new AptosConfig({
    network,
    fullnode: process.env.APTOS_NODE_API_URL,
    indexer: process.env.APTOS_INDEXER_API_URL,
    faucet: process.env.APTOS_FAUCET_API_URL,
    ...additionalConfig,
  });
  const aptos = new Aptos(config);
  return { aptos, config };
}
