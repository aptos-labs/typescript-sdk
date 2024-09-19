// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { p256, secp256r1 } from "@noble/curves/p256";
import { sha256 } from "@noble/hashes/sha256";
import { HDKey } from "@scure/bip32";
import { bufferToBase64URLString } from "@simplewebauthn/browser";
import { Deserializer, Serializable, Serializer } from "../../bcs";
import { AnyPublicKeyVariant, HexInput, SigningScheme } from "../../types";
import { AuthenticationKey } from "../authenticationKey";
import { Hex } from "../hex";
import { isValidBIP44Path, mnemonicToSeed } from "./hdKey";
import { PrivateKey } from "./privateKey";
import { AccountPublicKey, PublicKey, VerifySignatureArgs } from "./publicKey";
import { Signature } from "./signature";
import { convertSigningMessage } from "./utils";
import type { WebAuthnSignature } from "./webauthn";

export interface RecoverPasskeyPublicKeyArgsInput {
  authenticatorData: Uint8Array;
  clientDataJSON: Uint8Array;
  signature: Uint8Array;
}

/**
 * Recover Passkey Public Key Args
 *
 *
 */
export type RecoverPasskeyPublicKeyArgs = [RecoverPasskeyPublicKeyArgsInput, RecoverPasskeyPublicKeyArgsInput];

export interface RecoverPublicKeyArgsInput {
  message: Uint8Array;
  signature: Uint8Array;
}

export type RecoverPublicKeyArgs = [RecoverPublicKeyArgsInput, RecoverPublicKeyArgsInput]
/**
 * Represents the Secp256r1 public key
 *
 * Secp256r1 authentication key is represented in the SDK as `AnyPublicKey`.  It is used to verify WebAuthnSignatures.
 */
export class Secp256r1PublicKey extends AccountPublicKey {
  // Secp256r1 ecdsa public keys contain a prefix indicating compression and two 32-byte coordinates.
  static readonly LENGTH: number = 65;

  // Hex value of the public key
  private readonly key: Hex;

  /**
   * Create a new PublicKey instance from a Uint8Array or String.
   *
   * @param hexInput A HexInput (string or Uint8Array)
   */
  constructor(hexInput: HexInput) {
    super();

    const hex = Hex.fromHexInput(hexInput);
    if (hex.toUint8Array().length !== Secp256r1PublicKey.LENGTH) {
      throw new Error(`PublicKey length should be ${Secp256r1PublicKey.LENGTH}`);
    }
    this.key = hex;
  }

  /**
   * Get the public key in bytes (Uint8Array).
   *
   * @returns Uint8Array representation of the public key
   */
  toUint8Array(): Uint8Array {
    return this.key.toUint8Array();
  }

  /**
   * Get the public key as a hex string with the 0x prefix.
   *
   * @returns string representation of the public key
   */
  toString(): string {
    return this.key.toString();
  }

  /**
   * Verifies a signed data with a public key
   *
   * @param args.message message
   * @param args.signature The signature
   * @returns true if the signature is valid
   */
  verifySignature(args: VerifySignatureArgs): boolean {
    const { message, signature } = args;
    if (!(signature instanceof Secp256r1Signature)) {
      return false;
    }

    const messageToVerify = convertSigningMessage(message);
    const messageBytes = Hex.fromHexInput(messageToVerify).toUint8Array();
    const messageShaBytes = sha256(messageBytes);
    const signatureBytes = signature.toUint8Array();
    return p256.verify(signatureBytes, messageShaBytes, this.toUint8Array());
  }

  /**
   * Verifies a signed data with a public key
   *
   * @param args.message message
   * @param args.signature The signature
   * @returns true if the signature is valid
   */
  verifyWebAuthnSignature(args: { message: HexInput; signature: WebAuthnSignature }): boolean {
    const { message, signature } = args;

    if (!(signature.paar.signature.signature instanceof Secp256r1Signature)) {
      throw new Error("Attestation signature is not a Secp256r1Signature");
    }

    // Check challenge
    const { challenge } = signature.getCollectedClientData();

    const messageBase64URLString = bufferToBase64URLString(Hex.fromHexInput(message).toUint8Array());
    if (challenge !== messageBase64URLString) {
      return false;
    }

    // Get verification data.
    const verificationData = signature.getVerificationData();

    // Verify the the signature is the signed verification data.
    return this.verifySignature({ message: verificationData, signature: signature.paar.signature.signature });
  }

