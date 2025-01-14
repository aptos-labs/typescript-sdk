// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { decode } from "js-base64";
import { HexInput, MoveStructId } from "../types";

/**
 * Sleep for the specified amount of time in milliseconds.
 * This function can be used to introduce delays in asynchronous operations.
 *
 * @param timeMs - The time in milliseconds to sleep.
 * @group Implementation
 * @category Utils
 */
export async function sleep(timeMs: number): Promise<null> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeMs);
  });
}

/**
 * Get the error message from an unknown error.
 *
 * @param error The error to get the message from
 * @returns The error message
 * @group Implementation
 * @category Utils
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * @group Implementation
 * @category Utils
 */
export const nowInSeconds = () => Math.floor(Date.now() / 1000);

/**
 * Floors the given timestamp to the nearest whole hour.
 * This function is useful for normalizing timestamps to hourly intervals.
 *
 * @param timestampInSeconds - The timestamp in seconds to be floored.
 * @group Implementation
 * @category Utils
 */
export function floorToWholeHour(timestampInSeconds: number): number {
  const date = new Date(timestampInSeconds * 1000);
  // Reset minutes and seconds to zero
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return Math.floor(date.getTime() / 1000);
}

/**
 * Decodes a base64 URL-encoded string into its original form.
 * This function is useful for converting base64 URL-encoded data back to a readable format.
 *
 * @param base64Url - The base64 URL-encoded string to decode.
 * @returns The decoded string.
 * @group Implementation
 * @category Utils
 */
export function base64UrlDecode(base64Url: string): string {
  // Replace base64url-specific characters
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  // Pad the string with '=' characters if needed
  const paddedBase64 = base64 + "==".substring(0, (3 - (base64.length % 3)) % 3);
  const decodedString = decode(paddedBase64);
  return decodedString;
}

/**
 * Amount is represented in the smallest unit format on chain, this function converts
 * a human-readable amount format to the smallest unit format
 * @example
 * human-readable amount format: 500
 * on chain amount format when decimal is 8: 50000000000
 *
 * @param value The value in human-readable format
 * @param decimal The token decimal
 * @returns The value in the smallest units
 * @group Implementation
 * @category Utils
 */
export const convertAmountFromHumanReadableToOnChain = (value: number, decimal: number) => value * 10 ** decimal;

/**
 * Amount is represented in the smallest unit format on chain, this function converts
 * the smallest unit format to a human-readable amount format
 * @example
 * human-readable amount format: 500
 * on chain amount format when decimal is 8: 50000000000
 *
 * @param value The value in human-readable format
 * @param decimal The token decimal
 * @returns The value in the smallest units
 * @group Implementation
 * @category Utils
 */
export const convertAmountFromOnChainToHumanReadable = (value: number, decimal: number) => value / 10 ** decimal;

/**
 * Convert a hex string to an ascii string with the `0x` prefix.
 *
 * `0x6170746f735f636f696e` --> `aptos_coin`
 *
 * @param hex The hex string to convert (e.g. `0x6170746f735f636f696e`)
 * @returns The ascii string
 * @group Implementation
 * @category Utils
 */
const hexToAscii = (hex: string) => {
  let str = "";
  for (let n = 2; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substring(n, n + 2), 16));
  }
  return str;
};

/**
 * Convert an encoded struct to a MoveStructId.
 *
 * @example
 * const structObj = {
 *   account_address: "0x1",
 *   module_name: "0x6170746f735f636f696e",
 *   struct_name: "0x4170746f73436f696e",
 * };
 * // structId is "0x1::aptos_coin::AptosCoin"
 * const structId = parseEncodedStruct(structObj);
 *
 * @param structObj The struct with account_address, module_name, and struct_name properties
 * @returns The MoveStructId
 * @group Implementation
 * @category Utils
 */
export const parseEncodedStruct = (structObj: {
  account_address: string;
  module_name: string;
  struct_name: string;
}): MoveStructId => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { account_address, module_name, struct_name } = structObj;
  const moduleName = hexToAscii(module_name);
  const structName = hexToAscii(struct_name);
  return `${account_address}::${moduleName}::${structName}`;
};

/**
 * Determines whether the given object is an encoded struct type with the following properties:
 * - account_address: string
 * - module_name: string
 * - struct_name: string
 *
 * @param structObj The object to check
 * @returns Whether the object is an encoded struct type
 * @group Implementation
 * @category Utils
 */
export const isEncodedStruct = (
  structObj: any,
): structObj is {
  account_address: string;
  module_name: string;
  struct_name: string;
} =>
  typeof structObj === "object" &&
  !Array.isArray(structObj) &&
  structObj !== null &&
  "account_address" in structObj &&
  "module_name" in structObj &&
  "struct_name" in structObj &&
  typeof structObj.account_address === "string" &&
  typeof structObj.module_name === "string" &&
  typeof structObj.struct_name === "string";

/**
 * Type guard to check if a value is of type HexInput
 * @param value The value to check
 */
export function isHexInput(value: unknown): value is HexInput {
  return value instanceof Uint8Array || typeof value === "string";
}
