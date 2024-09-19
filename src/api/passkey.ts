/* eslint-disable class-methods-use-this */
// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import type { PublicKeyCredentialCreationOptionsJSON, RegistrationResponseJSON } from "@simplewebauthn/server/esm/deps";
import { AccountAddress, PublicKey } from "../core";
import {
  generateRegistrationOptions,
  getPasskeyAccountAddress,
  parsePublicKey,
  registerCredential,
  signAndSubmitWithPasskey,
  signWithPasskey,
} from "../internal/passkey";
import { AccountAuthenticator, AnyRawTransaction } from "../transactions";
import { HexInput, PendingTransactionResponse } from "../types";
import { AllowCredentialOption } from "../types/passkey";
import { AptosConfig } from "./aptosConfig";

/**
 * A class for all `Passkeys` related operations on Aptos on the browser.
 */
export class Passkey {
  readonly config: AptosConfig;

  constructor(config: AptosConfig) {
    this.config = config;
  }

  /**
   * Given a credentialId and a transaction, it prompts the client to sign the transaction then submits it.
   *
   * @param args.credentialId The credential ID of the passkey
   * @param args.publicKey The public key associated with the passkey
   * @param args.transaction The transaction to sign
   * @param args.rpID The relying party ID
   * @param args.timeout The timeout for the operation
   * @param args.options The options for the operation
   * @returns The pending transaction response
   */
  async signAndSubmitWithPasskey(args: {
    credentialId: string | Uint8Array;
    publicKey: PublicKey;
    transaction: AnyRawTransaction;
    rpID: string;
    timeout?: number;
    options?: {
      allowCredentials?: AllowCredentialOption[];
    };
  }): Promise<PendingTransactionResponse> {
    return signAndSubmitWithPasskey({ aptosConfig: this.config, ...args });
  }

  /**
   * Given a credentialId and a transaction, it prompts the client to sign the transaction.
   *
   * @param args.credentialId The credential ID of the passkey
   * @param args.publicKey The public key associated with the passkey
   * @param args.transaction The transaction to sign
   * @param args.rpID The relying party ID
   * @param args.timeout The timeout for the operation
   * @param args.options The options for the operation
   * @returns The account authenticator
   */

  async signWithPasskey(args: {
    credentialId: string | Uint8Array;
    publicKey: PublicKey;
    transaction: AnyRawTransaction;
    rpID: string;
    timeout?: number;
    options?: {
      allowCredentials?: AllowCredentialOption[];
    };
  }): Promise<AccountAuthenticator> {
    return signWithPasskey({ ...args });
  }

  /**
   * Given a public key, it returns the account address associated with the passkey.
   * @param args.publicKey The public key associated with the passkey
   * @returns The account address
   */

  async getPasskeyAccountAddress(args: { publicKey: HexInput }): Promise<AccountAddress> {
    return getPasskeyAccountAddress(args);
  }

  /**
   * Generates registration options for a passkey.
   * @param args.rpName The relying party name
   * @param args.rpID The relying party ID
   * @param args.userName The user name
   * @param args.userID The user ID
   * @param args.challenge The challenge
   * @param args.userDisplayName The user display name
   * @param args.timeout The timeout for the operation
   * @param args.attestationType The attestation type
   * @param args.authenticatorAttachment The authenticator attachment
   * @returns The registration options
   */

  async generateRegistrationOptions(args: {
    rpName: string;
    rpID: string;
    userName: string;
    userID?: Uint8Array;
    challenge?: string | Uint8Array;
    userDisplayName?: string;
    timeout?: number;
    attestationType?: AttestationConveyancePreference;
    authenticatorAttachment?: AuthenticatorAttachment;
  }): Promise<PublicKeyCredentialCreationOptionsJSON> {
    return generateRegistrationOptions(args);
  }

  /**
   * Registers a credential for a passkey.
   * @param creationOptionsJSON
   * @returns The registration response
   */

  async registerCredential(
    creationOptionsJSON: PublicKeyCredentialCreationOptionsJSON,
  ): Promise<RegistrationResponseJSON> {
    return registerCredential(creationOptionsJSON);
  }

  /**
   * Parses the public key from a registration response.
   * @param response The registration response
   * @returns The public key
   */

  parsePublicKey(response: RegistrationResponseJSON): PublicKey {
    return parsePublicKey(response);
  }
}
