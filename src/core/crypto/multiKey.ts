import { SigningScheme as AuthenticationKeyScheme } from "../../types";
import { Deserializer } from "../../bcs/deserializer";
import { Serializer } from "../../bcs/serializer";
import { AuthenticationKey } from "../authenticationKey";
import { AccountPublicKey, PublicKey, VerifySignatureArgs } from "./publicKey";
import { Signature } from "./signature";
import { AnyPublicKey, AnySignature } from "./singleKey";

/**
 * Counts the number of set bits (1s) in a byte.
 * This function can help you determine the population count of a given byte value.
 *
 * @param byte - The byte value for which to count the number of set bits.
 * @group Implementation
 * @category Serialization
 */
/* eslint-disable no-bitwise */
function bitCount(byte: number) {
  let n = byte;
  n -= (n >> 1) & 0x55555555;
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
  return (((n + (n >> 4)) & 0xf0f0f0f) * 0x1010101) >> 24;
}
/* eslint-enable no-bitwise */

/**
 * Represents a multi-key authentication scheme for accounts, allowing multiple public keys
 * to be associated with a single account. This class enforces a minimum number of valid signatures
 * required to authorize actions, ensuring enhanced security for multi-agent accounts.
 *
 * The public keys of each individual agent can be any type of public key supported by Aptos.
 * Since [AIP-55](https://github.com/aptos-foundation/AIPs/pull/263), Aptos supports
 * `Legacy` and `Unified` authentication keys.
 * @group Implementation
 * @category Serialization
 */
export class MultiKey extends AccountPublicKey {
  /**
   * List of any public keys
   * @group Implementation
   * @category Serialization
   */
  public readonly publicKeys: AnyPublicKey[];

  /**
   * The minimum number of valid signatures required, for the number of public keys specified
   * @group Implementation
   * @category Serialization
   */
  public readonly signaturesRequired: number;

  /**
   * Signature for a K-of-N multi-sig transaction.
   * This constructor initializes a multi-signature transaction with the provided signatures and bitmap.
   *
   * @param args An object containing the parameters for the multi-signature transaction.
   * @param args.signatures A list of signatures.
   * @param args.bitmap A bitmap represented as a Uint8Array or an array of numbers, where each bit indicates whether a
   * corresponding signature is present. A maximum of 32 signatures is supported, and the length of the bitmap must be 4 bytes.
   *
   * @throws Error if the number of signatures exceeds the maximum supported, if the bitmap length is incorrect, or if the number
   * of signatures does not match the bitmap.
   * @group Implementation
   * @category Serialization
   */
  // region Constructors
  constructor(args: { publicKeys: Array<PublicKey>; signaturesRequired: number }) {
    super();
    const { publicKeys, signaturesRequired } = args;

    // Validate number of public keys is greater than signature required
    if (signaturesRequired < 1) {
      throw new Error("The number of required signatures needs to be greater than 0");
    }

    // Validate number of public keys is greater than signature required
    if (publicKeys.length < signaturesRequired) {
      throw new Error(
        `Provided ${publicKeys.length} public keys is smaller than the ${signaturesRequired} required signatures`,
      );
    }

    // Make sure that all keys are normalized to the SingleKey authentication scheme
    this.publicKeys = publicKeys.map((publicKey) =>
      publicKey instanceof AnyPublicKey ? publicKey : new AnyPublicKey(publicKey),
    );

    this.signaturesRequired = signaturesRequired;
  }

  // endregion

  // region AccountPublicKey

  /**
   * Verifies the provided signature against the given message.
   * This function helps ensure the integrity and authenticity of the message by checking if the signature is valid.
   *
   * @param args - The arguments for verifying the signature.
   * @param args.message - The message that was signed.
   * @param args.signature - The signature to verify.
   * @group Implementation
   * @category Serialization
   */
  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  verifySignature(args: VerifySignatureArgs): boolean {
    throw new Error("not implemented");
  }

  /**
   * Generates an authentication key based on the current instance's byte representation.
   * This key can be used for secure authentication processes within the system.
   *
   * @returns {AuthenticationKey} The generated authentication key.
   * @group Implementation
   * @category Serialization
   */
  authKey(): AuthenticationKey {
    return AuthenticationKey.fromSchemeAndBytes({
      scheme: AuthenticationKeyScheme.MultiKey,
      input: this.toUint8Array(),
    });
  }

