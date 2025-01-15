// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

// eslint-disable-next-line max-classes-per-file
import { JwtPayload, jwtDecode } from "jwt-decode";
import { sha3_256 } from "@noble/hashes/sha3";
import { AccountPublicKey, PublicKey } from "./publicKey";
import { Signature } from "./signature";
import { Deserializer, Serializable, Serializer } from "../../bcs";
import { Hex, hexToAsciiString } from "../hex";
import {
  HexInput,
  EphemeralCertificateVariant,
  AnyPublicKeyVariant,
  SigningScheme,
  ZkpVariant,
  LedgerVersionArg,
  MoveResource,
} from "../../types";
import { EphemeralPublicKey, EphemeralSignature } from "./ephemeral";
import { bigIntToBytesLE, bytesToBigIntLE, hashStrToField, poseidonHash } from "./poseidon";
import { AuthenticationKey } from "../authenticationKey";
import { Proof } from "./proof";
import { Ed25519PublicKey, Ed25519Signature } from "./ed25519";
import {
  Groth16VerificationKeyResponse,
  KeylessConfigurationResponse,
  MoveAnyStruct,
  PatchedJWKsResponse,
} from "../../types/keyless";
import { AptosConfig } from "../../api/aptosConfig";
import { getAptosFullNode } from "../../client";
import { memoizeAsync } from "../../utils/memoize";
import { AccountAddress, AccountAddressInput } from "../accountAddress";
import { getErrorMessage } from "../../utils";
import { KeylessError, KeylessErrorType } from "../../errors";
import { getClaimWithoutUnescaping } from "./utils";

/**
 * @group Implementation
 * @category Serialization
 */
export const EPK_HORIZON_SECS = 10000000;
/**
 * @group Implementation
 * @category Serialization
 */
export const MAX_AUD_VAL_BYTES = 120;
/**
 * @group Implementation
 * @category Serialization
 */
export const MAX_UID_KEY_BYTES = 30;
/**
 * @group Implementation
 * @category Serialization
 */
export const MAX_UID_VAL_BYTES = 330;
/**
 * @group Implementation
 * @category Serialization
 */
export const MAX_ISS_VAL_BYTES = 120;
/**
 * @group Implementation
 * @category Serialization
 */
export const MAX_EXTRA_FIELD_BYTES = 350;
/**
 * @group Implementation
 * @category Serialization
 */
export const MAX_JWT_HEADER_B64_BYTES = 300;
/**
 * @group Implementation
 * @category Serialization
 */
export const MAX_COMMITED_EPK_BYTES = 93;

/**
 * Represents a Keyless Public Key used for authentication.
 *
 * This class encapsulates the public key functionality for keyless authentication,
 * including methods for generating and verifying signatures, as well as serialization
 * and deserialization of the key. The KeylessPublicKey is represented in the SDK
 * as `AnyPublicKey`.
 * @group Implementation
 * @category Serialization
 */
export class KeylessPublicKey extends AccountPublicKey {
  /**
   * The number of bytes that `idCommitment` should be
   * @group Implementation
   * @category Serialization
   */
  static readonly ID_COMMITMENT_LENGTH: number = 32;

  /**
   * The value of the 'iss' claim on the JWT which identifies the OIDC provider.
   * @group Implementation
   * @category Serialization
   */
  readonly iss: string;

  /**
   * A value representing a cryptographic commitment to a user identity.
   *
   * It is calculated from the aud, uidKey, uidVal, pepper.
   * @group Implementation
   * @category Serialization
   */
  readonly idCommitment: Uint8Array;

  /**
   * Constructs an instance with the specified parameters for cryptographic operations.
   *
   * @param args - The parameters required to initialize the instance.
   * @param args.alphaG1 - The hex representation of the alpha G1 value.
   * @param args.betaG2 - The hex representation of the beta G2 value.
   * @param args.deltaG2 - The hex representation of the delta G2 value.
   * @param args.gammaAbcG1 - An array containing two hex representations for gamma ABC G1 values.
   * @param args.gammaG2 - The hex representation of the gamma G2 value.
   * @group Implementation
   * @category Serialization
   */
  // TODO: Fix the JSDoc for the below values
  constructor(iss: string, idCommitment: HexInput) {
    super();
    const idcBytes = Hex.fromHexInput(idCommitment).toUint8Array();
    if (idcBytes.length !== KeylessPublicKey.ID_COMMITMENT_LENGTH) {
      throw new Error(`Id Commitment length in bytes should be ${KeylessPublicKey.ID_COMMITMENT_LENGTH}`);
    }
    this.iss = iss;
    this.idCommitment = idcBytes;
  }

