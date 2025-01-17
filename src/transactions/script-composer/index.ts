// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { TransactionComposer, initSync, wasm } from "@aptos-labs/script-composer-pack";
import { AptosApiType } from "../../utils";
import { AptosConfig } from "../../api/aptosConfig";
import { InputBatchedFunctionData } from "../types";
import { fetchMoveFunctionAbi, getFunctionParts, standardizeTypeTags } from "../transactionBuilder";
import { CallArgument } from "../../types";
import { convertCallArgument } from "../transactionBuilder/remoteAbi";

(async () => {
  initSync({ module: wasm });
})();

// A wrapper class around TransactionComposer, which is a WASM library compiled
// from aptos-core/aptos-move/script-composer.
//
// This class allows the SDK caller to build a transaction that invokes multiple Move functions
// and allow for arguments to be passed around.
export class AptosScriptComposer {
  private builder: TransactionComposer;

  private config: AptosConfig;

  constructor(aptosConfig: AptosConfig) {
    this.builder = TransactionComposer.single_signer();
    this.config = aptosConfig;
  }

  // Add a move function invocation to the TransactionComposer.
  //
  // Similar to how to create an entry function, the difference is that input arguments could
  // either be a `CallArgument` which represents an abstract value returned from a previous Move call
  // or the regular entry function arguments.
  //
  // The function would also return a list of `CallArgument` that can be passed on to future calls.
  async addBatchedCalls(input: InputBatchedFunctionData): Promise<CallArgument[]> {
    const { moduleAddress, moduleName, functionName } = getFunctionParts(input.function);
    const nodeUrl = this.config.getRequestUrl(AptosApiType.FULLNODE);

    // Load the calling module into the builder.
    await this.builder.load_module(nodeUrl, `${moduleAddress}::${moduleName}`);

    // Load the calling type arguments into the loader.
    if (input.typeArguments !== undefined) {
      for (const typeTag of input.typeArguments) {
        // eslint-disable-next-line no-await-in-loop
        await this.builder.load_type_tag(nodeUrl, typeTag.toString());
      }
    }
    const typeArguments = standardizeTypeTags(input.typeArguments);
    const functionAbi = await fetchMoveFunctionAbi(moduleAddress, moduleName, functionName, this.config);
    // Check the type argument count against the ABI
    if (typeArguments.length !== functionAbi.typeParameters.length) {
      throw new Error(
        `Type argument count mismatch, expected ${functionAbi.typeParameters.length}, received ${typeArguments.length}`,
      );
    }

    const functionArguments: CallArgument[] = input.functionArguments.map((arg, i) =>
      convertCallArgument(arg, functionName, functionAbi, i, typeArguments),
    );

    return this.builder.add_batched_call(
      `${moduleAddress}::${moduleName}`,
      functionName,
      typeArguments.map((arg) => arg.toString()),
      functionArguments,
    );
  }

  build(): Uint8Array {
    return this.builder.generate_batched_calls(true);
  }
}
