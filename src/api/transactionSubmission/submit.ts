// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { submitTransaction } from "../../internal/transactionSubmission";
import { AccountAuthenticator, AnyRawTransaction, FeePayerRawTransaction } from "../../transactions";
import { PendingTransactionResponse } from "../../types";
import { AptosConfig } from "../aptosConfig";

/**
 * A class to handle all `Submit` transaction operations
 */
export class Submit {
  readonly config: AptosConfig;

  constructor(config: AptosConfig) {
    this.config = config;
  }

  transaction(args: {
    transaction: AnyRawTransaction;
    senderAuthenticator: AccountAuthenticator;
    feePayerAuthenticator?: AccountAuthenticator;
  }): Promise<PendingTransactionResponse> {
    if (args.transaction instanceof FeePayerRawTransaction) {
      if (!args.feePayerAuthenticator) {
        throw new Error("You are submitting a Fee Payer transaction but missing the feePayerAuthenticator");
      }
    }
    return submitTransaction({ aptosConfig: this.config, ...args });
  }

  multiAgentTransaction(args: {
    transaction: AnyRawTransaction;
    senderAuthenticator: AccountAuthenticator;
    additionalSignersAuthenticators: Array<AccountAuthenticator>;
    feePayerAuthenticator?: AccountAuthenticator;
  }): Promise<PendingTransactionResponse> {
    if (args.transaction instanceof FeePayerRawTransaction) {
      if (!args.feePayerAuthenticator) {
        throw new Error("You are submitting a Fee Payer transaction but missing the feePayerAuthenticator");
      }
    }
    return submitTransaction({ aptosConfig: this.config, ...args });
  }
}