  /**
   * Get the authentication key for the keyless public key.
   *
   * @returns AuthenticationKey - The authentication key derived from the keyless public key.
   * @group Implementation
   * @category Serialization
   */
  authKey(): AuthenticationKey {
    const serializer = new Serializer();
    serializer.serializeU32AsUleb128(AnyPublicKeyVariant.Keyless);
    serializer.serializeFixedBytes(this.bcsToBytes());
    return AuthenticationKey.fromSchemeAndBytes({
      scheme: SigningScheme.SingleKey,
      input: serializer.toUint8Array(),
    });
  }

  /**
   * Verifies the validity of a signature for a given message.
   *
   * @param args - The arguments for signature verification.
   * @param args.message - The message that was signed.
   * @param args.signature - The signature to verify against the message.
   * @returns true if the signature is valid; otherwise, false.
   * @group Implementation
   * @category Serialization
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  verifySignature(args: { message: HexInput; signature: KeylessSignature }): boolean {
    throw new Error("Not yet implemented");
  }

  /**
   * Serializes the current instance into a format suitable for transmission or storage.
   * This function ensures that all relevant fields are properly serialized, including the proof and optional fields.
   *
   * @param serializer - The serializer instance used to perform the serialization.
   * @param serializer.proof - The proof to be serialized.
   * @param serializer.expHorizonSecs - The expiration horizon in seconds.
   * @param serializer.extraField - An optional additional field for serialization.
   * @param serializer.overrideAudVal - An optional override value for auditing.
   * @param serializer.trainingWheelsSignature - An optional signature for training wheels.
   * @group Implementation
   * @category Serialization
   */
  serialize(serializer: Serializer): void {
    serializer.serializeStr(this.iss);
    serializer.serializeBytes(this.idCommitment);
  }

  /**
   * Deserializes a ZeroKnowledgeSig object from the provided deserializer.
   * This function allows you to reconstruct a ZeroKnowledgeSig instance from its serialized form.
   *
   * @param deserializer - The deserializer instance used to read the serialized data.
   * @returns A new instance of ZeroKnowledgeSig.
   * @group Implementation
   * @category Serialization
   */
  static deserialize(deserializer: Deserializer): KeylessPublicKey {
    const iss = deserializer.deserializeStr();
    const addressSeed = deserializer.deserializeBytes();
    return new KeylessPublicKey(iss, addressSeed);
  }

  /**
   * Loads a KeylessPublicKey instance from the provided deserializer.
   * This function is used to deserialize the necessary components to create a KeylessPublicKey.
   *
   * @param deserializer - The deserializer used to extract the string and byte data.
   * @param deserializer.deserializeStr - A method to deserialize a string value.
   * @param deserializer.deserializeBytes - A method to deserialize byte data.
   * @returns A new instance of KeylessPublicKey.
   * @group Implementation
   * @category Serialization
   */
  static load(deserializer: Deserializer): KeylessPublicKey {
    const iss = deserializer.deserializeStr();
    const addressSeed = deserializer.deserializeBytes();
    return new KeylessPublicKey(iss, addressSeed);
  }

  /**
   * Determines if the provided public key is an instance of KeylessPublicKey.
   *
   * @param publicKey - The public key to check.
   * @returns A boolean indicating whether the public key is a KeylessPublicKey instance.
   * @group Implementation
   * @category Serialization
   */
  static isPublicKey(publicKey: PublicKey): publicKey is KeylessPublicKey {
    return publicKey instanceof KeylessPublicKey;
  }

  /**
   * Creates a KeylessPublicKey from the JWT components plus pepper
   *
   * @param args.iss the iss of the identity
   * @param args.uidKey the key to use to get the uidVal in the JWT token
   * @param args.uidVal the value of the uidKey in the JWT token
   * @param args.aud the client ID of the application
   * @param args.pepper The pepper used to maintain privacy of the account
   * @returns KeylessPublicKey
   * @group Implementation
   * @category Serialization
   */
  static create(args: {
    iss: string;
    uidKey: string;
    uidVal: string;
    aud: string;
    pepper: HexInput;
  }): KeylessPublicKey {
    computeIdCommitment(args);
    return new KeylessPublicKey(args.iss, computeIdCommitment(args));
  }

  /**
   * Creates a KeylessPublicKey instance from a JWT and a pepper value.
   * This function is useful for generating a public key that can be used for authentication based on the provided JWT claims and pepper.
   *
   * @param args - The arguments for creating the KeylessPublicKey.
   * @param args.jwt - The JSON Web Token to decode.
   * @param args.pepper - The pepper value used in the key creation process.
   * @param args.uidKey - An optional key to retrieve the unique identifier from the JWT payload, defaults to "sub".
   * @returns A KeylessPublicKey instance created from the provided JWT and pepper.
   * @group Implementation
   * @category Serialization
   */
  static fromJwtAndPepper(args: { jwt: string; pepper: HexInput; uidKey?: string }): KeylessPublicKey {
    const { jwt, pepper, uidKey = "sub" } = args;

    const { iss, aud, uidVal } = getIssAudAndUidVal({ jwt, uidKey });
    return KeylessPublicKey.create({ iss, uidKey, uidVal, aud, pepper });
  }