  // endregion

  // region Serializable

  /**
   * Serializes the object by writing its signatures and bitmap to the provided serializer.
   * This allows the object to be converted into a format suitable for transmission or storage.
   *
   * @param serializer - The serializer instance used to perform the serialization.
   * @group Implementation
   * @category Serialization
   */
  serialize(serializer: Serializer): void {
    serializer.serializeVector(this.publicKeys);
    serializer.serializeU8(this.signaturesRequired);
  }

  /**
   * Deserializes a MultiKeySignature from the provided deserializer.
   * This function retrieves the signatures and bitmap necessary for creating a MultiKeySignature object.
   *
   * @param deserializer - The deserializer instance used to read the serialized data.
   * @group Implementation
   * @category Serialization
   */
  static deserialize(deserializer: Deserializer): MultiKey {
    const keys = deserializer.deserializeVector(AnyPublicKey);
    const signaturesRequired = deserializer.deserializeU8();

    return new MultiKey({ publicKeys: keys, signaturesRequired });
  }

  // endregion

  /**
   * Create a bitmap that holds the mapping from the original public keys
   * to the signatures passed in
   *
   * @param args.bits array of the index mapping to the matching public keys
   * @returns Uint8array bit map
   * @group Implementation
   * @category Serialization
   */
  createBitmap(args: { bits: number[] }): Uint8Array {
    const { bits } = args;
    // Bits are read from left to right. e.g. 0b10000000 represents the first bit is set in one byte.
    // The decimal value of 0b10000000 is 128.
    const firstBitInByte = 128;
    const bitmap: number[] = [];

    // Check if duplicates exist in bits
    const dupCheckSet = new Set();

    bits.forEach((bit: number, idx: number) => {
      if (idx + 1 > this.publicKeys.length) {
        throw new Error(`Signature index ${idx + 1} is out of public keys range, ${this.publicKeys.length}.`);
      }

      if (dupCheckSet.has(bit)) {
        throw new Error(`Duplicate bit ${bit} detected.`);
      }

      dupCheckSet.add(bit);

      const byteOffset = Math.floor(bit / 8);

      // Extend by required number of bytes
      if (bitmap.length < byteOffset) {
        for (let i = bitmap.length; i < byteOffset; i += 1) {
          bitmap.push(0);
        }
      }

      let byte = bitmap[byteOffset];

      // eslint-disable-next-line no-bitwise
      byte |= firstBitInByte >> bit % 8;

      bitmap[byteOffset] = byte;
    });

    return new Uint8Array(bitmap);
  }

  /**
   * Get the index of the provided public key.
   *
   * This function retrieves the index of a specified public key within the MultiKey.
   * If the public key does not exist, it throws an error.
   *
   * @param publicKey - The public key to find the index for.
   * @returns The corresponding index of the public key, if it exists.
   * @throws Error - If the public key is not found in the MultiKey.
   * @group Implementation
   * @category Serialization
   */
  getIndex(publicKey: PublicKey): number {
    const anyPublicKey = publicKey instanceof AnyPublicKey ? publicKey : new AnyPublicKey(publicKey);
    const index = this.publicKeys.findIndex((pk) => pk.toString() === anyPublicKey.toString());

    if (index !== -1) {
      return index;
    }
    throw new Error(`Public key ${publicKey} not found in MultiKey ${this.publicKeys}`);
  }

  public static isInstance(value: PublicKey): value is MultiKey {
    return "publicKeys" in value && "signaturesRequired" in value;
  }
}

/**
 * Represents a multi-signature transaction using Ed25519 signatures.
 * This class allows for the creation and management of a K-of-N multi-signature scheme,
 * where a specified number of signatures are required to authorize a transaction.
 *
 * It includes functionality to validate the number of signatures against a bitmap,
 * which indicates which public keys have signed the transaction.
 * @group Implementation
 * @category Serialization
 */
export class MultiKeySignature extends Signature {
  /**
   * Number of bytes in the bitmap representing who signed the transaction (32-bits)
   * @group Implementation
   * @category Serialization
   */
  static BITMAP_LEN: number = 4;

  /**
   * Maximum number of Ed25519 signatures supported
   * @group Implementation
   * @category Serialization
   */
  static MAX_SIGNATURES_SUPPORTED = MultiKeySignature.BITMAP_LEN * 8;

