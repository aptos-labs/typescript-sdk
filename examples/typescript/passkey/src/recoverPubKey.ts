import EC from "elliptic";
const ec = new EC.ec("secp256r1");

export async function sha256(message: Uint8Array) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", message);
  return new Uint8Array(hashBuffer);
}

export function concatenateUint8Arrays(array1: Uint8Array, array2: Uint8Array) {
  const result = new Uint8Array(array1.length + array2.length);
  result.set(array1, 0);
  result.set(array2, array1.length);

  return result;
}

export async function recoverPublicKey(
  authenticatorData: Uint8Array,
  clientDataJSON: Uint8Array,
  signature: Uint8Array,
) {
  const shaClientDataJSON = await sha256(clientDataJSON);
  const message = concatenateUint8Arrays(authenticatorData, shaClientDataJSON);

  const result = await recoverPublicKeyFromMessageAndSignature(message, signature);
  return result;
}

export async function recoverPublicKeyFromMessageAndSignature(message: Uint8Array, signature: Uint8Array) {
  // Hash the message
  const msgHash = await sha256(message);

  // Assume signature is an object with r and s components
  // In real scenarios, ensure to parse the signature from its encoded form
  let publicKey;
  for (let recoveryId = 0; recoveryId < 2; recoveryId++) {
    try {
      publicKey = ec.recoverPubKey(msgHash, signature, recoveryId);
      // If recovery was successful and publicKey is valid, break out of the loop
      if (publicKey) break;
    } catch (error) {
      // If this recoveryId does not work, catch the error and try the next one
      console.error("Recovery with ID", recoveryId, "failed:", error);
    }
  }

  if (!publicKey) {
    throw new Error("Failed to recover public key");
  }

  // Convert the public key to its byte representation
  const publicKeyBytes = publicKey.encode("array", false);
  console.log(publicKeyBytes);
  return publicKeyBytes;
}

// Example usage (pseudo-code, depends on actual signature format and input)
// const message = 'Your message here';
// const signature = { r: 'signatureRValue', s: 'signatureSValue' };
// try {
//   const publicKeyBytes = recoverPublicKeyFromSignatureWithoutRecoveryId(message, signature);
//   console.log(publicKeyBytes);
// } catch (error) {
//   console.error(error);
// }