  /**
   * Checks if the provided public key is a valid instance by verifying its structure and types.
   *
   * @param publicKey - The public key to validate.
   * @returns A boolean indicating whether the public key is a valid instance.
   * @group Implementation
   * @category Serialization
   */
  static isInstance(publicKey: PublicKey) {
    return (
      "iss" in publicKey &&
      typeof publicKey.iss === "string" &&
      "idCommitment" in publicKey &&
      publicKey.idCommitment instanceof Uint8Array
    );
  }
}

function computeIdCommitment(args: { uidKey: string; uidVal: string; aud: string; pepper: HexInput }): Uint8Array {
  const { uidKey, uidVal, aud, pepper } = args;

  const fields = [
    bytesToBigIntLE(Hex.fromHexInput(pepper).toUint8Array()),
    hashStrToField(aud, MAX_AUD_VAL_BYTES),
    hashStrToField(uidVal, MAX_UID_VAL_BYTES),
    hashStrToField(uidKey, MAX_UID_KEY_BYTES),
  ];

  return bigIntToBytesLE(poseidonHash(fields), KeylessPublicKey.ID_COMMITMENT_LENGTH);
}

/**
 * Represents a signature of a message signed via a Keyless Account, utilizing proofs or a JWT token for authentication.
 * @group Implementation
 * @category Serialization
 */
export class KeylessSignature extends Signature {
  /**
   * The inner signature ZeroKnowledgeSignature or OpenIdSignature
   * @group Implementation
   * @category Serialization
   */
  readonly ephemeralCertificate: EphemeralCertificate;

  /**
   * The jwt header in the token used to create the proof/signature.  In json string representation.
   * @group Implementation
   * @category Serialization
   */
  readonly jwtHeader: string;

  /**
   * The expiry timestamp in seconds of the EphemeralKeyPair used to sign
   * @group Implementation
   * @category Serialization
   */
  readonly expiryDateSecs: number;

  /**
   * The ephemeral public key used to verify the signature
   * @group Implementation
   * @category Serialization
   */
  readonly ephemeralPublicKey: EphemeralPublicKey;

  /**
   * The signature resulting from signing with the private key of the EphemeralKeyPair
   * @group Implementation
   * @category Serialization
   */
  readonly ephemeralSignature: EphemeralSignature;

  constructor(args: {
    jwtHeader: string;
    ephemeralCertificate: EphemeralCertificate;
    expiryDateSecs: number;
    ephemeralPublicKey: EphemeralPublicKey;
    ephemeralSignature: EphemeralSignature;
  }) {
    super();
    const { jwtHeader, ephemeralCertificate, expiryDateSecs, ephemeralPublicKey, ephemeralSignature } = args;
    this.jwtHeader = jwtHeader;
    this.ephemeralCertificate = ephemeralCertificate;
    this.expiryDateSecs = expiryDateSecs;
    this.ephemeralPublicKey = ephemeralPublicKey;
    this.ephemeralSignature = ephemeralSignature;
  }

  /**
   * Get the kid of the JWT used to derive the Keyless Account used to sign.
   *
   * @returns the kid as a string
   */
  getJwkKid(): string {
    return parseJwtHeader(this.jwtHeader).kid;
  }

  serialize(serializer: Serializer): void {
    this.ephemeralCertificate.serialize(serializer);
    serializer.serializeStr(this.jwtHeader);
    serializer.serializeU64(this.expiryDateSecs);
    this.ephemeralPublicKey.serialize(serializer);
    this.ephemeralSignature.serialize(serializer);
  }

  static deserialize(deserializer: Deserializer): KeylessSignature {
    const ephemeralCertificate = EphemeralCertificate.deserialize(deserializer);
    const jwtHeader = deserializer.deserializeStr();
    const expiryDateSecs = deserializer.deserializeU64();
    const ephemeralPublicKey = EphemeralPublicKey.deserialize(deserializer);
    const ephemeralSignature = EphemeralSignature.deserialize(deserializer);
    return new KeylessSignature({
      jwtHeader,
      expiryDateSecs: Number(expiryDateSecs),
      ephemeralCertificate,
      ephemeralPublicKey,
      ephemeralSignature,
    });
  }

  static getSimulationSignature(): KeylessSignature {
    return new KeylessSignature({
      jwtHeader: "{}",
      ephemeralCertificate: new EphemeralCertificate(
        new ZeroKnowledgeSig({
          proof: new ZkProof(
            new Groth16Zkp({ a: new Uint8Array(32), b: new Uint8Array(64), c: new Uint8Array(32) }),
            ZkpVariant.Groth16,
          ),
          expHorizonSecs: 0,
        }),
        EphemeralCertificateVariant.ZkProof,
      ),
      expiryDateSecs: 0,
      ephemeralPublicKey: new EphemeralPublicKey(new Ed25519PublicKey(new Uint8Array(32))),
      ephemeralSignature: new EphemeralSignature(new Ed25519Signature(new Uint8Array(64))),
    });
  }

