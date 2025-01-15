// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

/**
 * This file contains the underlying implementations for exposed API surface in
 * the {@link api/keyless}. By moving the methods out into a separate file,
 * other namespaces and processes can access these methods without depending on the entire
 * keyless namespace and without having a dependency cycle error.
 * @group Implementation
 */
import { jwtDecode, JwtPayload } from "jwt-decode";
import { AptosConfig } from "../api/aptosConfig";
import { postAptosPepperService, postAptosProvingService } from "../client";
import {
  AccountAddressInput,
  EphemeralSignature,
  Groth16Zkp,
  Hex,
  KeylessPublicKey,
  MoveJWK,
  MultiKey,
  ZeroKnowledgeSig,
  ZkProof,
  getIssAudAndUidVal,
  getKeylessConfig,
} from "../core";
import { HexInput, ZkpVariant } from "../types";
import {
  Account,
  EphemeralKeyPair,
  KeylessAccount,
  KeylessSigner,
  MultiKeyAccount,
  ProofFetchCallback,
} from "../account";
import { PepperFetchRequest, PepperFetchResponse, ProverRequest, ProverResponse } from "../types/keyless";
import { lookupOriginalAccountAddress } from "./account";
import { FederatedKeylessPublicKey } from "../core/crypto/federatedKeyless";
import { FederatedKeylessAccount } from "../account/FederatedKeylessAccount";
import { MoveVector } from "../bcs";
import { generateTransaction } from "./transactionSubmission";
import { InputGenerateTransactionOptions, SimpleTransaction } from "../transactions";
import { KeylessError, KeylessErrorType } from "../errors";
import { COGNITO_ISS_PATTERN, FIREBASE_AUTH_ISS_PATTERN } from "../utils/const";

/**
 * Retrieves a pepper value based on the provided configuration and authentication details.
 *
 * @param args - The arguments required to fetch the pepper.
 * @param args.aptosConfig - The configuration object for Aptos.
 * @param args.jwt - The JSON Web Token used for authentication.
 * @param args.ephemeralKeyPair - The ephemeral key pair used for the operation.
 * @param args.uidKey - An optional unique identifier key (defaults to "sub").
 * @param args.derivationPath - An optional derivation path for the key.
 * @returns A Uint8Array containing the fetched pepper value.
 * @group Implementation
 */
export async function getPepper(args: {
  aptosConfig: AptosConfig;
  jwt: string;
  ephemeralKeyPair: EphemeralKeyPair;
  uidKey?: string;
  derivationPath?: string;
}): Promise<Uint8Array> {
  const { aptosConfig, jwt, ephemeralKeyPair, uidKey = "sub", derivationPath } = args;

  const body = {
    jwt_b64: jwt,
    epk: ephemeralKeyPair.getPublicKey().bcsToHex().toStringWithoutPrefix(),
    exp_date_secs: ephemeralKeyPair.expiryDateSecs,
    epk_blinder: Hex.fromHexInput(ephemeralKeyPair.blinder).toStringWithoutPrefix(),
    uid_key: uidKey,
    derivation_path: derivationPath,
  };
  const { data } = await postAptosPepperService<PepperFetchRequest, PepperFetchResponse>({
    aptosConfig,
    path: "fetch",
    body,
    originMethod: "getPepper",
    overrides: { WITH_CREDENTIALS: false },
  });
  return Hex.fromHexInput(data.pepper).toUint8Array();
}

/**
 * Generates a zero-knowledge proof based on the provided parameters.
 * This function is essential for creating a signed proof that can be used in various cryptographic operations.
 *
 * @param args - The parameters required to generate the proof.
 * @param args.aptosConfig - The configuration settings for Aptos.
 * @param args.jwt - The JSON Web Token used for authentication.
 * @param args.ephemeralKeyPair - The ephemeral key pair used for generating the proof.
 * @param args.pepper - An optional hex input used to enhance security (default is generated if not provided).
 * @param args.uidKey - An optional string that specifies the unique identifier key (defaults to "sub").
 * @throws Error if the pepper length is not valid or if the ephemeral key pair's lifespan exceeds the maximum allowed.
 * @group Implementation
 */
