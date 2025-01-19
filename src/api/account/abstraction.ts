import { AccountAddress, AccountAddressInput } from "../../core";
import {
  addDispatchableAuthenticationFunctionTransaction,
  removeDispatchableAuthenticationFunctionTransaction,
  removeDispatchableAuthenticatorTransaction,
} from "../../internal/abstraction";
import { view } from "../../internal/view";
import { InputGenerateTransactionOptions, TypeTagAddress } from "../../transactions";
import { FunctionInfo } from "../../types";
import { AptosConfig } from "../aptosConfig";

export class AccountAbstraction {
  constructor(readonly config: AptosConfig) {}

  /**
   * Adds a dispatchable authentication function to the account.
   *
   * @example
   * ```ts
   * const txn = await aptos.account.abstraction.addDispatchableAuthenticationFunctionTransaction({
   *   accountAddress: alice.accountAddress,
   *   authenticationFunctionInfo: {
   *     moduleAddress: alice.accountAddress,
   *     moduleName: "any_authenticator",
   *     functionName: "authenticate",
   *   },
   * });
   *
   * const txn =  await aptos.signAndSubmitTransaction({ signer: alice, transaction});
   * await aptos.waitForTransaction({ transactionHash: txn.hash });
   * ```
   *
   * @param args.accountAddress - The account to add the authentication function to.
   * @param args.authenticationFunctionInfo - The authentication function info to add.
   * @param args.options - The options for the transaction.
   * @returns A transaction to add the authentication function to the account.
   */
  public async addDispatchableAuthenticationFunctionTransaction(args: {
    accountAddress: AccountAddressInput;
    authenticationFunctionInfo: FunctionInfo;
    options?: InputGenerateTransactionOptions;
  }) {
    const {
      accountAddress,
      authenticationFunctionInfo: { moduleAddress, moduleName, functionName },
      options,
    } = args;
    return addDispatchableAuthenticationFunctionTransaction({
      aptosConfig: this.config,
      authenticationFunctionInfo: { moduleAddress, moduleName, functionName },
      sender: accountAddress,
      options,
    });
  }

  /**
   * Removes a dispatchable authentication function from the account.
   *
   * @example
   * ```ts
   * const txn = await aptos.account.abstraction.removeDispatchableAuthenticationFunctionTransaction({
   *   accountAddress: alice.accountAddress,
   *   authenticationFunctionInfo: {
   *     moduleAddress: alice.accountAddress,
   *     moduleName: "any_authenticator",
   *     functionName: "authenticate",
   *   },
   * });
   *
   * const txn = await aptos.signAndSubmitTransaction({ signer: alice, transaction: txn });
   * await aptos.waitForTransaction({ transactionHash: txn.hash });
   * ```
   *
   * @param args.accountAddress - The account to remove the authentication function from.
   * @param args.authenticationFunctionInfo - The authentication function info to remove.
   * @param args.options - The options for the transaction.
   * @returns A transaction to remove the authentication function from the account.
   */
  public async removeDispatchableAuthenticationFunctionTransaction(args: {
    accountAddress: AccountAddressInput;
    authenticationFunctionInfo: FunctionInfo;
    options?: InputGenerateTransactionOptions;
  }) {
    const { accountAddress, authenticationFunctionInfo, options } = args;
    return removeDispatchableAuthenticationFunctionTransaction({
      aptosConfig: this.config,
      sender: accountAddress,
      authenticationFunctionInfo,
      options,
    });
  }

  /**
   * Removes a dispatchable authenticator from the account.
   *
   * @example
   * ```ts
   * const txn = await aptos.account.abstraction.removeDispatchableAuthenticatorTransaction({
   *   accountAddress: alice.accountAddress,
   * });
   *
   * const txn = await aptos.signAndSubmitTransaction({ signer: alice, transaction: txn });
   * await aptos.waitForTransaction({ transactionHash: txn.hash });
   * ```
   *
   * @param args.accountAddress - The account to remove the authenticator from.
   * @param args.options - The options for the transaction.
   * @returns A transaction to remove the authenticator from the account.
   */
  public async removeDispatchableAuthenticatorTransaction(args: {
    accountAddress: AccountAddressInput;
    options?: InputGenerateTransactionOptions;
  }) {
    const { accountAddress, options } = args;
    return removeDispatchableAuthenticatorTransaction({ aptosConfig: this.config, sender: accountAddress, options });
  }