  static isSignature(signature: Signature): signature is KeylessSignature {
    return signature instanceof KeylessSignature;
  }
}

/**
 * Represents an ephemeral certificate containing a signature, specifically a ZeroKnowledgeSig.
 * This class can be extended to support additional signature types, such as OpenIdSignature.
 *
 * @extends Signature
 * @group Implementation
 * @category Serialization
 */
export class EphemeralCertificate extends Signature {
  public readonly signature: Signature;

  /**
   * Index of the underlying enum variant
   * @group Implementation
   * @category Serialization
   */
  private readonly variant: EphemeralCertificateVariant;

  constructor(signature: Signature, variant: EphemeralCertificateVariant) {
    super();
    this.signature = signature;
    this.variant = variant;
  }

  /**
   * Get the public key in bytes (Uint8Array).
   *
   * @returns Uint8Array representation of the public key
   * @group Implementation
   * @category Serialization
   */
  toUint8Array(): Uint8Array {
    return this.signature.toUint8Array();
  }

  serialize(serializer: Serializer): void {
    serializer.serializeU32AsUleb128(this.variant);
    this.signature.serialize(serializer);
  }

  static deserialize(deserializer: Deserializer): EphemeralCertificate {
    const variant = deserializer.deserializeUleb128AsU32();
    switch (variant) {
      case EphemeralCertificateVariant.ZkProof:
        return new EphemeralCertificate(ZeroKnowledgeSig.deserialize(deserializer), variant);
      default:
        throw new Error(`Unknown variant index for EphemeralCertificate: ${variant}`);
    }
  }
}

/**
 * Represents a fixed-size byte array of 32 bytes, extending the Serializable class.
 * This class is used for handling and serializing G1 bytes in cryptographic operations.
 *
 * @extends Serializable
 * @group Implementation
 * @category Serialization
 */
class G1Bytes extends Serializable {
  data: Uint8Array;

  constructor(data: HexInput) {
    super();
    this.data = Hex.fromHexInput(data).toUint8Array();
    if (this.data.length !== 32) {
      throw new Error("Input needs to be 32 bytes");
    }
  }

  serialize(serializer: Serializer): void {
    serializer.serializeFixedBytes(this.data);
  }

  static deserialize(deserializer: Deserializer): G1Bytes {
    const bytes = deserializer.deserializeFixedBytes(32);
    return new G1Bytes(bytes);
  }
}

/**
 * Represents a 64-byte G2 element in a cryptographic context.
 * This class provides methods for serialization and deserialization of G2 bytes.
 *
 * @extends Serializable
 * @group Implementation
 * @category Serialization
 */
class G2Bytes extends Serializable {
  data: Uint8Array;

  constructor(data: HexInput) {
    super();
    this.data = Hex.fromHexInput(data).toUint8Array();
    if (this.data.length !== 64) {
      throw new Error("Input needs to be 64 bytes");
    }
  }

  serialize(serializer: Serializer): void {
    serializer.serializeFixedBytes(this.data);
  }

  static deserialize(deserializer: Deserializer): G2Bytes {
    const bytes = deserializer.deserializeFixedBytes(64);
    return new G2Bytes(bytes);
  }
}

/**
 * Represents a Groth16 zero-knowledge proof, consisting of three proof points in compressed serialization format.
 * The points are the compressed serialization of affine representation of the proof.
 *
 * @extends Proof
 * @group Implementation
 * @category Serialization
 */
export class Groth16Zkp extends Proof {
  /**
   * The bytes of G1 proof point a
   * @group Implementation
   * @category Serialization
   */
  a: G1Bytes;

  /**
   * The bytes of G2 proof point b
   * @group Implementation
   * @category Serialization
   */
  b: G2Bytes;

  /**
   * The bytes of G1 proof point c
   * @group Implementation
   * @category Serialization
   */
  c: G1Bytes;

  constructor(args: { a: HexInput; b: HexInput; c: HexInput }) {
    super();
    const { a, b, c } = args;
    this.a = new G1Bytes(a);
    this.b = new G2Bytes(b);
    this.c = new G1Bytes(c);
  }

  serialize(serializer: Serializer): void {
    this.a.serialize(serializer);
    this.b.serialize(serializer);
    this.c.serialize(serializer);
  }

  static deserialize(deserializer: Deserializer): Groth16Zkp {
    const a = G1Bytes.deserialize(deserializer).bcsToBytes();
    const b = G2Bytes.deserialize(deserializer).bcsToBytes();
    const c = G1Bytes.deserialize(deserializer).bcsToBytes();
    return new Groth16Zkp({ a, b, c });
  }
}

