// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { p256 } from "@noble/curves/p256";
import { sha256 } from "@noble/hashes/sha256";
import { Deserializer, Hex, Secp256r1PrivateKey, Secp256r1PublicKey, Secp256r1Signature, Serializer } from "../../src";
import { secp256k1TestObject, secp256r1TestObject, secp256r1WalletTestObject } from "./helper";

/* eslint-disable max-len */
describe("Secp256r1PublicKey", () => {
  it("should create the instance correctly without error", () => {
    // Create from string
    const publicKey = new Secp256r1PublicKey(secp256r1TestObject.publicKey);
    expect(publicKey).toBeInstanceOf(Secp256r1PublicKey);
    expect(publicKey.toString()).toEqual(secp256r1TestObject.publicKey);

    // // Create from Uint8Array
    const hexUint8Array = p256.getPublicKey(p256.utils.randomPrivateKey(), false);
    const publicKey2 = new Secp256r1PublicKey(hexUint8Array);
    expect(publicKey2).toBeInstanceOf(Secp256r1PublicKey);
    expect(publicKey2.toUint8Array()).toEqual(hexUint8Array);
  });

  it("should throw an error with invalid hex input length", () => {
    const invalidHexInput = "0123456789abcdef"; // Invalid length
    expect(() => new Secp256r1PublicKey(invalidHexInput)).toThrowError(
      `PublicKey length should be ${Secp256r1PublicKey.LENGTH}`,
    );
  });

  it("should sign_arbitrary_bytes and verify the signature correctly", () => {
    const privateKey = new Secp256r1PrivateKey(secp256r1TestObject.privateKey);
    const publicKey = privateKey.publicKey();

    const message = Hex.fromHexString(secp256r1TestObject.messageEncoded);
    const signature = privateKey.signArbitraryMessage(message.toUint8Array());
    expect(signature.toString()).toEqual(secp256r1TestObject.signatureHex);

    const verify = p256.verify(signature.toUint8Array(), sha256(message.toUint8Array()), publicKey.toUint8Array());
    expect(verify).toBeTruthy();
  });

  it("should verify the signature correctly", () => {
    const pubKey = new Secp256r1PublicKey(secp256r1TestObject.publicKey);
    const signature = new Secp256r1Signature(secp256r1TestObject.signatureHex);

    // Convert message to hex
    const hexMsg = Hex.fromHexString(secp256r1TestObject.messageEncoded);

    // Verify with correct signed message
    expect(pubKey.verifySignature({ message: hexMsg.toUint8Array(), signature })).toBe(true);

    // Verify with incorrect signed message
    const incorrectSignedMessage =
      "0xc5de9e40ac00b371cd83b1c197fa5b665b7449b33cd3cdd305bb78222e06a671a49625ab9aea8a039d4bb70e275768084d62b094bc1b31964f2357b7c1af7e0a";
    const invalidSignature = new Secp256r1Signature(incorrectSignedMessage);
    expect(
      pubKey.verifySignature({
        message: secp256r1TestObject.messageEncoded,
        signature: invalidSignature,
      }),
    ).toBe(false);
  });

  it("should serialize correctly", () => {
    const publicKey = new Secp256r1PublicKey(secp256r1TestObject.publicKey);
    const serializer = new Serializer();
    publicKey.serialize(serializer);

    const serialized = Hex.fromHexInput(serializer.toUint8Array()).toString();
    const expected =
      "0x4104c81c1005cbaff7cdbabee843b1dcd2cabd21e0b728792c73cdaf92bb37bca7d52e9526bb15a32dd8f542bb62b050532884366369f7acfe7d10d8c3840778de8c";
    expect(serialized).toEqual(expected);
  });

  it("should deserialize correctly", () => {
    const serializedPublicKeyStr =
      "0x4104c81c1005cbaff7cdbabee843b1dcd2cabd21e0b728792c73cdaf92bb37bca7d52e9526bb15a32dd8f542bb62b050532884366369f7acfe7d10d8c3840778de8c";
    const serializedPublicKey = Hex.fromHexString(serializedPublicKeyStr).toUint8Array();
    const deserializer = new Deserializer(serializedPublicKey);
    const publicKey = Secp256r1PublicKey.deserialize(deserializer);

    expect(publicKey.toString()).toEqual(secp256r1TestObject.publicKey);
  });

  it("ecdsa public key recovery", async () => {
    // Create from string
    const message = Hex.fromHexInput(secp256r1TestObject.messageEncoded);
    const signature = new Secp256r1Signature(secp256r1TestObject.signatureHex);
    expect(signature).toBeInstanceOf(Secp256r1Signature);

    // Test public key recovery. Should return two valid public keys, one of which contains the expected public key
    let publicKeys: Secp256r1PublicKey[] = await Secp256r1PublicKey.recoverPublicKey({
      message: message.toUint8Array(),
      signature: signature.toUint8Array(),
    });
    let publicKeysHex: string[] = publicKeys.map((key) => key.toString());
    expect(publicKeysHex).toContain(secp256r1TestObject.publicKey);

    // Test public key recovery with two signatures. Should return one valid public key
    // UTF-8 -> Hex of "hello blockchain"
    const message2 = Hex.fromHexString("68656c6c6f20626c6f636b636861696e");
    const privateKey = new Secp256r1PrivateKey(secp256r1TestObject.privateKey);
    const signature2 = privateKey.signArbitraryMessage(message2.toUint8Array());
    publicKeys = await Secp256r1PublicKey.recoverPublicKeyFromTwoSignatures([
      {
        message: message.toUint8Array(),
        signature: signature.toUint8Array(),
      },
      {
        message: message2.toUint8Array(),
        signature: signature2.toUint8Array(),
      }
    ])
    publicKeysHex = publicKeys.map((key) => key.toString());
    expect(publicKeys.length).toEqual(1);

    // Asserted there is only one public key in array from the expect array.length === 1 invariant above
    const publicKeyHex = publicKeysHex[0];
    expect(publicKeyHex).toEqual(secp256r1TestObject.publicKey);
  });
});

