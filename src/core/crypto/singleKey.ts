import { Deserializer, Serializer } from "../../bcs";
import { AnyPublicKeyVariant, AnySignatureVariant, SigningScheme as AuthenticationKeyScheme } from "../../types";
import { AuthenticationKey } from "../authenticationKey";
import { Ed25519PrivateKey, Ed25519PublicKey, Ed25519Signature } from "./ed25519";
import { AccountPublicKey, PublicKey, VerifySignatureArgs } from "./publicKey";
import { Secp256k1PrivateKey, Secp256k1PublicKey, Secp256k1Signature } from "./secp256k1";
import { KeylessPublicKey, KeylessSignature } from "./keyless";
import { Signature } from "./signature";
import { FederatedKeylessPublicKey } from "./federatedKeyless";
import { MultiKey, MultiKeySignature } from "./multiKey";

export type PrivateKeyInput = Ed25519PrivateKey | Secp256k1PrivateKey;

/**
 * Represents any public key supported by Aptos.
 *
 * Since [AIP-55](https://github.com/aptos-foundation/AIPs/pull/263) Aptos supports
 * `Legacy` and `Unified` authentication keys.
 *
 * Any unified authentication key is represented in the SDK as `AnyPublicKey`.
 * @group Implementation
 * @category Serialization
 */
export class AnyPublicKey extends AccountPublicKey {
  /**
   * Reference to the inner public key
   * @group Implementation
   * @category Serialization
   */
  public readonly publicKey: PublicKey;

  /**
   * Index of the underlying enum variant
   * @group Implementation
   * @category Serialization
   */
  public readonly variant: AnyPublicKeyVariant;

  // region Constructors

  /**
   * Creates an instance of the signature class based on the provided signature type.
   * This allows for the handling of different signature variants such as Ed25519, Secp256k1, and Keyless.
   *
   * @param publicKey - The publicKey object which determines the variant to be used.
   * @throws Error if the provided signature type is unsupported.
   * @group Implementation
   * @category Serialization
   */
  constructor(publicKey: PublicKey) {
    super();
    this.publicKey = publicKey;
    if (publicKey instanceof Ed25519PublicKey) {
      this.variant = AnyPublicKeyVariant.Ed25519;
    } else if (publicKey instanceof Secp256k1PublicKey) {
      this.variant = AnyPublicKeyVariant.Secp256k1;
    } else if (publicKey instanceof KeylessPublicKey) {
      this.variant = AnyPublicKeyVariant.Keyless;
    } else if (publicKey instanceof FederatedKeylessPublicKey) {
      this.variant = AnyPublicKeyVariant.FederatedKeyless;
    } else if (publicKey instanceof MultiKey) {
      this.variant = AnyPublicKeyVariant.MultiKey;
    }else {
      throw new Error("Unsupported public key type");
    }
  }

  // endregion

  // region AccountPublicKey

  /**
   * Verifies the provided signature against the given message.
   * This function helps ensure the integrity and authenticity of the message by confirming that the signature is valid.
   *
   * @param args - The arguments for signature verification.
   * @param args.message - The message that was signed.
   * @param args.signature - The signature to verify, which must be an instance of AnySignature.
   * @returns A boolean indicating whether the signature is valid for the given message.
   * @group Implementation
   * @category Serialization
   */
  verifySignature(args: VerifySignatureArgs): boolean {
    const { message, signature } = args;
    if (!AnySignature.isInstance(signature)) {
      return false;
    }

    return this.publicKey.verifySignature({
      message,
      signature: signature.signature,
    });
  }

  /**
   * Generates an authentication key from the current instance's byte representation.
   * This function is essential for creating a unique identifier for authentication purposes.
   *
   * @returns {AuthenticationKey} The generated authentication key.
   * @group Implementation
   * @category Serialization
   */
  authKey(): AuthenticationKey {
    return AuthenticationKey.fromSchemeAndBytes({
      scheme: AuthenticationKeyScheme.SingleKey,
      input: this.toUint8Array(),
    });
  }

  /**
   * Get the signature in bytes (Uint8Array).
   *
   * This function is a warning that it will soon return the underlying signature bytes directly.
   * Use AnySignature.bcsToBytes() instead.
   *
   * @returns Uint8Array representation of the signature.
   * @group Implementation
   * @category Serialization
   */
  toUint8Array() {
    return this.bcsToBytes();
  }

  // endregion

  // region Serializable

  /**
   * Serializes the current object using the provided serializer.
   * This function helps in converting the object into a format suitable for transmission or storage.
   *
   * @param serializer - The serializer instance used to perform the serialization.
   * @group Implementation
   * @category Serialization
   */
  serialize(serializer: Serializer): void {
    serializer.serializeU32AsUleb128(this.variant);
    this.publicKey.serialize(serializer);
  }