/**
 * Represents a container for different types of zero-knowledge proofs.
 *
 * @extends Serializable
 * @group Implementation
 * @category Serialization
 */
export class ZkProof extends Serializable {
  public readonly proof: Proof;

  /**
   * Index of the underlying enum variant
   * @group Implementation
   * @category Serialization
   */
  private readonly variant: ZkpVariant;

  constructor(proof: Proof, variant: ZkpVariant) {
    super();
    this.proof = proof;
    this.variant = variant;
  }

  serialize(serializer: Serializer): void {
    serializer.serializeU32AsUleb128(this.variant);
    this.proof.serialize(serializer);
  }

  static deserialize(deserializer: Deserializer): ZkProof {
    const variant = deserializer.deserializeUleb128AsU32();
    switch (variant) {
      case ZkpVariant.Groth16:
        return new ZkProof(Groth16Zkp.deserialize(deserializer), variant);
      default:
        throw new Error(`Unknown variant index for ZkProof: ${variant}`);
    }
  }
}

/**
 * Represents a zero-knowledge signature, encapsulating the proof and its associated metadata.
 *
 * @extends Signature
 * @group Implementation
 * @category Serialization
 */
export class ZeroKnowledgeSig extends Signature {
  /**
   * The proof
   * @group Implementation
   * @category Serialization
   */
  readonly proof: ZkProof;

  /**
   * The max lifespan of the proof
   * @group Implementation
   * @category Serialization
   */
  readonly expHorizonSecs: number;

  /**
   * A key value pair on the JWT token that can be specified on the signature which would reveal the value on chain.
   * Can be used to assert identity or other attributes.
   * @group Implementation
   * @category Serialization
   */
  readonly extraField?: string;

  /**
   * The 'aud' value of the recovery service which is set when recovering an account.
   * @group Implementation
   * @category Serialization
   */
  readonly overrideAudVal?: string;

  /**
   * The training wheels signature
   * @group Implementation
   * @category Serialization
   */
  readonly trainingWheelsSignature?: EphemeralSignature;

  constructor(args: {
    proof: ZkProof;
    expHorizonSecs: number;
    extraField?: string;
    overrideAudVal?: string;
    trainingWheelsSignature?: EphemeralSignature;
  }) {
    super();
    const { proof, expHorizonSecs, trainingWheelsSignature, extraField, overrideAudVal } = args;
    this.proof = proof;
    this.expHorizonSecs = expHorizonSecs;
    this.trainingWheelsSignature = trainingWheelsSignature;
    this.extraField = extraField;
    this.overrideAudVal = overrideAudVal;
  }

  /**
   * Deserialize a ZeroKnowledgeSig object from its BCS serialization in bytes.
   *
   * @param bytes - The bytes representing the serialized ZeroKnowledgeSig.
   * @returns ZeroKnowledgeSig - The deserialized ZeroKnowledgeSig object.
   * @group Implementation
   * @category Serialization
   */
  static fromBytes(bytes: Uint8Array): ZeroKnowledgeSig {
    return ZeroKnowledgeSig.deserialize(new Deserializer(bytes));
  }

  serialize(serializer: Serializer): void {
    this.proof.serialize(serializer);
    serializer.serializeU64(this.expHorizonSecs);
    serializer.serializeOption(this.extraField);
    serializer.serializeOption(this.overrideAudVal);
    serializer.serializeOption(this.trainingWheelsSignature);
  }

  static deserialize(deserializer: Deserializer): ZeroKnowledgeSig {
    const proof = ZkProof.deserialize(deserializer);
    const expHorizonSecs = Number(deserializer.deserializeU64());
    const extraField = deserializer.deserializeOption("string");
    const overrideAudVal = deserializer.deserializeOption("string");
    const trainingWheelsSignature = deserializer.deserializeOption(EphemeralSignature);
    return new ZeroKnowledgeSig({ proof, expHorizonSecs, trainingWheelsSignature, extraField, overrideAudVal });
  }
}

/**
 * Represents the on-chain configuration for how Keyless accounts operate.
 *
 * @remarks
 * This class encapsulates the verification key and the maximum lifespan of ephemeral key pairs,
 * which are essential for the functionality of Keyless accounts.
 * @group Implementation
 * @category Serialization
 */
export class KeylessConfiguration {
  /**
   * The verification key used to verify Groth16 proofs on chain
   * @group Implementation
   * @category Serialization
   */
  readonly verificationKey: Groth16VerificationKey;

  /**
   * The maximum lifespan of an ephemeral key pair.  This is configured on chain.
   * @group Implementation
   * @category Serialization
   */
  readonly maxExpHorizonSecs: number;