  authKey(): AuthenticationKey {
    const serializer = new Serializer();
    serializer.serializeU32AsUleb128(AnyPublicKeyVariant.Secp256r1);
    serializer.serializeFixedBytes(this.bcsToBytes());
    return AuthenticationKey.fromSchemeAndBytes({
      scheme: SigningScheme.SingleKey,
      input: serializer.toUint8Array(),
    });
  }

  serialize(serializer: Serializer): void {
    serializer.serializeBytes(this.key.toUint8Array());
  }

  static deserialize(deserializer: Deserializer): Secp256r1PublicKey {
    const bytes = deserializer.deserializeBytes();
    return new Secp256r1PublicKey(bytes);
  }

  static load(deserializer: Deserializer): Secp256r1PublicKey {
    const bytes = deserializer.deserializeBytes();
    return new Secp256r1PublicKey(bytes);
  }

  static isInstance(publicKey: PublicKey): publicKey is Secp256r1PublicKey {
    return "key" in publicKey && (publicKey.key as any)?.data?.length === Secp256r1PublicKey.LENGTH;
  }

  /**
   * Recover Secp256r1 Ecdsa Public Key from Passkey Signature
   *
   * @param args RecoverPasskeyPublicKeyArgsInput
   * @returns Secp256r1PublicKey[]
   *
   * @see https://github.com/ethereum/js-ethereum-cryptography/blob/9faadf5f1dda4aa95cc675d927281862ac7bf7e7/src/secp256k1-compat.ts#L47
   */
  static async recoverPasskeyPublicKey({
    clientDataJSON,
    authenticatorData,
    signature,
  }: RecoverPasskeyPublicKeyArgsInput): Promise<Secp256r1PublicKey[]> {
    const shaClientDataJSON = sha256(clientDataJSON);

    // Construct verificationData, where verificationData is defined as
    // verificationData = authenticator_data || sha256(clientDataJson)
    // https://www.w3.org/TR/webauthn-3/#sctn-verifying-assertion
    const verificationData = new Uint8Array([...authenticatorData, ...shaClientDataJSON]);
    return await Secp256r1PublicKey.recoverPublicKey({ message: verificationData, signature });
  }

  /**
   * Recover Secp256r1 Ecdsa Public Key from Passkey Signature
   *
   * @param args RecoverPasskeyPublicKeyArgs
   * @returns Secp256r1PublicKey
   *
   * @see https://github.com/ethereum/js-ethereum-cryptography/blob/9faadf5f1dda4aa95cc675d927281862ac7bf7e7/src/secp256k1-compat.ts#L47
   */
  static async recoverPasskeyPublicKeyFromTwoSignatures(
    args: RecoverPasskeyPublicKeyArgs,
  ): Promise<Secp256r1PublicKey[]> {
    let publicKeys: HexInput[] = [];

    for (const { authenticatorData, clientDataJSON, signature } of args) {
      let recoveredPublicKeys = await Secp256r1PublicKey.recoverPasskeyPublicKey({
        clientDataJSON,
        authenticatorData,
        signature,
      });
      recoveredPublicKeys.map((publicKey) => publicKeys.push(publicKey.toString()));
    }

    // Public Key needs to appear more than once in the list
    const commonKeys = [...new Set(publicKeys.filter((item, i, arr) => arr.indexOf(item) !== i))];
    return commonKeys.map((key) => new Secp256r1PublicKey(key));
  }