describe("Secp256r1PrivateKey", () => {
  it("should create the instance correctly without error", () => {
    // Create from string
    const privateKey = new Secp256r1PrivateKey(secp256r1TestObject.privateKey);
    expect(privateKey).toBeInstanceOf(Secp256r1PrivateKey);
    expect(privateKey.toString()).toEqual(secp256r1TestObject.privateKey);

    // Create from Uint8Array
    const hexUint8Array = Hex.fromHexString(secp256r1TestObject.privateKey).toUint8Array();
    const privateKey2 = new Secp256r1PrivateKey(hexUint8Array);
    expect(privateKey2).toBeInstanceOf(Secp256r1PrivateKey);
    expect(privateKey2.toString()).toEqual(Hex.fromHexInput(hexUint8Array).toString());
  });

  it("should throw an error with invalid hex input length", () => {
    const invalidHexInput = "0123456789abcdef"; // Invalid length
    expect(() => new Secp256r1PrivateKey(invalidHexInput)).toThrowError(
      `PrivateKey length should be ${Secp256r1PrivateKey.LENGTH}`,
    );
  });

  it("should sign the message correctly", () => {
    const privateKey = new Secp256r1PrivateKey(secp256r1TestObject.privateKey);
    const signedMessage = privateKey.sign(secp256r1TestObject.messageEncoded);
    expect(signedMessage.toString()).toEqual(secp256r1TestObject.signatureHex);
  });

  it("should serialize correctly", () => {
    const privateKey = new Secp256r1PrivateKey(secp256r1TestObject.privateKey);
    const serializer = new Serializer();
    privateKey.serialize(serializer);

    const received = Hex.fromHexInput(serializer.toUint8Array()).toString();
    const expected = "0x20d107155adf816a0a94c6db3c9489c13ad8a1eda7ada2e558ba3bfa47c020347e";
    expect(received).toEqual(expected);
  });

  it("should deserialize correctly", () => {
    const serializedPrivateKeyStr = "0x20d107155adf816a0a94c6db3c9489c13ad8a1eda7ada2e558ba3bfa47c020347e";
    const serializedPrivateKey = Hex.fromHexString(serializedPrivateKeyStr).toUint8Array();
    const deserializer = new Deserializer(serializedPrivateKey);
    const privateKey = Secp256r1PrivateKey.deserialize(deserializer);

    expect(privateKey.toString()).toEqual(secp256r1TestObject.privateKey);
  });

  it("should serialize and deserialize correctly", () => {
    const privateKey = new Secp256r1PrivateKey(secp256r1TestObject.privateKey);
    const serializer = new Serializer();
    privateKey.serialize(serializer);

    const deserializer = new Deserializer(serializer.toUint8Array());
    const deserializedPrivateKey = Secp256r1PrivateKey.deserialize(deserializer);

    expect(deserializedPrivateKey.toString()).toEqual(privateKey.toString());
  });

  it("should prevent an invalid bip44 path ", () => {
    const { mnemonic } = secp256r1WalletTestObject;
    const path = "1234";
    expect(() => Secp256r1PrivateKey.fromDerivationPath(path, mnemonic)).toThrow("Invalid derivation path");
  });

  it("should derive from path and mnemonic", () => {
    const { mnemonic, path, privateKey } = secp256r1WalletTestObject;
    const key = Secp256r1PrivateKey.fromDerivationPath(path, mnemonic);
    expect(key).toBeInstanceOf(Secp256r1PrivateKey);
    expect(key.toString()).toEqual(privateKey);
  });
});

