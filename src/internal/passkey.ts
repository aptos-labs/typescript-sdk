// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

/**
 * This file contains the underlying implementations for exposed API surface in
 * the {@link api/passkey}. By moving the methods out into a separate file,
 * other namespaces and processes can access these methods without depending on the entire
 * faucet namespace and without having a dependency cycle error.
 */
import { bufferToBase64URLString, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import {
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
  generateAuthenticationOptions as _generateAuthenticationOptions,
  generateRegistrationOptions as _generateRegistrationOptions,
  verifyAuthenticationResponse as _verifyAuthenticationResponse,
  verifyRegistrationResponse as _verifyRegistrationResponse,
} from "@simplewebauthn/server";
import {
  AuthenticationResponseJSON,
  AuthenticatorDevice,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server/esm/deps";
import { convertCOSEtoPKCS, cose, isoBase64URL, parseAuthenticatorData } from "@simplewebauthn/server/helpers";
import { AptosConfig } from "../api/aptosConfig";
import { AccountAddress, AccountPublicKey, AuthenticationKey, ClientDataJSON, PublicKey } from "../core";
import { Secp256r1PublicKey } from "../core/crypto/secp256r1";
import { AccountAuthenticator, AnyRawTransaction, signWithPasskey as _signWithPasskey } from "../transactions";
import { HexInput, PendingTransactionResponse } from "../types";
import { AllowCredentialOption } from "../types/passkey";
import { submitTransaction } from "./transactionSubmission";

const supportedAlgorithmIDs = [cose.COSEALG.ES256];

export async function generateRegistrationOptions(args: {
  rpName: string;
  rpID: string;
  userID?: Uint8Array;
  userName: string;
  challenge?: string | Uint8Array;
  userDisplayName?: string;
  timeout?: number;
  attestationType?: AttestationConveyancePreference;
  authenticatorAttachment?: AuthenticatorAttachment;
}): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const { authenticatorAttachment } = args;
  const authenticatorSelection: AuthenticatorSelectionCriteria = {
    authenticatorAttachment,
    residentKey: "required",
    userVerification: "required",
  };

  return _generateRegistrationOptions({
    ...args,
    authenticatorSelection,
    supportedAlgorithmIDs,
  });
}

export async function registerCredential(
  creationOptionsJSON: PublicKeyCredentialCreationOptionsJSON,
): Promise<RegistrationResponseJSON> {
  return startRegistration(creationOptionsJSON);
}

export async function verifyRegistrationResponse(args: {
  response: RegistrationResponseJSON;
  expectedChallenge: string | ((challenge: string) => boolean | Promise<boolean>);
  expectedOrigin: string | string[];
  expectedRPID?: string | string[];
}): Promise<VerifiedRegistrationResponse> {
  return _verifyRegistrationResponse({
    ...args,
    requireUserVerification: true,
    supportedAlgorithmIDs,
  });
}

export async function generateAuthenticationOptions(args: {
  credentialId: string | Uint8Array;
  timeout?: number;
  rpID: string;
}): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const { credentialId } = args;
  const allowCredentials: AllowCredentialOption[] = [
    {
      id: typeof credentialId !== "string" ? bufferToBase64URLString(credentialId) : credentialId,
    },
  ];
  return _generateAuthenticationOptions({ ...args, allowCredentials, userVerification: "required" });
}

export async function authenticateCredential(
  requestOptionsJSON: PublicKeyCredentialRequestOptionsJSON,
): Promise<AuthenticationResponseJSON> {
  return startAuthentication(requestOptionsJSON);
}

export async function verifyAuthenticationResponse(args: {
  response: AuthenticationResponseJSON;
  expectedChallenge: string | ((challenge: string) => boolean | Promise<boolean>);
  expectedOrigin: string | string[];
  expectedRPID: string | string[];
  expectedType?: string | string[];
  authenticator: AuthenticatorDevice;
  requireUserVerification?: boolean;
  advancedFIDOConfig?: {
    userVerification?: UserVerificationRequirement;
  };
}): Promise<VerifiedAuthenticationResponse> {
  return _verifyAuthenticationResponse({ ...args });
}

export function parsePublicKey(response: RegistrationResponseJSON): PublicKey {
  const authData = isoBase64URL.toBuffer(response.response.authenticatorData!);
  const parsedAuthenticatorData = parseAuthenticatorData(authData);
  // Convert from COSE
  const publicKey = convertCOSEtoPKCS(parsedAuthenticatorData.credentialPublicKey!);
  return new Secp256r1PublicKey(publicKey);
}

export async function signWithPasskey(args: {
  credentialId: string | Uint8Array;
  publicKey: PublicKey;
  transaction: AnyRawTransaction;
  timeout?: number;
  rpID: string;
  options?: {
    allowCredentials?: AllowCredentialOption[];
  };
}): Promise<AccountAuthenticator> {
  return _signWithPasskey({ ...args });
}

