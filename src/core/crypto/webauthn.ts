// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { sha256 } from "@noble/hashes/sha256";
import { Deserializer, Serializer } from "../../bcs";
import { AssertionSignatureVariant, HexInput } from "../../types";
import { Hex } from "../hex";
import { Secp256r1Signature } from "./secp256r1";
import { Signature } from "./signature";

export class AssertionSignature extends Signature {
  public readonly signature: Signature;

  constructor(signature: Signature) {
    super();
    this.signature = signature;
  }

  /**
   * Get the signature in bytes (Uint8Array).
   *
   * @returns Uint8Array representation of the signature
   */
  toUint8Array(): Uint8Array {
    return this.signature.toUint8Array();
  }

  /**
   * Get the signature as a hex string with the 0x prefix.
   *
   * @returns string representation of the signature
   */
  toString(): string {
    return this.signature.toString();
  }

  serialize(serializer: Serializer): void {
    if (this.signature instanceof Secp256r1Signature) {
      serializer.serializeU32AsUleb128(AssertionSignatureVariant.Secp256r1);
      this.signature.serialize(serializer);
    } else {
      throw new Error("Unknown signature type for AssertionSignature");
    }
  }

  static deserialize(deserializer: Deserializer): AssertionSignature {
    const index = deserializer.deserializeUleb128AsU32();
    switch (index) {
      case AssertionSignatureVariant.Secp256r1:
        return new AssertionSignature(Secp256r1Signature.load(deserializer));
      default:
        throw new Error(`Unknown variant index for AssertionSignature: ${index}`);
    }
  }
}

export class PartialAuthenticatorAssertionResponse {
  readonly signature: AssertionSignature;

  readonly authenticatorData: Uint8Array;

  readonly clientDataJSON: Uint8Array;

  constructor(signature: Signature, authenticatorData: HexInput, clientDataJSON: HexInput) {
    this.signature = new AssertionSignature(signature);

    this.authenticatorData = Hex.fromHexInput(authenticatorData).toUint8Array();

    this.clientDataJSON = Hex.fromHexInput(clientDataJSON).toUint8Array();
  }
}

export type ClientDataJSON = {
  type: string;
  challenge: string;
  origin: string;
  crossOrigin?: boolean;
  tokenBinding?: {
    id?: string;
    status: "present" | "supported" | "not-supported";
  };
};

/**
 * A signature of WebAuthn transaction
 */
export class WebAuthnSignature extends Signature {
  /**
   * The signature bytes
   */
  readonly paar: PartialAuthenticatorAssertionResponse;

  /**
   * Create a new Signature instance from a Uint8Array or String.
   *
   * @param hexInput A HexInput (string or Uint8Array)
   */
  constructor(signature: Signature, authenticatorData: HexInput, clientDataJSON: HexInput) {
    super();

    this.paar = new PartialAuthenticatorAssertionResponse(signature, authenticatorData, clientDataJSON);
  }

  /**
   * Get the signature in bytes (Uint8Array).
   *
   * @returns Uint8Array representation of the signature
   */
  toUint8Array(): Uint8Array {
    return this.paar.signature.toUint8Array();
  }

  /**
   * Get the signature as a hex string with the 0x prefix.
   *
   * @returns string representation of the signature
   */
  toString(): string {
    return this.paar.toString();
  }

  getCollectedClientData(): ClientDataJSON {
    const utf8Decoder = new TextDecoder("utf-8");
    const decodedClientData = utf8Decoder.decode(this.paar.clientDataJSON);
    return JSON.parse(decodedClientData);
  }

  getVerificationData(): Uint8Array {
    const clientDataJSONHash = sha256(this.paar.clientDataJSON);
    const mergedArray = new Uint8Array(clientDataJSONHash.length + this.paar.authenticatorData.length);
    mergedArray.set(this.paar.authenticatorData);
    mergedArray.set(clientDataJSONHash, this.paar.authenticatorData.length);
    return mergedArray;
  }

  serialize(serializer: Serializer): void {
    this.paar.signature.serialize(serializer);
    serializer.serializeBytes(this.paar.authenticatorData);
    serializer.serializeBytes(this.paar.clientDataJSON);
  }

  static deserialize(deserializer: Deserializer): WebAuthnSignature {
    const sig = AssertionSignature.deserialize(deserializer);
    const authData = deserializer.deserializeBytes();
    const clientDataJSON = deserializer.deserializeBytes();
    return new WebAuthnSignature(sig.signature, authData, clientDataJSON);
  }

  static load(deserializer: Deserializer): WebAuthnSignature {
    const sig = AssertionSignature.deserialize(deserializer);
    const authData = deserializer.deserializeBytes();
    const clientDataJSON = deserializer.deserializeBytes();
    return new WebAuthnSignature(sig.signature, authData, clientDataJSON);
  }
}