export async function getProof(args: {
  aptosConfig: AptosConfig;
  jwt: string;
  ephemeralKeyPair: EphemeralKeyPair;
  pepper?: HexInput;
  uidKey?: string;
  maxExpHorizonSecs?: number;
}): Promise<ZeroKnowledgeSig> {
  const {
    aptosConfig,
    jwt,
    ephemeralKeyPair,
    pepper = await getPepper(args),
    uidKey = "sub",
    maxExpHorizonSecs = (await getKeylessConfig({ aptosConfig })).maxExpHorizonSecs,
  } = args;
  if (Hex.fromHexInput(pepper).toUint8Array().length !== KeylessAccount.PEPPER_LENGTH) {
    throw new Error(`Pepper needs to be ${KeylessAccount.PEPPER_LENGTH} bytes`);
  }
  const decodedJwt = jwtDecode<JwtPayload>(jwt);
  if (typeof decodedJwt.iat !== "number") {
    throw new Error("iat was not found");
  }
  if (maxExpHorizonSecs < ephemeralKeyPair.expiryDateSecs - decodedJwt.iat) {
    throw Error(`The EphemeralKeyPair is too long lived.  It's lifespan must be less than ${maxExpHorizonSecs}`);
  }
  const json = {
    jwt_b64: jwt,
    epk: ephemeralKeyPair.getPublicKey().bcsToHex().toStringWithoutPrefix(),
    epk_blinder: Hex.fromHexInput(ephemeralKeyPair.blinder).toStringWithoutPrefix(),
    exp_date_secs: ephemeralKeyPair.expiryDateSecs,
    exp_horizon_secs: maxExpHorizonSecs,
    pepper: Hex.fromHexInput(pepper).toStringWithoutPrefix(),
    uid_key: uidKey,
  };

  const { data } = await postAptosProvingService<ProverRequest, ProverResponse>({
    aptosConfig,
    path: "prove",
    body: json,
    originMethod: "getProof",
    overrides: { WITH_CREDENTIALS: false },
  });

  const proofPoints = data.proof;
  const groth16Zkp = new Groth16Zkp({
    a: proofPoints.a,
    b: proofPoints.b,
    c: proofPoints.c,
  });

  const signedProof = new ZeroKnowledgeSig({
    proof: new ZkProof(groth16Zkp, ZkpVariant.Groth16),
    trainingWheelsSignature: EphemeralSignature.fromHex(data.training_wheels_signature),
    expHorizonSecs: maxExpHorizonSecs,
  });
  return signedProof;
}

/**
 * Derives a keyless account by fetching the necessary proof and looking up the original account address.
 * This function helps in creating a keyless account that can be used without managing private keys directly.
 *
 * @param args - The arguments required to derive the keyless account.
 * @param args.aptosConfig - The configuration settings for Aptos.
 * @param args.jwt - The JSON Web Token used for authentication.
 * @param args.ephemeralKeyPair - The ephemeral key pair used for cryptographic operations.
 * @param args.uidKey - An optional unique identifier key for the user.
 * @param args.pepper - An optional hexadecimal input used for additional security.
 * @param args.proofFetchCallback - An optional callback function to handle the proof fetch outcome.
 * @returns A keyless account object.
 * @group Implementation
 */
export async function deriveKeylessAccount(args: {
  aptosConfig: AptosConfig;
  jwt: string;
  ephemeralKeyPair: EphemeralKeyPair;
  uidKey?: string;
  pepper?: HexInput;
  proofFetchCallback?: ProofFetchCallback;
}): Promise<KeylessAccount>;

export async function deriveKeylessAccount(args: {
  aptosConfig: AptosConfig;
  jwt: string;
  ephemeralKeyPair: EphemeralKeyPair;
  jwkAddress: AccountAddressInput;
  uidKey?: string;
  pepper?: HexInput;
  proofFetchCallback?: ProofFetchCallback;
}): Promise<FederatedKeylessAccount | MultiKeyAccount>;