export async function signAndSubmitWithPasskey(args: {
  aptosConfig: AptosConfig;
  credentialId: string | Uint8Array;
  publicKey: PublicKey;
  transaction: AnyRawTransaction;
  timeout?: number;
  rpID: string;
  options?: {
    allowCredentials?: AllowCredentialOption[];
  };
}): Promise<PendingTransactionResponse> {
  const { aptosConfig, transaction } = args;

  const authenticator = await signWithPasskey({ ...args });
  return submitTransaction({
    aptosConfig,
    transaction,
    senderAuthenticator: authenticator,
  });
}

export async function getPasskeyAccountAddress(args: { publicKey: HexInput; alg?: number }): Promise<AccountAddress> {
  const { publicKey, alg } = args;
  const algorithm = alg ?? cose.COSEALG.ES256;

  let publicKeyObj: AccountPublicKey;
  switch (algorithm) {
    // ES256, P256, Secp256r1 are all the same thing.
    case cose.COSEALG.ES256:
      publicKeyObj = new Secp256r1PublicKey(publicKey);
      break;
    default:
      throw new Error("Algorithm is not supported");
  }
  const authKey = AuthenticationKey.fromPublicKey({ publicKey: publicKeyObj });
  return AccountAddress.from(authKey.toString());
}

/**
 * The function `ccd_to_string` is used in
 * [`client_data_to_json_bytes`](client_data_to_json_bytes)
 * and is defined as:
 *
 * 1. Let `encoded` be an empty byte string.
 * 2. Append 0x22 (") to `encoded`. -> 0x22 is the hexadecimal for a double quote (")
 * 3. Invoke `ToString` on the given object to convert it to a string.
 * 4. For each code point in the resulting string, if the code point:
 *
 *    -> is in the set {U+0020, U+0021, U+0023–U+005B, U+005D–U+10FFFF}
 *        Append the UTF-8 encoding of that code point to `encoded`.
 *
 *    -> is U+0022
 *        Append 0x5c22 (\") to `encoded`.
 *
 *    -> is U+005C
 *        Append 0x5c5c (\\) to `encoded`.
 *
 *    -> otherwise
 *        Append 0x5c75 (\u) to `encoded`, followed by four lower-case hex digits that,
 *        when interpreted as a base-16 number, represent that code point.
 *
 * 5. Append 0x22 (") to `encoded`.
 * 6. The result of this function is the value of `encoded`.
 *
 * @see https://www.w3.org/TR/webauthn-3/#ccdtostring
 *
 * Mimics functionality provided here:
 * @see https://github.com/aptos-labs/aptos-core/pull/10755/files#diff-aa8fc08bb2653b4289de532f8454b03f0f04426c63d30f5ccfd34b185e28bb68R314
 */
export function ccdToString(input: string): Uint8Array {
  const encoded: number[] = [];

  // Append 0x22 (")
  encoded.push(0x22);

  for (const codePoint of input) {
    const code = codePoint.codePointAt(0);

    if (code === undefined) {
      continue;
    }

    if ((code >= 0x0020 && code <= 0x0021) || (code >= 0x0023 && code <= 0x005B) || (code >= 0x005D && code <= 0x10FFFF)) {
      // Append the UTF-8 encoding of the code point
      const utf8Bytes = new TextEncoder().encode(codePoint);
      encoded.push(...utf8Bytes);
    } else if (code === 0x0022) {
      // Append 0x5c22 (\")
      encoded.push(0x5C, 0x22);
    } else if (code === 0x005C) {
      // Append 0x5c5c (\\)
      encoded.push(0x5C, 0x5C);
    } else {
      // Append 0x5c75 (\u) followed by four lower-case hex digits
      encoded.push(0x5C, 0x75);
      const hexDigits = code.toString(16).padStart(4, '0');
      for (const hexByte of hexDigits) {
        encoded.push(hexByte.charCodeAt(0));
      }
    }
  }

  // Append 0x22 (")
  encoded.push(0x22);

  return new Uint8Array(encoded);
}

