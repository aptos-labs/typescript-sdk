import {
  SimpleTransaction,
  InputGenerateTransactionOptions,
  TypeTagAddress,
  TypeTagStruct,
  stringStructTag,
} from "../transactions";
import { AptosConfig } from "../api";
import { AccountAddressInput } from "../core";
import { generateTransaction } from "./transactionSubmission";
import { FunctionInfo } from "../types";

export async function addDispatchableAuthenticationFunctionTransaction(args: {
  aptosConfig: AptosConfig;
  sender: AccountAddressInput;
  authenticationFunctionInfo: FunctionInfo;
  options?: InputGenerateTransactionOptions;
}): Promise<SimpleTransaction> {
  const {
    aptosConfig,
    sender,
    authenticationFunctionInfo: { moduleName, moduleAddress, functionName },
    options,
  } = args;
  return generateTransaction({
    aptosConfig,
    sender,
    data: {
      function: "0x1::account_abstraction::add_dispatchable_authentication_function",
      typeArguments: [],
      functionArguments: [moduleAddress, moduleName, functionName],
      abi: {
        typeParameters: [],
        parameters: [new TypeTagAddress(), new TypeTagStruct(stringStructTag()), new TypeTagStruct(stringStructTag())],
      },
    },
    options,
  });
}

export async function removeDispatchableAuthenticationFunctionTransaction(args: {
  aptosConfig: AptosConfig;
  sender: AccountAddressInput;
  authenticationFunctionInfo: FunctionInfo;
  options?: InputGenerateTransactionOptions;
}) {
  const {
    aptosConfig,
    sender,
    authenticationFunctionInfo: { moduleName, moduleAddress, functionName },
    options,
  } = args;
  return generateTransaction({
    aptosConfig,
    sender,
    data: {
      function: "0x1::account_abstraction::remove_dispatchable_authentication_function",
      typeArguments: [],
      functionArguments: [moduleAddress, moduleName, functionName],
      abi: {
        typeParameters: [],
        parameters: [new TypeTagAddress(), new TypeTagStruct(stringStructTag()), new TypeTagStruct(stringStructTag())],
      },
    },
    options,
  });
}

export async function removeDispatchableAuthenticatorTransaction(args: {
  aptosConfig: AptosConfig;
  sender: AccountAddressInput;
  options?: InputGenerateTransactionOptions;
}) {
  const { aptosConfig, sender, options } = args;
  return generateTransaction({
    aptosConfig,
    sender,
    data: {
      function: "0x1::account_abstraction::remove_dispatchable_authenticator",
      typeArguments: [],
      functionArguments: [],
      abi: { typeParameters: [], parameters: [] },
    },
    options,
  });
}