  /**
   * Gets the dispatchable authentication function for the account.
   *
   * @example
   * ```ts
   * const functionInfos = await aptos.account.abstraction.getDispatchableAuthenticationFunction({
   *   accountAddress: alice.accountAddress,
   * });
   *
   * if (functionInfos) {
   *   console.log(`Account ${alice.accountAddress.toString()} is using account abstraction!`);
   * } else {
   *   console.log(`Account ${alice.accountAddress.toString()} is not using account abstraction.`);
   * }
   * ```
   *
   * @param args.accountAddress - The account to get the dispatchable authentication function for.
   * @returns The dispatchable authentication function for the account.
   */
  public async getDispatchableAuthenticationFunction(args: { accountAddress: AccountAddressInput }) {
    const { accountAddress } = args;
    const [{ vec: functionInfoOption }] = await view<
      [{ vec: { function_name: string; module_name: string; module_address: string }[][] }]
    >({
      aptosConfig: this.config,
      payload: {
        function: "0x1::account_abstraction::dispatchable_authenticator",
        functionArguments: [AccountAddress.from(accountAddress)],
        abi: { typeParameters: [], parameters: [new TypeTagAddress()], returnTypes: [] },
      },
    });

    if (functionInfoOption.length === 0) return undefined;

    return functionInfoOption[0].map((functionInfo) => ({
      moduleAddress: AccountAddress.fromString(functionInfo.module_address),
      moduleName: functionInfo.module_name,
      functionName: functionInfo.function_name,
    }));
  }

  /**
   * Will return the authentication function if the account is abstracted, otherwise undefined.
   *
   * @example
   * ```ts
   * const isAccountAbstractionEnabled = await aptos.account.abstraction.isAccountAbstractionEnabled({
   *   accountAddress: alice.accountAddress,
   *   authenticationFunctionInfo: {
   *     moduleAddress: alice.accountAddress,
   *     moduleName: "any_authenticator",
   *     functionName: "authenticate",
   *   },
   * });
   * if (isAccountAbstractionEnabled) {
   *   console.log(`Account ${alice.accountAddress.toString()} is using account abstraction!`);
   * } else {
   *   console.log(`Account ${alice.accountAddress.toString()} is not using account abstraction.`);
   * }
   * ```
   *
   * @param args.accountAddress - The account to check.
   * @returns The authentication function if the account is abstracted, otherwise undefined.
   */
  public isAccountAbstractionEnabled = async (args: {
    accountAddress: AccountAddressInput;
    authenticationFunctionInfo?: FunctionInfo;
  }) => {
    const functionInfos = await this.getDispatchableAuthenticationFunction(args);
    return functionInfos?.some(
      (functionInfo) =>
        args.authenticationFunctionInfo?.moduleAddress.equals(functionInfo.moduleAddress) &&
        args.authenticationFunctionInfo?.moduleName === functionInfo.moduleName &&
        args.authenticationFunctionInfo?.functionName === functionInfo.functionName,
    );
  };

  /**
   * Creates a transaction to enable account abstraction with the given authentication function.
   *
   * @example
   * ```ts
   * const txn = await aptos.account.abstraction.enableAccountAbstractionTransaction({
   *   accountAddress: alice.accountAddress,
   *   authenticationFunctionInfo: {
   *     moduleAddress: alice.accountAddress,
   *     moduleName: "any_authenticator",
   *     functionName: "authenticate",
   *   },
   * });
   *
   * const txn = await aptos.signAndSubmitTransaction({ signer: alice, transaction: txn });
   * await aptos.waitForTransaction({ transactionHash: txn.hash });
   * ```
   *
   * @param args.accountAddress - The account to enable account abstraction for.
   * @param args.authenticationFunctionInfo - The authentication function info to use.
   * @param args.options - The options for the transaction.
   * @returns A transaction to enable account abstraction for the account.
   */
  public enableAccountAbstractionTransaction = this.addDispatchableAuthenticationFunctionTransaction;

  /**
   * Creates a transaction to disable account abstraction. If an authentication function is provided, it will specify to
   * remove the authentication function.
   *
   * @example
   * ```ts
   * const txn = await aptos.account.abstraction.disableAccountAbstractionTransaction({
   *   accountAddress: alice.accountAddress,
   *   authenticationFunctionInfo: {
   *     moduleAddress: alice.accountAddress,
   *     moduleName: "any_authenticator",
   *     functionName: "authenticate",
   *   },
   * });
   *
   * const txn = await aptos.signAndSubmitTransaction({ signer: alice, transaction: txn });
   * await aptos.waitForTransaction({ transactionHash: txn.hash });
   * ```
   *
   * @param args.accountAddress - The account to disable account abstraction for.
   * @param args.authenticationFunctionInfo - The authentication function info to remove.
   * @param args.options - The options for the transaction.
   * @returns A transaction to disable account abstraction for the account.
   */
  public disableAccountAbstractionTransaction = async (args: {
    accountAddress: AccountAddressInput;
    authenticationFunctionInfo?: FunctionInfo;
    options?: InputGenerateTransactionOptions;
  }) => {
    const { accountAddress, authenticationFunctionInfo, options } = args;
    if (authenticationFunctionInfo) {
      return this.removeDispatchableAuthenticationFunctionTransaction({
        accountAddress,
        authenticationFunctionInfo,
        options,
      });
    }
    return this.removeDispatchableAuthenticatorTransaction({ accountAddress, options });
  };
}