  /**
   * The list of underlying Ed25519 signatures
   * @group Implementation
   * @category Serialization
   */
  public readonly signatures: AnySignature[];

  /**
   * 32-bit Bitmap representing who signed the transaction
   *
   * This is represented where each public key can be masked to determine whether the message was signed by that key.
   * @group Implementation
   * @category Serialization
   */
  public readonly bitmap: Uint8Array;

  /**
   * Signature for a K-of-N multi-sig transaction.
   *
   * @see {@link
   * https://aptos.dev/integration/creating-a-signed-transaction/#multisignature-transactions | Creating a Signed Transaction}
   *
   * @param args.signatures A list of signatures
   * @param args.bitmap 4 bytes, at most 32 signatures are supported. If Nth bit value is `1`, the Nth
   * signature should be provided in `signatures`. Bits are read from left to right
   * @group Implementation
   * @category Serialization
   */
  constructor(args: { signatures: Array<Signature | AnySignature>; bitmap: Uint8Array | number[] }) {
    super();
    const { signatures, bitmap } = args;

    if (signatures.length > MultiKeySignature.MAX_SIGNATURES_SUPPORTED) {
      throw new Error(`The number of signatures cannot be greater than ${MultiKeySignature.MAX_SIGNATURES_SUPPORTED}`);
    }

    // Make sure that all signatures are normalized to the SingleKey authentication scheme
    this.signatures = signatures.map((signature) =>
      signature instanceof AnySignature ? signature : new AnySignature(signature),
    );

    if (!(bitmap instanceof Uint8Array)) {
      this.bitmap = MultiKeySignature.createBitmap({ bits: bitmap });
    } else {
      this.bitmap = bitmap;
    }

    const nSignatures = this.bitmap.reduce((acc, byte) => acc + bitCount(byte), 0);
    if (nSignatures !== this.signatures.length) {
      throw new Error(`Expecting ${nSignatures} signatures from the bitmap, but got ${this.signatures.length}`);
    }
  }

  /**
   * Helper method to create a bitmap out of the specified bit positions
   * @param args.bits The bitmap positions that should be set. A position starts at index 0.
   * Valid position should range between 0 and 31.
   * @example
   * Here's an example of valid `bits`
   * ```
   * [0, 2, 31]
   * ```
   * `[0, 2, 31]` means the 1st, 3rd and 32nd bits should be set in the bitmap.
   * The result bitmap should be 0b1010000000000000000000000000001
   *
   * @returns bitmap that is 32bit long
   * @group Implementation
   * @category Serialization
   */
  static createBitmap(args: { bits: number[] }): Uint8Array {
    const { bits } = args;
    // Bits are read from left to right. e.g. 0b10000000 represents the first bit is set in one byte.
    // The decimal value of 0b10000000 is 128.
    const firstBitInByte = 128;
    const bitmap = new Uint8Array([0, 0, 0, 0]);

    // Check if duplicates exist in bits
    const dupCheckSet = new Set();

    bits.forEach((bit: number) => {
      if (bit >= MultiKeySignature.MAX_SIGNATURES_SUPPORTED) {
        throw new Error(`Cannot have a signature larger than ${MultiKeySignature.MAX_SIGNATURES_SUPPORTED - 1}.`);
      }

      if (dupCheckSet.has(bit)) {
        throw new Error("Duplicate bits detected.");
      }

      dupCheckSet.add(bit);

      const byteOffset = Math.floor(bit / 8);

      let byte = bitmap[byteOffset];

      // eslint-disable-next-line no-bitwise
      byte |= firstBitInByte >> bit % 8;

      bitmap[byteOffset] = byte;
    });

    return bitmap;
  }

  // region Serializable

  serialize(serializer: Serializer): void {
    // Note: we should not need to serialize the vector length, as it can be derived from the bitmap
    serializer.serializeVector(this.signatures);
    serializer.serializeBytes(this.bitmap);
  }

  static deserialize(deserializer: Deserializer): MultiKeySignature {
    const signatures = deserializer.deserializeVector(AnySignature);
    const bitmap = deserializer.deserializeBytes();
    return new MultiKeySignature({ signatures, bitmap });
  }

  // endregion
}