  /**
   * Recover Secp256r1 Ecdsa Public Key from Signature
   *
   * @param authenticatorData authenticatorData
   * @param clientDataJSON clientDataJSON
   * @param signature signature
   * @returns Secp256r1PublicKey
   *
   * @see https://github.com/ethereum/js-ethereum-cryptography/blob/9faadf5f1dda4aa95cc675d927281862ac7bf7e7/src/secp256k1-compat.ts#L47
   */
  static async recoverPublicKey({ message, signature }: RecoverPublicKeyArgsInput): Promise<Secp256r1PublicKey[]> {
    const publicKeys: Secp256r1PublicKey[] = [];
    const msgHash = sha256(message);
    const sig = secp256r1.Signature.fromCompact(signature);

    // TODO Double check recovery bit logic
    // Cycle through all potential recovery bits (0, 1, 2, 3)
    // to recover the one that is correct for the given signature
    for (let recid = 0; recid < 4; recid++) {
      try {
        let publicKey = sig.addRecoveryBit(recid).recoverPublicKey(msgHash);
        let secp256r1PublicKey = new Secp256r1PublicKey(publicKey.toRawBytes(false));

        // If the Public Key verifies the signature correctly, add it to the publicKeys
        if (p256.verify(signature, msgHash, secp256r1PublicKey.toUint8Array())) {
          publicKeys.push(secp256r1PublicKey);
        }
      } catch (err) {
        // Ignore and continue
      }
    }

    return publicKeys;
  }

  /**
   * Recover Secp256r1 Ecdsa Public Key from Signature
   *
   * @returns Secp256r1PublicKey
   *
   * @see https://github.com/ethereum/js-ethereum-cryptography/blob/9faadf5f1dda4aa95cc675d927281862ac7bf7e7/src/secp256k1-compat.ts#L47
   * @param args {RecoverPublicKeyArgs}
   */
  static async recoverPublicKeyFromTwoSignatures(args: RecoverPublicKeyArgs): Promise<Secp256r1PublicKey[]> {
    let publicKeys: HexInput[] = [];

    for (const { message, signature } of args) {
      let recoveredPublicKeys = await Secp256r1PublicKey.recoverPublicKey({ message, signature });
      recoveredPublicKeys.map((publicKey) => publicKeys.push(publicKey.toString()));
    }

    // Public Key needs to appear more than once in the list
    const commonKeys = [...new Set(publicKeys.filter((item, i, arr) => arr.indexOf(item) !== i))];
    return commonKeys.map((key) => new Secp256r1PublicKey(key));
  }
}

/**
 * A Secp256r1 ecdsa private key - this is only used for test purposes as signing is done via passkeys
 */
export class Secp256r1PrivateKey extends Serializable implements PrivateKey {
  /**
   * Length of Secp256r1 ecdsa private key
   */
  static readonly LENGTH: number = 32;

  /**
   * The private key bytes
   * @private
   */
  private readonly key: Hex;

  /**
   * Create a new PrivateKey instance from a Uint8Array or String.
   *
   * @param hexInput A HexInput (string or Uint8Array)
   */
  constructor(hexInput: HexInput) {
    super();

    const privateKeyHex = Hex.fromHexInput(hexInput);
    if (privateKeyHex.toUint8Array().length !== Secp256r1PrivateKey.LENGTH) {
      throw new Error(`PrivateKey length should be ${Secp256r1PrivateKey.LENGTH}`);
    }

    this.key = privateKeyHex;
  }

  /**
   * Derives a private key from a mnemonic seed phrase.
   *
   * @param path the BIP44 path
   * @param mnemonics the mnemonic seed phrase
   *
   * @returns The generated key
   */
  static fromDerivationPath(path: string, mnemonics: string): Secp256r1PrivateKey {
    if (!isValidBIP44Path(path)) {
      throw new Error(`Invalid derivation path ${path}`);
    }
    return Secp256r1PrivateKey.fromDerivationPathInner(path, mnemonicToSeed(mnemonics));
  }

  /**
   * A private inner function so we can separate from the main fromDerivationPath() method
   * to add tests to verify we create the keys correctly.
   *
   * @param path the BIP44 path
   * @param seed the seed phrase created by the mnemonics
   *
   * @returns The generated key
   */
  private static fromDerivationPathInner(path: string, seed: Uint8Array): Secp256r1PrivateKey {
    const { privateKey } = HDKey.fromMasterSeed(seed).derive(path);
    // library returns privateKey as Uint8Array | null
    if (privateKey === null) {
      throw new Error("Invalid key");
    }

    return new Secp256r1PrivateKey(privateKey);
  }

  /**
   * Get the private key in bytes (Uint8Array).
   *
   * @returns
   */
  toUint8Array(): Uint8Array {
    return this.key.toUint8Array();
  }