describe("Secp256r1Signature", () => {
  it("should create an instance correctly without error", () => {
    // Create from string
    const signatureStr = new Secp256r1Signature(secp256r1TestObject.signatureHex);
    expect(signatureStr).toBeInstanceOf(Secp256r1Signature);
    expect(signatureStr.toString()).toEqual(secp256r1TestObject.signatureHex);

    // Create from Uint8Array
    const array = Array.from({ length: Secp256r1Signature.LENGTH }, () => Math.floor(Math.random() * 16));
    const signatureValue = new Uint8Array(array);
    const signature = new Secp256r1Signature(signatureValue);
    expect(signature).toBeInstanceOf(Secp256r1Signature);
    expect(signature.toUint8Array()).toEqual(signatureValue);
  });

  it("should throw an error with invalid value length", () => {
    const invalidSignatureValue = new Uint8Array(Secp256r1Signature.LENGTH - 1); // Invalid length
    expect(() => new Secp256r1Signature(invalidSignatureValue)).toThrowError(
      `Signature length should be ${Secp256r1Signature.LENGTH}`,
    );
  });

  it("should serialize correctly", () => {
    const signature = new Secp256r1Signature(secp256r1TestObject.signatureHex);
    const serializer = new Serializer();
    signature.serialize(serializer);

    const received = Hex.fromHexInput(serializer.toUint8Array()).toString();
    const expected =
      "0x4067a8c6539315eea3953c04165d2448f2de9bbb800bf5672af8098b73026292966ea226dfe4591b89da58999ef5e7f659a7d5bbee8aedbabe550e3b7034ddc51b";
    expect(received).toEqual(expected);
  });

  it("should deserialize correctly", () => {
    const serializedSignature =
      "0x4067a8c6539315eea3953c04165d2448f2de9bbb800bf5672af8098b73026292966ea226dfe4591b89da58999ef5e7f659a7d5bbee8aedbabe550e3b7034ddc51b";
    const serializedSignatureUint8Array = Hex.fromHexString(serializedSignature).toUint8Array();
    const deserializer = new Deserializer(serializedSignatureUint8Array);
    const signature = Secp256r1Signature.deserialize(deserializer);

    expect(signature.toString()).toEqual(secp256r1TestObject.signatureHex);
  });
});
