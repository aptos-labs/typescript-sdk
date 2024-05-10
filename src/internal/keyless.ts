// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

/**
 * This file contains the underlying implementations for exposed API surface in
 * the {@link api/oidb}. By moving the methods out into a separate file,
 * other namespaces and processes can access these methods without depending on the entire
 * faucet namespace and without having a dependency cycle error.
 */
import { jwtDecode } from "jwt-decode";
import { AptosConfig } from "../api/aptosConfig";
import { postAptosPepperService, postAptosProvingService } from "../client";
import { EPK_HORIZON_SECS, EphemeralSignature, Groth16Zkp, Hex, SignedGroth16Signature } from "../core";
import { HexInput } from "../types";
import { EphemeralKeyPair, KeylessAccount, ProofFetchCallback } from "../account";
import { PepperFetchResponse, ProverResponse } from "../types/keyless";

export async function getPepper(args: {
  aptosConfig: AptosConfig;
  jwt: string;
  ephemeralKeyPair: EphemeralKeyPair;
  uidKey?: string;
  derivationPath?: string;
  verify?: boolean;
}): Promise<Uint8Array> {
  const { aptosConfig, jwt, ephemeralKeyPair, uidKey, derivationPath } = args;

  const body = {
    jwt_b64: jwt,
    epk: ephemeralKeyPair.getPublicKey().bcsToHex().toStringWithoutPrefix(),
    exp_date_secs: Number(ephemeralKeyPair.expiryDateSecs),
    epk_blinder: Hex.fromHexInput(ephemeralKeyPair.blinder).toStringWithoutPrefix(),
    uid_key: uidKey,
    derivation_path: derivationPath,
  };
  const { data } = await postAptosPepperService<any, PepperFetchResponse>({
    aptosConfig,
    path: "fetch",
    body,
    originMethod: "getPepper",
    overrides: { WITH_CREDENTIALS: false },
  });
  return Hex.fromHexInput(data.pepper).toUint8Array();
}

export async function getProof(args: {
  aptosConfig: AptosConfig;
  jwt: string;
  ephemeralKeyPair: EphemeralKeyPair;
  pepper: HexInput;
  uidKey?: string;
  extraFieldKey?: string;
}): Promise<SignedGroth16Signature> {
  const { aptosConfig, jwt, ephemeralKeyPair, pepper, uidKey, extraFieldKey } = args;
  const jwtPayload = jwtDecode<{ [key: string]: string }>(jwt);
  let extraField;
  if (extraFieldKey) {
    const extraFieldVal = jwtPayload[extraFieldKey];
    extraField = `"${extraFieldKey}":"${extraFieldVal}",`;
  }
  const json = {
    jwt_b64: jwt,
    epk: ephemeralKeyPair.getPublicKey().bcsToHex().toStringWithoutPrefix(),
    epk_blinder: Hex.fromHexInput(ephemeralKeyPair.blinder).toStringWithoutPrefix(),
    exp_date_secs: Number(ephemeralKeyPair.expiryDateSecs),
    exp_horizon_secs: EPK_HORIZON_SECS,
    pepper: Hex.fromHexInput(pepper).toStringWithoutPrefix(),
    extra_field: extraFieldKey,
    uid_key: uidKey || "sub",
  };

  const { data } = await postAptosProvingService<any, ProverResponse>({
    aptosConfig,
    path: "prove",
    body: json,
    originMethod: "getProof",
    overrides: { WITH_CREDENTIALS: false },
  });

  const proofPoints = data.proof;
  const proof = new Groth16Zkp({
    a: proofPoints.a,
    b: proofPoints.b,
    c: proofPoints.c,
  });

  const signedProof = new SignedGroth16Signature({
    proof,
    extraField,
    trainingWheelsSignature: EphemeralSignature.fromHex(data.training_wheels_signature),
  });
  return signedProof;
}

export async function deriveKeylessAccount(args: {
  aptosConfig: AptosConfig;
  jwt: string;
  ephemeralKeyPair: EphemeralKeyPair;
  uidKey?: string;
  pepper?: HexInput;
  extraFieldKey?: string;
  proofFetchCallback?: ProofFetchCallback;
}): Promise<KeylessAccount> {
  const { proofFetchCallback } = args;
  let { pepper } = args;
  if (pepper === undefined) {
    pepper = await getPepper(args);
  } else if (Hex.fromHexInput(pepper).toUint8Array().length !== 31) {
    throw new Error("Pepper needs to be 31 bytes");
  }

  const proofPromise = getProof({ ...args, pepper });
  const proof = proofFetchCallback ? proofPromise : await proofPromise;

  const keylessAccount = KeylessAccount.fromJWTAndProof({ ...args, proof, pepper, proofFetchCallback });

  return keylessAccount;
}
