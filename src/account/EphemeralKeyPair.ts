// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { randomBytes } from "@noble/hashes/utils";

import {
  EPK_HORIZON_SECS,
  Ed25519PrivateKey,
  EphemeralPublicKey,
  EphemeralSignature,
  PrivateKey,
} from "../core/crypto";
import { Hex } from "../core/hex";
import { bytesToBigIntLE, padAndPackBytesWithLen, poseidonHash } from "../core/crypto/poseidon";
import { EphemeralPublicKeyVariant, HexInput } from "../types";
import { Deserializer, Serializable, Serializer } from "../bcs";

export class EphemeralKeyPair extends Serializable {
  static readonly BLINDER_LENGTH: number = 31;

  /**
   * A byte array of length BLINDER_LENGTH used to obfuscate the public key from the IdP.
   * Used in calculating the nonce passed to the IdP and as a secret witness in proof generation.
   */
  readonly blinder: Uint8Array;

  /**
   * A timestamp in seconds indicating when the ephemeral key pair is expired.  After expiry, a new
   * EphemeralKeyPair must be generated and a new JWT needs to be created.
   */
  readonly expiryDateSecs: bigint | number;

  /**
   * The value passed to the IdP when the user authenticates.  It comprises of a hash of the
   * ephermeral public key, expiry date, and blinder.
   */
  readonly nonce: string;

  /**
   * A private key used to sign transactions.  This private key is not tied to any account on the chain as it
   * is ephemeral in nature.
   */
  private privateKey: PrivateKey;

  /**
   * A public key used to verify transactions.  This public key is not tied to any account on the chain as it
   * is ephemeral in nature.
   */
  private publicKey: EphemeralPublicKey;

  constructor(args: { privateKey: PrivateKey; expiryDateSecs?: bigint | number; blinder?: HexInput }) {
    super();
    const { privateKey, expiryDateSecs, blinder } = args;
    this.privateKey = privateKey;
    this.publicKey = new EphemeralPublicKey(privateKey.publicKey());
    // We set the expiry date to be the nearest floored hour
    this.expiryDateSecs = expiryDateSecs || BigInt(floorToWholeHour(currentTimeInSeconds() + EPK_HORIZON_SECS));
    // Generate the blinder if not provided
    this.blinder = blinder !== undefined ? Hex.fromHexInput(blinder).toUint8Array() : generateBlinder();
    // Calculate the nonce
    this.nonce = this.generateNonce();
  }

  /**
   * Returns the public key of the key pair.
   * @return EphemeralPublicKey
   */
  getPublicKey(): EphemeralPublicKey {
    return this.publicKey;
  }

  /**
   * Returns the public key of the key pair.
   * @return boolean
   */
  isExpired(): boolean {
    const currentTimeSecs: number = Math.floor(Date.now() / 1000);
    return currentTimeSecs > this.expiryDateSecs;
  }

  serialize(serializer: Serializer): void {
    serializer.serializeU32AsUleb128(this.publicKey.variant);
    serializer.serializeBytes(this.privateKey.toUint8Array());
    serializer.serializeU64(this.expiryDateSecs);
    serializer.serializeFixedBytes(this.blinder);
  }

  static deserialize(deserializer: Deserializer): EphemeralKeyPair {
    const variantIndex = deserializer.deserializeUleb128AsU32();
    let privateKey: PrivateKey;
    switch (variantIndex) {
      case EphemeralPublicKeyVariant.Ed25519:
        privateKey = Ed25519PrivateKey.deserialize(deserializer);
        break;
      default:
        throw new Error(`Unknown variant index for EphemeralPublicKey: ${variantIndex}`);
    }
    const expiryDateSecs = deserializer.deserializeU64();
    const blinder = deserializer.deserializeFixedBytes(31);
    return new EphemeralKeyPair({ privateKey, expiryDateSecs, blinder });
  }

  static fromBytes(bytes: Uint8Array): EphemeralKeyPair {
    return EphemeralKeyPair.deserialize(new Deserializer(bytes));
  }

  /**
   * Returns the public key of the key pair.
   * @param scheme the type of keypair to use for the EphemeralKeyPair.  Only Ed25519 supported for now.
   * @param expiryDateSecs the date of expiry.
   * @return boolean
   */
  static generate(args?: { scheme: EphemeralPublicKeyVariant; expiryDateSecs?: bigint | number }): EphemeralKeyPair {
    let privateKey: PrivateKey;

    switch (args?.scheme) {
      case EphemeralPublicKeyVariant.Ed25519:
      default:
        privateKey = Ed25519PrivateKey.generate();
    }

    return new EphemeralKeyPair({ privateKey, expiryDateSecs: args?.expiryDateSecs });
  }

  private generateNonce(): string {
    const fields = padAndPackBytesWithLen(this.publicKey.bcsToBytes(), 93);
    fields.push(BigInt(this.expiryDateSecs));
    fields.push(bytesToBigIntLE(this.blinder));
    const nonceHash = poseidonHash(fields);
    return nonceHash.toString();
  }

  /**
   * Sign the given message with the private key.
   *
   * @param data in HexInput format
   * @returns EphemeralSignature
   */
  sign(data: HexInput): EphemeralSignature {
    if (this.isExpired()) {
      throw new Error("EphemeralKeyPair has expired");
    }
    return new EphemeralSignature(this.privateKey.sign(data));
  }
}

function generateBlinder(): Uint8Array {
  return randomBytes(EphemeralKeyPair.BLINDER_LENGTH);
}

function currentTimeInSeconds(): number {
  return Math.floor(new Date().getTime() / 1000);
}

function floorToWholeHour(timestampInSeconds: number): number {
  const date = new Date(timestampInSeconds * 1000);
  // Reset minutes and seconds to zero
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return Math.floor(date.getTime() / 1000);
}