export async function deriveKeylessAccount(args: {
  aptosConfig: AptosConfig;
  jwt: string;
  ephemeralKeyPair: EphemeralKeyPair;
  jwkAddress?: AccountAddressInput;
  uidKey?: string;
  pepper?: HexInput;
  proofFetchCallback?: ProofFetchCallback;
}): Promise<KeylessSigner> {
  const { aptosConfig, jwt, jwkAddress, uidKey, proofFetchCallback, pepper = await getPepper(args) } = args;
  const { verificationKey, maxExpHorizonSecs } = await getKeylessConfig({ aptosConfig });

  const proofPromise = getProof({ ...args, pepper, maxExpHorizonSecs });
  // If a callback is provided, pass in the proof as a promise to KeylessAccount.create.  This will make the proof be fetched in the
  // background and the callback will handle the outcome of the fetch.  This allows the developer to not have to block on the proof fetch
  // allowing for faster rendering of UX.
  //
  // If no callback is provided, the just await the proof fetch and continue synchronously.
  const proof = proofFetchCallback ? proofPromise : await proofPromise;

  // Look up the original address to handle key rotations and then instantiate the account.
  if (jwkAddress !== undefined) {
    if (isCognito(jwt)) {
      const multiKey = new MultiKey({
        publicKeys: [
          FederatedKeylessPublicKey.fromJwtAndPepperWithoutUnescaping({ jwt, pepper, jwkAddress, uidKey }),
          FederatedKeylessPublicKey.fromJwtAndPepper({ jwt, pepper, jwkAddress, uidKey }),
        ],
        signaturesRequired: 1,
      });
      const address = await lookupOriginalAccountAddress({
        aptosConfig,
        authenticationKey: multiKey.authKey().derivedAddress(),
      });
      const signer = FederatedKeylessAccount.create({
        ...args,
        address,
        proof,
        pepper,
        proofFetchCallback,
        jwkAddress,
        verificationKey,
      });
      return new MultiKeyAccount({
        multiKey,
        signers: [signer],
      });
    }
    const publicKey = FederatedKeylessPublicKey.fromJwtAndPepper({ jwt, pepper, jwkAddress, uidKey });
    const address = await lookupOriginalAccountAddress({
      aptosConfig,
      authenticationKey: publicKey.authKey().derivedAddress(),
    });

    return FederatedKeylessAccount.create({
      ...args,
      address,
      proof,
      pepper,
      proofFetchCallback,
      jwkAddress,
      verificationKey,
    });
  }

  const publicKey = KeylessPublicKey.fromJwtAndPepper({ jwt, pepper, uidKey });
  const address = await lookupOriginalAccountAddress({
    aptosConfig,
    authenticationKey: publicKey.authKey().derivedAddress(),
  });
  return KeylessAccount.create({ ...args, address, proof, pepper, proofFetchCallback, verificationKey });
}

function isCognito(jwt: string): boolean {
  const { iss } = getIssAudAndUidVal({ jwt });
  return COGNITO_ISS_PATTERN.test(iss);
}

export interface JWKS {
  keys: MoveJWK[];
}

export async function updateFederatedKeylessJwkSetTransaction(args: {
  aptosConfig: AptosConfig;
  sender: Account;
  iss: string;
  jwksUrl?: string;
  options?: InputGenerateTransactionOptions;
}): Promise<SimpleTransaction> {
  const { aptosConfig, sender, iss, options } = args;

  let { jwksUrl } = args;

  if (jwksUrl === undefined) {
    if (FIREBASE_AUTH_ISS_PATTERN.test(iss)) {
      jwksUrl = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
    } else {
      jwksUrl = iss.endsWith("/") ? `${iss}.well-known/jwks.json` : `${iss}/.well-known/jwks.json`;
    }
  }

  let response: Response;

  try {
    response = await fetch(jwksUrl);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
  } catch (error) {
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = `${error.message}`;
    } else {
      errorMessage = `error unknown - ${error}`;
    }
    throw KeylessError.fromErrorType({
      type: KeylessErrorType.JWK_FETCH_FAILED_FEDERATED,
      details: `Failed to fetch JWKS at ${jwksUrl}: ${errorMessage}`,
    });
  }

  const jwks: JWKS = await response.json();
  return generateTransaction({
    aptosConfig,
    sender: sender.accountAddress,
    data: {
      function: "0x1::jwks::update_federated_jwk_set",
      functionArguments: [
        iss,
        MoveVector.MoveString(jwks.keys.map((key) => key.kid)),
        MoveVector.MoveString(jwks.keys.map((key) => key.alg)),
        MoveVector.MoveString(jwks.keys.map((key) => key.e)),
        MoveVector.MoveString(jwks.keys.map((key) => key.n)),
      ],
    },
    options,
  });
}