  constructor(verificationKey: Groth16VerificationKey, maxExpHorizonSecs: number) {
    this.verificationKey = verificationKey;
    this.maxExpHorizonSecs = maxExpHorizonSecs;
  }

  static create(res: Groth16VerificationKeyResponse, maxExpHorizonSecs: number): KeylessConfiguration {
    return new KeylessConfiguration(
      new Groth16VerificationKey({
        alphaG1: res.alpha_g1,
        betaG2: res.beta_g2,
        deltaG2: res.delta_g2,
        gammaAbcG1: res.gamma_abc_g1,
        gammaG2: res.gamma_g2,
      }),
      maxExpHorizonSecs,
    );
  }
}

/**
 * Represents the verification key stored on-chain used to verify Groth16 proofs.
 * @group Implementation
 * @category Serialization
 */
export class Groth16VerificationKey {
  // The docstrings below are borrowed from ark-groth16

  /**
   * The `alpha * G`, where `G` is the generator of G1
   * @group Implementation
   * @category Serialization
   */
  readonly alphaG1: G1Bytes;

  /**
   * The `alpha * H`, where `H` is the generator of G2
   * @group Implementation
   * @category Serialization
   */
  readonly betaG2: G2Bytes;

  /**
   * The `delta * H`, where `H` is the generator of G2
   * @group Implementation
   * @category Serialization
   */
  readonly deltaG2: G2Bytes;

  /**
   * The `gamma^{-1} * (beta * a_i + alpha * b_i + c_i) * H`, where H is the generator of G1
   * @group Implementation
   * @category Serialization
   */
  readonly gammaAbcG1: [G1Bytes, G1Bytes];

  /**
   * The `gamma * H`, where `H` is the generator of G2
   * @group Implementation
   * @category Serialization
   */
  readonly gammaG2: G2Bytes;

  constructor(args: {
    alphaG1: HexInput;
    betaG2: HexInput;
    deltaG2: HexInput;
    gammaAbcG1: [HexInput, HexInput];
    gammaG2: HexInput;
  }) {
    const { alphaG1, betaG2, deltaG2, gammaAbcG1, gammaG2 } = args;
    this.alphaG1 = new G1Bytes(alphaG1);
    this.betaG2 = new G2Bytes(betaG2);
    this.deltaG2 = new G2Bytes(deltaG2);
    this.gammaAbcG1 = [new G1Bytes(gammaAbcG1[0]), new G1Bytes(gammaAbcG1[1])];
    this.gammaG2 = new G2Bytes(gammaG2);
  }

  /**
   * Calculates the hash of the serialized form of the verification key.
   * This is useful for comparing verification keys or using them as unique identifiers.
   *
   * @returns The SHA3-256 hash of the serialized verification key as a Uint8Array
   */
  public hash(): Uint8Array {
    const serializer = new Serializer();
    this.serialize(serializer);
    return sha3_256.create().update(serializer.toUint8Array()).digest();
  }

  serialize(serializer: Serializer): void {
    this.alphaG1.serialize(serializer);
    this.betaG2.serialize(serializer);
    this.deltaG2.serialize(serializer);
    this.gammaAbcG1[0].serialize(serializer);
    this.gammaAbcG1[1].serialize(serializer);
    this.gammaG2.serialize(serializer);
  }

  /**
   * Converts a Groth16VerificationKeyResponse object into a Groth16VerificationKey instance.
   *
   * @param res - The Groth16VerificationKeyResponse object containing the verification key data.
   * @param res.alpha_g1 - The alpha G1 value from the response.
   * @param res.beta_g2 - The beta G2 value from the response.
   * @param res.delta_g2 - The delta G2 value from the response.
   * @param res.gamma_abc_g1 - The gamma ABC G1 value from the response.
   * @param res.gamma_g2 - The gamma G2 value from the response.
   * @returns A Groth16VerificationKey instance constructed from the provided response data.
   * @group Implementation
   * @category Serialization
   */
  static fromGroth16VerificationKeyResponse(res: Groth16VerificationKeyResponse): Groth16VerificationKey {
    return new Groth16VerificationKey({
      alphaG1: res.alpha_g1,
      betaG2: res.beta_g2,
      deltaG2: res.delta_g2,
      gammaAbcG1: res.gamma_abc_g1,
      gammaG2: res.gamma_g2,
    });
  }
}

/**
 * Retrieves the configuration parameters for Keyless Accounts on the blockchain, including the verifying key and the maximum
 * expiry horizon.
 *
 * @param args - The arguments for retrieving the keyless configuration.
 * @param args.aptosConfig - The Aptos configuration object containing network details.
 * @param args.options - Optional parameters for the request.
 * @param args.options.ledgerVersion - The ledger version to query; if not provided, the latest version will be used.
 * @returns KeylessConfiguration - The configuration object containing the verifying key and maximum expiry horizon.
 * @group Implementation
 * @category Serialization
 */
