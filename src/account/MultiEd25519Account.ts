import { AccountAddress, AccountAddressInput } from "../core/accountAddress";
import { Ed25519PrivateKey } from "../core/crypto";
import { MultiEd25519PublicKey, MultiEd25519Signature } from "../core/crypto/multiEd25519";
import { AccountAuthenticatorMultiEd25519 } from "../transactions/authenticator/account";
import { generateSigningMessageForTransaction } from "../transactions/transactionBuilder/signingMessage";
import { AnyRawTransaction } from "../transactions/types";
import { HexInput, SigningScheme } from "../types";
import type { Account } from "./Account";

export interface MultiEd25519SignerConstructorArgs {
  publicKey: MultiEd25519PublicKey;
  privateKeys: Ed25519PrivateKey[];
  address?: AccountAddressInput;
}

export interface VerifyMultiEd25519SignatureArgs {
  message: HexInput;
  signature: MultiEd25519Signature;
}

/**
 * Signer implementation for the Multi-Ed25519 authentication scheme.
 *
 * Note: Generating a signer instance does not create the account on-chain.
 */
export class MultiEd25519Account implements Account {
  readonly publicKey: MultiEd25519PublicKey;

  readonly accountAddress: AccountAddress;

  readonly signingScheme = SigningScheme.MultiEd25519;

  /**
   * Private keys associated with the account
   */
  readonly privateKeys: Ed25519PrivateKey[];

  readonly signaturesBitmap: Uint8Array;

  // region Constructors

  constructor(args: MultiEd25519SignerConstructorArgs) {
    const { privateKeys, publicKey, address } = args;
    this.privateKeys = privateKeys;
    this.publicKey = publicKey;
    this.accountAddress = address ? AccountAddress.from(address) : this.publicKey.authKey().derivedAddress();

    // Get the index of each respective signer in the bitmap
    const bitPositions: number[] = [];
    for (const privateKey of privateKeys) {
      bitPositions.push(this.publicKey.getIndex(privateKey.publicKey()));
    }
    // Zip privateKeys and bit positions and sort privateKeys by bit positions in order
    // to ensure the signature is signed in ascending order according to the bitmap.
    // Authentication on chain will fail otherwise.
    const privateKeysAndBitPosition = privateKeys.map((signer, index) => [signer, bitPositions[index]] as const);
    privateKeysAndBitPosition.sort((a, b) => a[1] - b[1]);
    this.privateKeys = privateKeysAndBitPosition.map((value) => value[0]);
    this.signaturesBitmap = this.publicKey.createBitmap({ bits: bitPositions });
  }

  // endregion

  // region Account

  /**
   * Verify the given message and signature with the public key.
   *
   * @param args.message raw message data in HexInput format
   * @param args.signature signed message Signature
   * @returns
   */
  verifySignature(args: VerifyMultiEd25519SignatureArgs): boolean {
    return this.publicKey.verifySignature(args);
  }

  /**
   * Sign a message using the account's Ed25519 private key.
   * @param message the signing message, as binary input
   * @return the AccountAuthenticator containing the signature, together with the account's public key
   */
  signWithAuthenticator(message: HexInput): AccountAuthenticatorMultiEd25519 {
    return new AccountAuthenticatorMultiEd25519(this.publicKey, this.sign(message));
  }

  /**
   * Sign a transaction using the account's Ed25519 private keys.
   * @param transaction the raw transaction
   * @return the AccountAuthenticator containing the signature of the transaction, together with the account's public key
   */
  signTransactionWithAuthenticator(transaction: AnyRawTransaction): AccountAuthenticatorMultiEd25519 {
    return new AccountAuthenticatorMultiEd25519(this.publicKey, this.signTransaction(transaction));
  }

  /**
   * Sign the given message using the account's Ed25519 private keys.
   * @param message in HexInput format
   * @returns MultiEd25519Signature
   */
  sign(message: HexInput): MultiEd25519Signature {
    const signatures = [];
    for (const signer of this.privateKeys) {
      signatures.push(signer.sign(message));
    }
    return new MultiEd25519Signature({ signatures, bitmap: this.signaturesBitmap });
  }

  /**
   * Sign the given transaction using the available signing capabilities.
   * @param transaction the transaction to be signed
   * @returns Signature
   */
  signTransaction(transaction: AnyRawTransaction): MultiEd25519Signature {
    return this.sign(generateSigningMessageForTransaction(transaction));
  }

  // endregion
}