  /**
   * Get the private key as a hex string with the 0x prefix.
   *
   * @returns string representation of the private key
   */
  toString(): string {
    return this.key.toString();
  }

  /**
   * Sign the given message with the private key.
   *
   * @param message in HexInput format
   * @returns Signature
   */
  sign(message: HexInput): Secp256r1Signature {
    const messageToSign = convertSigningMessage(message);
    const messageBytes = Hex.fromHexInput(messageToSign);
    const messageHashBytes = sha256(messageBytes.toUint8Array());
    const signature = p256.sign(messageHashBytes, this.key.toUint8Array());
    return new Secp256r1Signature(signature.toCompactRawBytes());
  }

  /**
   * Sign the given message with the private key.
   *
   * Note: This does not generate a signingMessage or transform the value.
   * Useful for mocking how a Platform Authenticator signs a message
   * with a WebAuthn credential
   *
   * @param message in HexInput format
   * @returns Signature
   */
  signArbitraryMessage(message: HexInput): Secp256r1Signature {
    const messageBytes = Hex.fromHexInput(message);
    const messageHashBytes = sha256(messageBytes.toUint8Array());
    // NOTE if you change to preHash here you will also need to update the verify() function parameters
    const signature = p256.sign(messageHashBytes, this.key.toUint8Array(), { lowS: true });
    return new Secp256r1Signature(signature.toCompactRawBytes());
  }

  serialize(serializer: Serializer): void {
    serializer.serializeBytes(this.toUint8Array());
  }

  static deserialize(deserializer: Deserializer): Secp256r1PrivateKey {
    const bytes = deserializer.deserializeBytes();
    return new Secp256r1PrivateKey(bytes);
  }

  /**
   * Generate a new random private key.
   *
   * @returns Secp256r1PrivateKey
   */
  static generate(): Secp256r1PrivateKey {
    const hexInput = p256.utils.randomPrivateKey();
    return new Secp256r1PrivateKey(hexInput);
  }

  /**
   * Derive the Secp256r1PublicKey from this private key.
   *
   * @returns Secp256r1PublicKey
   */
  publicKey(): Secp256r1PublicKey {
    const bytes = p256.getPublicKey(this.key.toUint8Array(), false);
    return new Secp256r1PublicKey(bytes);
  }
}

/**
 * A signature of a message signed using an Secp256r1 ecdsa private key
 */
export class Secp256r1Signature extends Signature {
  /**
   * Secp256r1 ecdsa signatures are 256-bit.
   */
  static readonly LENGTH = 64;

  /**
   * The signature bytes
   * @private
   */
  private readonly data: Hex;

  /**
   * Create a new Signature instance from a Uint8Array or String.  It will convert the signature to its canonical if needed.
   *
   * @param hexInput A HexInput (string or Uint8Array)
   */
  constructor(hexInput: HexInput) {
    super();

    const data = Hex.fromHexInput(hexInput);
    if (data.toUint8Array().length !== Secp256r1Signature.LENGTH) {
      throw new Error(
        `Signature length should be ${Secp256r1Signature.LENGTH}, recieved ${data.toUint8Array().length}`,
      );
    }
    const signature = p256.Signature.fromCompact(data.toUint8Array()).normalizeS().toCompactRawBytes();
    this.data = Hex.fromHexInput(signature);
  }

  /**
   * Get the signature in bytes (Uint8Array).
   *
   * @returns Uint8Array representation of the signature
   */
  toUint8Array(): Uint8Array {
    return this.data.toUint8Array();
  }

  /**
   * Get the signature as a hex string with the 0x prefix.
   *
   * @returns string representation of the signature
   */
  toString(): string {
    return this.data.toString();
  }

  serialize(serializer: Serializer): void {
    serializer.serializeBytes(this.data.toUint8Array());
  }

  static deserialize(deserializer: Deserializer): Secp256r1Signature {
    const hex = deserializer.deserializeBytes();
    return new Secp256r1Signature(hex);
  }

  static load(deserializer: Deserializer): Secp256r1Signature {
    const bytes = deserializer.deserializeBytes();
    return new Secp256r1Signature(bytes);
  }
}