export async function getKeylessConfig(args: {
  aptosConfig: AptosConfig;
  options?: LedgerVersionArg;
}): Promise<KeylessConfiguration> {
  const { aptosConfig } = args;
  try {
    return await memoizeAsync(
      async () => {
        const config = await getKeylessConfigurationResource(args);
        const vk = await getGroth16VerificationKeyResource(args);
        return KeylessConfiguration.create(vk, Number(config.max_exp_horizon_secs));
      },
      `keyless-configuration-${aptosConfig.network}`,
      1000 * 60 * 5, // 5 minutes
    )();
  } catch (error) {
    if (error instanceof KeylessError) {
      throw error;
    }
    throw KeylessError.fromErrorType({
      type: KeylessErrorType.FULL_NODE_OTHER,
      error,
    });
  }
}

/**
 * Parses a JWT and returns the 'iss', 'aud', and 'uid' values.
 *
 * @param args - The arguments for parsing the JWT.
 * @param args.jwt - The JWT to parse.
 * @param args.uidKey - The key to use for the 'uid' value; defaults to 'sub'.
 * @returns The 'iss', 'aud', and 'uid' values from the JWT.
 */
export function getIssAudAndUidVal(args: { jwt: string; uidKey?: string }): {
  iss: string;
  aud: string;
  uidVal: string;
} {
  const { jwt, uidKey = "sub" } = args;
  let jwtPayload: JwtPayload & { [key: string]: string };
  try {
    jwtPayload = jwtDecode<JwtPayload & { [key: string]: string }>(jwt);
  } catch (error) {
    throw KeylessError.fromErrorType({
      type: KeylessErrorType.JWT_PARSING_ERROR,
      details: `Failed to parse JWT - ${getErrorMessage(error)}`,
    });
  }
  if (typeof jwtPayload.iss !== "string") {
    throw KeylessError.fromErrorType({
      type: KeylessErrorType.JWT_PARSING_ERROR,
      details: "JWT is missing 'iss' in the payload. This should never happen.",
    });
  }
  if (typeof jwtPayload.aud !== "string") {
    throw KeylessError.fromErrorType({
      type: KeylessErrorType.JWT_PARSING_ERROR,
      details: "JWT is missing 'aud' in the payload or 'aud' is an array of values.",
    });
  }
  const uidVal = jwtPayload[uidKey];
  return { iss: jwtPayload.iss, aud: jwtPayload.aud, uidVal };
}

/**
 * Parses a JWT and returns the 'iss', 'aud', and 'uid' values without unescaping the values.
 *
 * @param args - The arguments for parsing the JWT.
 * @param args.jwt - The JWT to parse.
 * @param args.uidKey - The key to use for the 'uid' value; defaults to 'sub'.
 * @returns The 'iss', 'aud', and 'uid' values from the JWT.
 */
export function getIssAudAndUidValWithoutUnescaping(args: { jwt: string; uidKey?: string }): {
  iss: string;
  aud: string;
  uidVal: string;
} {
  const { jwt, uidKey = "sub" } = args;
  getIssAudAndUidVal(args);
  return {
    iss: getClaimWithoutUnescaping(jwt, "iss"),
    aud: getClaimWithoutUnescaping(jwt, "aud"),
    uidVal: getClaimWithoutUnescaping(jwt, uidKey),
  };
}

/**
 * Retrieves the KeylessConfiguration set on chain.
 *
 * @param args - The arguments for retrieving the configuration.
 * @param args.aptosConfig - The configuration for connecting to the Aptos network.
 * @param args.options - Optional parameters for the request.
 * @param args.options.ledgerVersion - The ledger version to query; if not provided, it will get the latest version.
 * @returns KeylessConfigurationResponse - The response containing the keyless configuration data.
 * @group Implementation
 * @category Serialization
 */
async function getKeylessConfigurationResource(args: {
  aptosConfig: AptosConfig;
  options?: LedgerVersionArg;
}): Promise<KeylessConfigurationResponse> {
  const { aptosConfig, options } = args;
  const resourceType = "0x1::keyless_account::Configuration";
  try {
    const { data } = await getAptosFullNode<{}, MoveResource<KeylessConfigurationResponse>>({
      aptosConfig,
      originMethod: "getKeylessConfigurationResource",
      path: `accounts/${AccountAddress.from("0x1").toString()}/resource/${resourceType}`,
      params: { ledger_version: options?.ledgerVersion },
    });
    return data.data;
  } catch (error) {
    throw KeylessError.fromErrorType({
      type: KeylessErrorType.FULL_NODE_CONFIG_LOOKUP_ERROR,
      error,
    });
  }
}