/**
 * This is the custom serialization of [`ClientDataJSON`](ClientDataJSON)
 * that is performed by the device authenticator, referenced in the WebAuthn spec, under
 * Section §5.8.1.1 Serialization.
 *
 * This is helpful for ensuring that the serialization of [`CollectedClientData`](CollectedClientData)
 * is identical to the device authenticator's output for clientDataJSON in client assertions.
 *
 * The serialization of the [`ClientDataJSON`](ClientDataJSON)
 * is a subset of the algorithm for JSON-serializing
 * to bytes. I.e. it produces a valid JSON encoding of the `CollectedClientData` but also provides
 * additional structure that may be exploited by verifiers to avoid integrating a full JSON parser.
 * While verifiers are recommended to perform standard JSON parsing, they may use the more
 * limited algorithm below in contexts where a full JSON parser is too large. This verification
 * algorithm requires only base64url encoding, appending of bytestrings (which could be
 * implemented by writing into a fixed template), and three conditional checks (assuming that
 * inputs are known not to need escaping).
 *
 * The serialization algorithm works by appending successive byte strings to an, initially empty,
 * partial result until the complete result is obtained.
 *
 * 1. Let result be an empty byte string.
 * 2. Append 0x7b2274797065223a ({"type":) to result.
 * 3. Append CCDToString(type) to result.
 * 4. Append 0x2c226368616c6c656e6765223a (,"challenge":) to result.
 * 5. Append CCDToString(challenge) to result.
 * 6. Append 0x2c226f726967696e223a (,"origin":) to result.
 * 7. Append CCDToString(origin) to result.
 * 8. Append 0x2c2263726f73734f726967696e223a (,"crossOrigin":) to result.
 * 9. If crossOrigin is not present, or is false:
 *    1. Append 0x66616c7365 (false) to result.
 * 10. Otherwise:
 *    1. Append 0x74727565 (true) to result.
 * 11. Create a temporary copy of the CollectedClientData and remove the fields
 *     type, challenge, origin, and crossOrigin (if present).
 * 12. If no fields remain in the temporary copy then:
 *    1. Append 0x7d (}) to result.
 * 13. Otherwise:
 *    1. Invoke serialize JSON to bytes on the temporary copy to produce a byte string remainder.
 *       (see below for how this is done)
 *    2. Append 0x2c (,) to result.
 *    3. Remove the leading byte from remainder.
 *    4. Append remainder to result.
 * 14. The result of the serialization is the value of result.
 *
 * From step 13.1
 * To serialize a JavaScript value to JSON bytes, given a JavaScript value value:
 *    1. Let string be the result of serializing a JavaScript value to a JSON string given value.
 *    2. Return the result of running UTF-8 encode on string.
 *
 * @see https://www.w3.org/TR/webauthn-3/#clientdatajson-serialization
 *
 * Mimics functionality provided here
 * @see https://github.com/aptos-labs/aptos-core/pull/10755/files#diff-aa8fc08bb2653b4289de532f8454b03f0f04426c63d30f5ccfd34b185e28bb68R403
 */
export function clientDataToJsonBytes(clientDataJSON: ClientDataJSON): Uint8Array {
  let result: number[] = [];

  // Append {"type":
  result.push(...[0x7b, 0x22, 0x74, 0x79, 0x70, 0x65, 0x22, 0x3a]);

  // Append type value
  result.push(...ccdToString(clientDataJSON.type));

  // Append ,"challenge":
  result.push(...[0x2c, 0x22, 0x63, 0x68, 0x61, 0x6c, 0x6c, 0x65, 0x6e, 0x67, 0x65, 0x22, 0x3a]);

  // Append challenge value
  result.push(...ccdToString(clientDataJSON.challenge));

  // Append ,"origin":
  result.push(...[0x2c, 0x22, 0x6f, 0x72, 0x69, 0x67, 0x69, 0x6e, 0x22, 0x3a]);

  // Append origin value
  result.push(...ccdToString(clientDataJSON.origin));

  // Append ,"crossOrigin":
  result.push(...[0x2c, 0x22, 0x63, 0x72, 0x6f, 0x73, 0x73, 0x4f, 0x72, 0x69, 0x67, 0x69, 0x6e, 0x22, 0x3a]);

  if (clientDataJSON.crossOrigin !== undefined) {
    if (clientDataJSON.crossOrigin) {
      // Append true
      result.push(...[0x74, 0x72, 0x75, 0x65]);
    } else {
      // Append false
      result.push(...[0x66, 0x61, 0x6c, 0x73, 0x65]);
    }
  } else {
    // Append false if crossOrigin is not present
    result.push(...[0x66, 0x61, 0x6c, 0x73, 0x65]);
  }

  // Create a temporary copy of CollectedClientData
  // remove the fields type, challenge, origin, crossOrigin (if present), and topOrigin (if present)
  // tempCopy is the remaining object
  const { type, challenge, origin, crossOrigin, ...tempCopy } = { ...clientDataJSON };

  // Check if any fields other than type, challenge, origin, and crossOrigin remain in the temporary copy
  // TODO Check if undefined values in dictionary should be deleted (e.g., tokenBinding)
  if (Object.keys(tempCopy).length === 0) {
    // If no fields remain, append }
    result.push(0x7d);
  } else {
    // Otherwise, serialize remaining fields to JSON bytes
    const remainder = new TextEncoder().encode(JSON.stringify(tempCopy));

    // Append ,
    result.push(0x2c);

    // Remove the leading byte from remainder and append the rest
    result.push(...Array.from(remainder).slice(1));
  }

  return new Uint8Array(result);
}
