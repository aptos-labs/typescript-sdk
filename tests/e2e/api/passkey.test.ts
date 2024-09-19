/* eslint-disable max-len */
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import * as browser from "@simplewebauthn/browser";
import { base64URLStringToBuffer, bufferToBase64URLString } from "@simplewebauthn/browser";
import { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server/esm/deps";
import {
  AccountAddress,
  AnyRawTransaction,
  ClientDataJSON,
  generateSigningMessageForTransaction,
  Secp256r1PrivateKey,
  Secp256r1PublicKey,
} from "../../../src";
import { clientDataToJsonBytes, getPasskeyAccountAddress, parsePublicKey } from "../../../src/internal/passkey";
import { FUND_AMOUNT } from "../../unit/helper";
import { getAptosClient } from "../helper";
import { sha3_256 as sha3Hash } from "@noble/hashes/sha3";
import { sha256 as sha2Hash } from "@noble/hashes/sha2";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import { p256 } from "@noble/curves/p256";
import { sha256 } from "@noble/hashes/sha256";

const PASSKEY_TEST_TIMEOUT = 12000;

const testCredentialJSONObject = {
  id: "ou6iPvirmyfwxymZ-TogFw",
  rawId: "ou6iPvirmyfwxymZ-TogFw",
  response: {
    attestationObject:
      "o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YViUSZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2NdAAAAALraVWanqkAfvZZFYZpVEg0AEKLuoj74q5sn8Mcpmfk6IBelAQIDJiABIVgg-Aw8wvwYzq8QlltKiXtEQSVa8uHJpJaJ1F9AAoL2Q6ciWCA7Xroa2iNudxIqgFG1IdNGTniiKCIk-hIn2ktswN6p9A",
    clientDataJSON:
      "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiZ3Jod2t5cVBydTZEamhsZ3hfWFF5NjZmZVNGdl9rZm9raVpsS1FGTGxsTSIsIm9yaWdpbiI6Imh0dHA6Ly9sb2NhbGhvc3Q6NTE3MyIsImNyb3NzT3JpZ2luIjpmYWxzZX0",
    transports: ["internal", "hybrid"],
    publicKeyAlgorithm: -7,
    publicKey:
      "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE-Aw8wvwYzq8QlltKiXtEQSVa8uHJpJaJ1F9AAoL2Q6c7Xroa2iNudxIqgFG1IdNGTniiKCIk-hIn2ktswN6p9A",
    authenticatorData:
      "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2NdAAAAALraVWanqkAfvZZFYZpVEg0AEKLuoj74q5sn8Mcpmfk6IBelAQIDJiABIVgg-Aw8wvwYzq8QlltKiXtEQSVa8uHJpJaJ1F9AAoL2Q6ciWCA7Xroa2iNudxIqgFG1IdNGTniiKCIk-hIn2ktswN6p9A",
  },
  type: "public-key",
  clientExtensionResults: {
    credProps: {
      rk: true,
      authenticatorDisplayName: "1Password",
    },
  },
  authenticatorAttachment: "platform",
} as RegistrationResponseJSON;

const testAuthenticationResponseObject = {
  id: "ou6iPvirmyfwxymZ-TogFw",
  rawId: "ou6iPvirmyfwxymZ-TogFw",
  response: {
    authenticatorData: "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MdAAAAAA",
    clientDataJSON:
      "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoib2U1MlRmWXNYYlNuOVNxamQtdUtka2dMOWZBQjdLc3VlbFUwTmwtWm54USIsIm9yaWdpbiI6Imh0dHA6Ly9sb2NhbGhvc3Q6NTE3MyIsImNyb3NzT3JpZ2luIjpmYWxzZX0",
    signature: "MEYCIQDO-9LxaDNBEBa4pyquUcyuhsegDWM_aR5-wpLIjQT4hwIhAI8yK8ZAxWtRfkDNFxkwZm4SC-yhHCLMjgtwcbdHzG3_",
    userHandle: "tsSuOOp-4_KUAp9B7-M_EPFwl3giI4cdOzvFiUbDoMM",
  },
  type: "public-key",
  clientExtensionResults: {},
  authenticatorAttachment: "platform",
} as AuthenticationResponseJSON;

function concatenateUint8Arrays(arr1: Uint8Array, arr2: Uint8Array) {
  // Create a new Uint8Array with the combined length of arr1 and arr2
  const concatenated = new Uint8Array(arr1.length + arr2.length);

  // Copy the first array into the beginning of the new array
  concatenated.set(arr1, 0);

  // Copy the second array into the new array, starting at the index after the end of the first array
  concatenated.set(arr2, arr1.length);

  return concatenated;
}

interface MockTestAuthenticationResponseObjectArgs {
  transaction: AnyRawTransaction;
  privateKey: Secp256r1PrivateKey;
}

export interface GenerateVerificationDataArgs {
  authenticatorData: Uint8Array;
  clientDataJSON: Uint8Array;
}

/**
 * Construct verificationData, where verificationData is defined as
 * verificationData = authenticator_data || sha256(clientDataJson)
 */
export function generateVerificationData({ authenticatorData, clientDataJSON }: GenerateVerificationDataArgs) {
  // SHA2-256 digest of clientDataJSONBytes
  const clientDataJsonDigest = sha2Hash(clientDataJSON);

  // Binary concatenation of authenticatorData and SHA2-256(clientDataJson) (ORDER MATTERS)
  return new Uint8Array([...authenticatorData, ...clientDataJsonDigest]);
}

/**
 * This function simulates what a Platform Authenticator would do
 * for a WebAuthn Assertion. The function includes the logic for both
 * constructing the challenge and signing the verificationData.
 *
 * Given a transaction, this function will construct a clientDataJSON, where clientDataJson is defined as
 * clientDataJson = { ...fields, challenge: SHA3-256(signing_message(transaction)) }
 *
 * Then it will construct verificationData, where verificationData is defined as
 * verificationData = authenticator_data || sha256(clientDataJson)
 *
 * Then, given a privateKey, it will sign verificationData and return a signature
 *
 * Lastly it returns a mock AuthenticatorAssertionResponse response. Note the fields that matter
 * for signature verification are the following:
 * - signature
 * - clientDataJSON
 * - authenticatorData
 *
 * These are used to construct the `PartialAuthenticatorAssertionResponse`
 *
 * To learn more
 * @see https://www.w3.org/TR/webauthn-3/#sctn-op-get-assertion
 */
const mockTestAuthenticationResponseObject = ({
  transaction,
  privateKey,
}: MockTestAuthenticationResponseObjectArgs) => {
  const signingMessage = generateSigningMessageForTransaction(transaction);
  const challengeBytes = sha3Hash(signingMessage);

  const clientDataJSON: ClientDataJSON = {
    ...decodeClientDataJSON(testAuthenticationResponseObject.response.clientDataJSON),
    challenge: bufferToBase64URLString(challengeBytes),
  };

  const clientDataJSONBytes = clientDataToJsonBytes(clientDataJSON);
  const clientDataJSONBase64Url = bufferToBase64URLString(clientDataJSONBytes);

  // AuthenticatorData bytes
  const authenticatorData = new Uint8Array(
    base64URLStringToBuffer(testAuthenticationResponseObject.response.authenticatorData),
  );

  const verificationData = generateVerificationData({
    authenticatorData,
    clientDataJSON: clientDataJSONBytes,
  });

  // Signature over concat(authenticatorDataBytes || clientDataJson) where || is defined as concatenation
  const assertionResponseRawSignature = privateKey.signArbitraryMessage(verificationData);

  // Authenticators return ASN.1 DER encoded signatures for Secp256r1, not compact
  const assertionResponseDerSignature = p256.Signature.fromCompact(
    assertionResponseRawSignature.toUint8Array(),
  ).toDERRawBytes();
  const assertionResponseSignatureBase64Url = bufferToBase64URLString(assertionResponseDerSignature);

  return {
    ...testAuthenticationResponseObject,
    response: {
      ...testAuthenticationResponseObject.response,
      signature: assertionResponseSignatureBase64Url,
      clientDataJSON: clientDataJSONBase64Url,
    },
  } as AuthenticationResponseJSON;
};

const { aptos } = getAptosClient();

describe("passkey api", () => {
  describe("passkey account", () => {
    test("get passkey account pubkey and address", async () => {
      const pubKey = parsePublicKey(testCredentialJSONObject);
      const address = await getPasskeyAccountAddress({ publicKey: pubKey.toString() });
      expect(pubKey.toString()).toBe(
        "0x04f80c3cc2fc18ceaf10965b4a897b4441255af2e1c9a49689d45f400282f643a73b5eba1ada236e77122a8051b521d3464e78a2282224fa1227da4b6cc0dea9f4",
      );
      expect(address.toString()).toBe("0x5f48dc0b134ef412f1e740deb9795a099a416c4a56d145ff0786234517d525e8");
    });
  });

  describe("passkey sign", () => {
    test(
      "sign with passkey",
      async () => {
        const spy = jest.spyOn(browser, "startAuthentication");

        // Note that this private key and corresponding public key will differ
        // from the key present in testCredentialJSONObject
        const privateKey = Secp256r1PrivateKey.generate();
        const publicKey = privateKey.publicKey();
        const address = await getPasskeyAccountAddress({ publicKey: publicKey.toUint8Array() });

        await aptos.fundAccount({ accountAddress: address, amount: 10 * FUND_AMOUNT });
        const txn = await aptos.transferCoinTransaction({
          sender: address,
          recipient: AccountAddress.fromString("0x1"),
          amount: FUND_AMOUNT,
        });

        const mockedResponse = mockTestAuthenticationResponseObject({ transaction: txn, privateKey });
        spy.mockReturnValue(Promise.resolve(mockedResponse));

        const clientDataBytes = new Uint8Array(base64URLStringToBuffer(mockedResponse.response.clientDataJSON));
        const signature = p256.Signature.fromDER(
          new Uint8Array(base64URLStringToBuffer(mockedResponse.response.signature)),
        ).toCompactRawBytes();
        const authenticatorData = new Uint8Array(base64URLStringToBuffer(mockedResponse.response.authenticatorData));

        // Test Passkey Public Key Recovery Works as Expected
        const recoveredPublicKey = await Secp256r1PublicKey.recoverPasskeyPublicKey(authenticatorData);
        expect(recoveredPublicKey?.toString()).toEqual(publicKey.toString());

        const p256PublicKey = p256.getPublicKey(privateKey.toUint8Array());
        const verificationData = generateVerificationData({ authenticatorData, clientDataJSON: clientDataBytes });

        // Sanity check to make sure signature and verificationData were created correctly
        const verification = p256.verify(signature, sha256(verificationData), p256PublicKey);
        expect(verification).toBeTruthy();

        const pendingTxn = await aptos.signAndSubmitWithPasskey({
          credentialId: testCredentialJSONObject.id,
          transaction: txn,
          publicKey,
          rpID: "localhost",
          options: {},
        });

        await aptos.waitForTransaction({ transactionHash: pendingTxn.hash });
        spy.mockRestore();
      },
      PASSKEY_TEST_TIMEOUT,
    );
  });
});