/**
 * Retrieves the Groth16VerificationKey set on the blockchain.
 *
 * @param args - The arguments for retrieving the verification key.
 * @param args.aptosConfig - The Aptos configuration object.
 * @param args.options - Optional parameters for the request.
 * @param args.options.ledgerVersion - The ledger version to query; if not provided, it will get the latest version.
 * @returns Groth16VerificationKeyResponse - The response containing the Groth16 verification key data.
 * @group Implementation
 * @category Serialization
 */
async function getGroth16VerificationKeyResource(args: {
  aptosConfig: AptosConfig;
  options?: LedgerVersionArg;
}): Promise<Groth16VerificationKeyResponse> {
  const { aptosConfig, options } = args;
  const resourceType = "0x1::keyless_account::Groth16VerificationKey";
  try {
    const { data } = await getAptosFullNode<{}, MoveResource<Groth16VerificationKeyResponse>>({
      aptosConfig,
      originMethod: "getGroth16VerificationKeyResource",
      path: `accounts/${AccountAddress.from("0x1").toString()}/resource/${resourceType}`,
      params: { ledger_version: options?.ledgerVersion },
    });
    return data.data;
  } catch (error) {
    throw KeylessError.fromErrorType({
      type: KeylessErrorType.FULL_NODE_VERIFICATION_KEY_LOOKUP_ERROR,
      error,
    });
  }
}

export async function getKeylessJWKs(args: {
  aptosConfig: AptosConfig;
  jwkAddr?: AccountAddressInput;
  options?: LedgerVersionArg;
}): Promise<Map<string, MoveJWK[]>> {
  const { aptosConfig, jwkAddr, options } = args;
  let resource: MoveResource<PatchedJWKsResponse>;
  if (!jwkAddr) {
    const resourceType = "0x1::jwks::PatchedJWKs";
    const { data } = await getAptosFullNode<{}, MoveResource<PatchedJWKsResponse>>({
      aptosConfig,
      originMethod: "getKeylessJWKs",
      path: `accounts/0x1/resource/${resourceType}`,
      params: { ledger_version: options?.ledgerVersion },
    });
    resource = data;
  } else {
    const resourceType = "0x1::jwks::FederatedJWKs";
    const { data } = await getAptosFullNode<{}, MoveResource<PatchedJWKsResponse>>({
      aptosConfig,
      originMethod: "getKeylessJWKs",
      path: `accounts/${AccountAddress.from(jwkAddr).toString()}/resource/${resourceType}`,
      params: { ledger_version: options?.ledgerVersion },
    });
    resource = data;
  }

  // Create a map of issuer to JWK arrays
  const jwkMap = new Map<string, MoveJWK[]>();
  for (const entry of resource.data.jwks.entries) {
    const jwks: MoveJWK[] = [];
    for (const jwkStruct of entry.jwks) {
      const { data: jwkData } = jwkStruct.variant;
      const deserializer = new Deserializer(Hex.fromHexInput(jwkData).toUint8Array());
      const jwk = MoveJWK.deserialize(deserializer);
      jwks.push(jwk);
    }
    jwkMap.set(hexToAsciiString(entry.issuer), jwks);
  }

  return jwkMap;
}

export class MoveJWK extends Serializable {
  public kid: string;

  public kty: string;

  public alg: string;

  public e: string;

  public n: string;

  constructor(args: { kid: string; kty: string; alg: string; e: string; n: string }) {
    super();
    const { kid, kty, alg, e, n } = args;
    this.kid = kid;
    this.kty = kty;
    this.alg = alg;
    this.e = e;
    this.n = n;
  }

  serialize(serializer: Serializer): void {
    serializer.serializeStr(this.kid);
    serializer.serializeStr(this.kty);
    serializer.serializeStr(this.alg);
    serializer.serializeStr(this.e);
    serializer.serializeStr(this.n);
  }

  static fromMoveStruct(struct: MoveAnyStruct): MoveJWK {
    const { data } = struct.variant;
    const deserializer = new Deserializer(Hex.fromHexInput(data).toUint8Array());
    return MoveJWK.deserialize(deserializer);
  }

  static deserialize(deserializer: Deserializer): MoveJWK {
    const kid = deserializer.deserializeStr();
    const kty = deserializer.deserializeStr();
    const alg = deserializer.deserializeStr();
    const n = deserializer.deserializeStr();
    const e = deserializer.deserializeStr();
    return new MoveJWK({ kid, kty, alg, n, e });
  }
}

interface JwtHeader {
  kid: string; // Key ID
}
/**
 * Safely parses the JWT header.
 * @param jwtHeader The JWT header string
 * @returns Parsed JWT header as an object.
 */
export function parseJwtHeader(jwtHeader: string): JwtHeader {
  try {
    const header = JSON.parse(jwtHeader);
    if (header.kid === undefined) {
      throw new Error("JWT header missing kid");
    }
    return header;
  } catch (error) {
    throw new Error("Failed to parse JWT header.");
  }
}
