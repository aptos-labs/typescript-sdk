import { sha3_256 } from "@noble/hashes/sha3";
import { AccountAddress, AccountPublicKey } from "../core";
import { AbstractPublicKey, AbstractSignature } from "../core/crypto/abstraction";
import { SigningScheme, HexInput, FunctionInfo } from "../types";
import { Account } from "./Account";
import { AnyRawTransaction } from "../transactions/types";
import { generateSigningMessageForTransaction } from "../transactions/transactionBuilder/signingMessage";
import { AccountAuthenticatorAbstraction } from "../transactions/authenticator/account";

interface AbstractedAccountSignerConstructorArgs {
  accountAddress?: AccountAddress;
  signer: Account;
}

interface AbstractedAccountFunctionConstructorArgs {
  accountAddress: AccountAddress;
  signer: (signingMessage: HexInput) => HexInput;
}

type AbstractedAccountConstructorArgs = (
  | AbstractedAccountSignerConstructorArgs
  | AbstractedAccountFunctionConstructorArgs
) & {
  authenticationFunctionInfo: FunctionInfo;
};

export class AbstractedAccount extends Account {
  public readonly publicKey: AccountPublicKey;

  readonly accountAddress: AccountAddress;

  readonly authenticationFunctionInfo: FunctionInfo;

  readonly signingScheme = SigningScheme.SingleKey;

  constructor(args: AbstractedAccountConstructorArgs) {
    super();

    const { signer, authenticationFunctionInfo } = args;

    this.authenticationFunctionInfo = authenticationFunctionInfo;

    if (typeof signer === "function") {
      this.accountAddress = (args as AbstractedAccountFunctionConstructorArgs).accountAddress;
      this.publicKey = new AbstractPublicKey(this.accountAddress);
      this.sign = (message: HexInput) => new AbstractSignature(signer(message));
    } else {
      this.accountAddress = (args as AbstractedAccountSignerConstructorArgs).accountAddress ?? signer.accountAddress;
      this.publicKey = signer.publicKey;
      this.sign = (message: HexInput) => new AbstractSignature(signer.sign(message).bcsToBytes());
    }
  }

  signWithAuthenticator(message: HexInput): AccountAuthenticatorAbstraction {
    return new AccountAuthenticatorAbstraction(
      this.authenticationFunctionInfo,
      sha3_256(message),
      this.sign(message).bcsToBytes(),
    );
  }

  signTransactionWithAuthenticator(transaction: AnyRawTransaction): AccountAuthenticatorAbstraction {
    return this.signWithAuthenticator(generateSigningMessageForTransaction(transaction));
  }

  readonly sign: (message: HexInput) => AbstractSignature;

  signTransaction(transaction: AnyRawTransaction): AbstractSignature {
    return this.sign(generateSigningMessageForTransaction(transaction));
  }
}