  /**
   * Deserializes an AnySignature from the provided deserializer.
   * This function helps in reconstructing the AnySignature object from its serialized form, allowing for further processing or validation.
   *
   * @param deserializer - The deserializer instance used to read the serialized data.
   * @group Implementation
   * @category Serialization
   */
  static deserialize(deserializer: Deserializer): AnyPublicKey {
    const variantIndex = deserializer.deserializeUleb128AsU32();
    let publicKey: PublicKey;
    switch (variantIndex) {
      case AnyPublicKeyVariant.Ed25519:
        publicKey = Ed25519PublicKey.deserialize(deserializer);
        break;
      case AnyPublicKeyVariant.Secp256k1:
        publicKey = Secp256k1PublicKey.deserialize(deserializer);
        break;
      case AnyPublicKeyVariant.Keyless:
        publicKey = KeylessPublicKey.deserialize(deserializer);
        break;
      case AnyPublicKeyVariant.FederatedKeyless:
        publicKey = FederatedKeylessPublicKey.deserialize(deserializer);
        break;
      case AnyPublicKeyVariant.MultiKey:
        publicKey = MultiKey.deserialize(deserializer);
        break;
      default:
        throw new Error(`Unknown variant index for AnyPublicKey: ${variantIndex}`);
    }
    return new AnyPublicKey(publicKey);
  }
  // endregion

  /**
   * Determines if the provided public key is an instance of AnyPublicKey.
   *
   * @param publicKey - The public key to check.
   * @deprecated Use `instanceof AnyPublicKey` instead.
   * @group Implementation
   * @category Serialization
   */
  static isPublicKey(publicKey: AccountPublicKey): publicKey is AnyPublicKey {
    return publicKey instanceof AnyPublicKey;
  }

  /**
   * Determines if the current public key is an instance of Ed25519PublicKey.
   *
   * @deprecated use `publicKey instanceof Ed25519PublicKey` instead.
   * @group Implementation
   * @category Serialization
   */
  isEd25519(): boolean {
    return this.publicKey instanceof Ed25519PublicKey;
  }

  /**
   * Checks if the public key is an instance of Secp256k1PublicKey.
   *
   * @deprecated use `publicKey instanceof Secp256k1PublicKey` instead.
   * @group Implementation
   * @category Serialization
   */
  isSecp256k1PublicKey(): boolean {
    return this.publicKey instanceof Secp256k1PublicKey;
  }

  /**
   * Determines if the provided publicKey is an instance of a valid PublicKey object.
   *
   * @param publicKey - The publicKey to be checked for validity.
   * @param publicKey.publicKey - The actual publicKey object that needs to be validated.
   * @returns True if the signature is a valid instance; otherwise, false.
   * @group Implementation
   * @category Serialization
   */
  static isInstance(publicKey: PublicKey): publicKey is AnyPublicKey {
    return "publicKey" in publicKey && "variant" in publicKey;
  }
}

/**
 * Represents a signature that utilizes the SingleKey authentication scheme.
 * This class is designed to encapsulate various types of signatures, which can
 * only be generated by a `SingleKeySigner` due to the shared authentication mechanism.
 *
 * @extends Signature
 * @group Implementation
 * @category Serialization
 */
export class AnySignature extends Signature {
  public readonly signature: Signature;

  /**
   * Index of the underlying enum variant
   * @group Implementation
   * @category Serialization
   */
  private readonly variant: AnySignatureVariant;

  // region Constructors

  constructor(signature: Signature) {
    super();
    this.signature = signature;

    if (signature instanceof Ed25519Signature) {
      this.variant = AnySignatureVariant.Ed25519;
    } else if (signature instanceof Secp256k1Signature) {
      this.variant = AnySignatureVariant.Secp256k1;
    } else if (signature instanceof KeylessSignature) {
      this.variant = AnySignatureVariant.Keyless;
    } else if (signature instanceof MultiKeySignature) {
      this.variant = AnySignatureVariant.MultiKey;
    } else {
      throw new Error("Unsupported signature type");
    }
  }

  // endregion

  // region AccountSignature

  toUint8Array() {
    // TODO: keep this warning around for a bit, and eventually change this to return `this.signature.toUint8Array()`.
    // eslint-disable-next-line no-console
    console.warn(
      "[Aptos SDK] Calls to AnySignature.toUint8Array() will soon return the underlying signature bytes. " +
        "Use AnySignature.bcsToBytes() instead.",
    );
    return this.bcsToBytes();
  }

  // endregion

  // region Serializable

  serialize(serializer: Serializer): void {
    serializer.serializeU32AsUleb128(this.variant);
    this.signature.serialize(serializer);
  }

  static deserialize(deserializer: Deserializer): AnySignature {
    const variantIndex = deserializer.deserializeUleb128AsU32();
    let signature: Signature;
    switch (variantIndex) {
      case AnySignatureVariant.Ed25519:
        signature = Ed25519Signature.deserialize(deserializer);
        break;
      case AnySignatureVariant.Secp256k1:
        signature = Secp256k1Signature.deserialize(deserializer);
        break;
      case AnySignatureVariant.Keyless:
        signature = KeylessSignature.deserialize(deserializer);
        break;
      case AnySignatureVariant.MultiKey:
        signature = MultiKeySignature.deserialize(deserializer);
        break;
      default:
        throw new Error(`Unknown variant index for AnySignature: ${variantIndex}`);
    }
    return new AnySignature(signature);
  }

  // endregion

  static isInstance(signature: Signature): signature is AnySignature {
    return (
      "signature" in signature &&
      typeof signature.signature === "object" &&
      signature.signature !== null &&
      "toUint8Array" in signature.signature
    );
  }
}
