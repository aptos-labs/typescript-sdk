import { HexInput } from "../../types";
import { Hex } from "../hex";

/**
 * Helper function to convert a message to sign or to verify to a valid message input
 *
 * @param message a message as a string or Uint8Array
 *
 * @returns a valid HexInput - string or Uint8Array
 * @group Implementation
 * @category Serialization
 */
export const convertSigningMessage = (message: HexInput): HexInput => {
  // if message is of type string, verify it is a valid Hex string
  if (typeof message === "string") {
    const isValid = Hex.isValid(message);
    // If message is not a valid Hex string, convert it
    if (!isValid.valid) {
      return new TextEncoder().encode(message);
    }
    // If message is a valid Hex string, return it
    return message;
  }
  // message is a Uint8Array
  return message;
};

function b64DecodeUnicode(str: string) {
  return decodeURIComponent(
    atob(str).replace(/(.)/g, (m, p) => {
      let code = (p as string).charCodeAt(0).toString(16).toUpperCase();
      if (code.length < 2) {
        code = `0${code}`;
      }
      return `%${code}`;
    }),
  );
}

function base64UrlDecode(str: string) {
  let output = str.replace(/-/g, "+").replace(/_/g, "/");
  switch (output.length % 4) {
    case 0:
      break;
    case 2:
      output += "==";
      break;
    case 3:
      output += "=";
      break;
    default:
      throw new Error("base64 string is not of the correct length");
  }

  try {
    return b64DecodeUnicode(output);
  } catch (err) {
    return atob(output);
  }
}

export function getClaimWithoutUnescaping(jwt: string, claim: string): string {
  const parts = jwt.split(".");
  const payload = parts[1];
  const payloadStr = base64UrlDecode(payload);
  const claimIdx = payloadStr.indexOf(`"${claim}"`) + claim.length + 2;
  let claimVal = "";
  let foundStart = false;
  for (let i = claimIdx; i < payloadStr.length; i += 1) {
    if (payloadStr[i] === '"') {
      if (foundStart) {
        break;
      }
      foundStart = true;
      // eslint-disable-next-line no-continue
      continue;
    }
    if (foundStart) {
      claimVal += payloadStr[i];
    }
  }
  return claimVal;
}
