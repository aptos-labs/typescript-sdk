// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { Account } from "../core";
import { transferCoinTransaction } from "../internal/coin";
import { SingleSignerTransaction, GenerateTransactionOptions } from "../transactions/types";
import { AnyNumber, HexInput, MoveResourceType } from "../types";
import { AptosConfig } from "./aptos_config";

/**
 * A class to handle all `Coin` operations
 */
export class Coin {
  readonly config: AptosConfig;

  constructor(config: AptosConfig) {
    this.config = config;
  }

  /**
   * Generate a transfer coin transaction that can be simulated and/or signed and submitted
   *
   * @param args.sender The sender account
   * @param args.recipient The recipient address
   * @param args.amount The amount to transfer
   * @param args.coinType optional. The coin struct type to transfer. Default to 0x1::aptos_coin::AptosCoin
   *
   * @returns SingleSignerTransaction
   */
  async transferCoinTransaction(args: {
    sender: Account;
    recipient: HexInput;
    amount: AnyNumber;
    coinType?: MoveResourceType;
    options?: GenerateTransactionOptions;
  }): Promise<SingleSignerTransaction> {
    const response = await transferCoinTransaction({ aptosConfig: this.config, ...args });
    return response;
  }
}
