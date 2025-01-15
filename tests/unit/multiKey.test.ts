// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import {
  Deserializer,
  Ed25519PublicKey,
  Secp256k1PublicKey,
  MultiKey,
  Hex,
  MultiKeySignature,
  Serializer,
} from "../../src";
import { multiKeyTestObject } from "./helper";

describe("MultiKey", () => {
  it("should throw when number of required signatures is less then 1", () => {
    expect(
      () =>
        new MultiKey({
          publicKeys: [
            new Secp256k1PublicKey(multiKeyTestObject.publicKeys[0]),
            new Ed25519PublicKey(multiKeyTestObject.publicKeys[1]),
            new Ed25519PublicKey(multiKeyTestObject.publicKeys[2]),
          ],
          signaturesRequired: 0,
        }),
    ).toThrow();
  });

  it("should throw when number of public keys is less then the number of signatures required", () => {
    expect(
      () =>
        new MultiKey({
          publicKeys: [
            new Secp256k1PublicKey(multiKeyTestObject.publicKeys[0]),
            new Ed25519PublicKey(multiKeyTestObject.publicKeys[1]),
            new Ed25519PublicKey(multiKeyTestObject.publicKeys[2]),
          ],
          signaturesRequired: 4,
        }),
    ).toThrow();
  });

  it("should convert to Uint8Array correctly", async () => {
    const multiKey = new MultiKey({
      publicKeys: [
        new Secp256k1PublicKey(multiKeyTestObject.publicKeys[0]),
        new Ed25519PublicKey(multiKeyTestObject.publicKeys[1]),
        new Ed25519PublicKey(multiKeyTestObject.publicKeys[2]),
      ],
      signaturesRequired: 2,
    });

    const expected = new Uint8Array([
      3, 1, 65, 4, 154, 111, 124, 173, 223, 248, 6, 74, 125, 213, 128, 14, 79, 181, 18, 191, 31, 249, 29, 174, 233, 101,
      64, 147, 133, 223, 160, 64, 227, 230, 48, 8, 171, 126, 245, 102, 244, 55, 124, 45, 229, 174, 178, 148, 130, 8,
      160, 27, 206, 226, 5, 12, 28, 133, 120, 206, 95, 166, 224, 195, 197, 7, 204, 162, 0, 32, 122, 115, 223, 26, 253,
      2, 142, 117, 231, 249, 226, 59, 33, 135, 163, 125, 9, 42, 108, 206, 188, 179, 237, 255, 110, 2, 249, 49, 133, 203,
      222, 134, 0, 32, 23, 254, 137, 168, 37, 150, 156, 28, 14, 95, 94, 128, 185, 95, 86, 58, 108, 182, 36, 15, 136,
      196, 36, 108, 25, 203, 57, 201, 83, 90, 20, 134, 2,
    ]);
    expect(multiKey.toUint8Array()).toEqual(expected);
  });

  it("should serializes to bytes correctly", async () => {
    const multiKey = new MultiKey({
      publicKeys: [
        new Secp256k1PublicKey(multiKeyTestObject.publicKeys[0]),
        new Ed25519PublicKey(multiKeyTestObject.publicKeys[1]),
        new Ed25519PublicKey(multiKeyTestObject.publicKeys[2]),
      ],
      signaturesRequired: 2,
    });

    expect(multiKey.toString()).toEqual(multiKeyTestObject.stringBytes);
  });

  it("should deserializes from bytes correctly", async () => {
    const multiKey = new MultiKey({
      publicKeys: [
        new Secp256k1PublicKey(multiKeyTestObject.publicKeys[0]),
        new Ed25519PublicKey(multiKeyTestObject.publicKeys[1]),
        new Ed25519PublicKey(multiKeyTestObject.publicKeys[2]),
      ],
      signaturesRequired: 2,
    });

    const deserialize = new Deserializer(multiKey.toUint8Array());
    expect(multiKey).toEqual(MultiKey.deserialize(deserialize));
  });

  it("should throw when signatures in bitmap greater than public keys amount", () => {
    const multiKey = new MultiKey({
      publicKeys: [
        new Secp256k1PublicKey(multiKeyTestObject.publicKeys[0]),
        new Ed25519PublicKey(multiKeyTestObject.publicKeys[1]),
        new Ed25519PublicKey(multiKeyTestObject.publicKeys[2]),
      ],
      signaturesRequired: 2,
    });
    expect(() => multiKey.createBitmap({ bits: [0, 1, 2, 3] })).toThrow();
  });

  it("should throw when there are duplicates in bitmap", () => {
    const multiKey = new MultiKey({
      publicKeys: [
        new Secp256k1PublicKey(multiKeyTestObject.publicKeys[0]),
        new Ed25519PublicKey(multiKeyTestObject.publicKeys[1]),
        new Ed25519PublicKey(multiKeyTestObject.publicKeys[2]),
      ],
      signaturesRequired: 2,
    });
    expect(() => multiKey.createBitmap({ bits: [0, 0] })).toThrow();
  });

  it("should create bitmap correctly", () => {
    const multiKey = new MultiKey({
      publicKeys: [
        new Secp256k1PublicKey(multiKeyTestObject.publicKeys[0]),
        new Ed25519PublicKey(multiKeyTestObject.publicKeys[1]),
        new Ed25519PublicKey(multiKeyTestObject.publicKeys[2]),
      ],
      signaturesRequired: 2,
    });
    const bitmap = multiKey.createBitmap({ bits: [0, 2] });
    expect(bitmap).toEqual(new Uint8Array(multiKeyTestObject.bitmap));
  });

  it("should be able to decode from other SDKs", () => {
    const serializedBytes = Hex.fromHexString(
      // eslint-disable-next-line max-len
      "020140118d6ebe543aaf3a541453f98a5748ab5b9e3f96d781b8c0a43740af2b65c03529fdf62b7de7aad9150770e0994dc4e0714795fdebf312be66cd0550c607755e00401a90421453aa53fa5a7aa3dfe70d913823cbf087bf372a762219ccc824d3a0eeecccaa9d34f22db4366aec61fb6c204d2440f4ed288bc7cc7e407b766723a60901c0",
    ).toUint8Array();
    const deserializer = new Deserializer(serializedBytes);
    const multiKeySig = MultiKeySignature.deserialize(deserializer);
    const serializer = new Serializer();
    multiKeySig.serialize(serializer);
    const outBytes = serializer.toUint8Array();
    expect(outBytes).toEqual(serializedBytes);
  });
});
