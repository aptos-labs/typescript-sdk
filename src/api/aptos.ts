// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import { Account } from "./account";
import { AptosConfig } from "./aptosConfig";
import { Coin } from "./coin";
import { DigitalAsset } from "./digitalAsset";
import { Event } from "./event";
import { Faucet } from "./faucet";
import { FungibleAsset } from "./fungibleAsset";
import { General } from "./general";
import { ANS } from "./ans";
import { Staking } from "./staking";
import { Transaction } from "./transaction";
import { Table } from "./table";
import { Keyless } from "./keyless";
import { AptosObject } from "./object";
import { AccountAbstraction } from "./account/abstraction";

/**
 * The main entry point for interacting with the Aptos APIs,
 * providing access to various functionalities organized into
 * distinct namespaces.
 *
 * To utilize the SDK, instantiate a new Aptos object to gain
 * access to the complete range of SDK features.
 *
 * @example
 * ```typescript
 * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
 *
 * async function runExample() {
 *     // Create a configuration for connecting to the Aptos testnet
 *     const config = new AptosConfig({ network: Network.TESTNET });
 *
 *     // Initialize the Aptos client with the configuration
 *     const aptos = new Aptos(config);
 *
 *     console.log("Aptos client initialized:", aptos);
 * }
 * runExample().catch(console.error);
 * ```
 * @group Client
 */
export class Aptos {
  readonly config: AptosConfig;

  readonly account: Account;

  readonly ans: ANS;

  readonly coin: Coin;

  readonly digitalAsset: DigitalAsset;

  readonly event: Event;

  readonly faucet: Faucet;

  readonly fungibleAsset: FungibleAsset;

  readonly general: General;

  readonly staking: Staking;

  readonly transaction: Transaction;

  readonly table: Table;

  readonly keyless: Keyless;

  readonly object: AptosObject;

  /**
   * Initializes a new instance of the Aptos client with the provided configuration settings.
   * This allows you to interact with various Aptos functionalities such as accounts, transactions, and events.
   *
   * @param settings - Configuration settings for the Aptos client.
   *
   * @example
   * ```typescript
   * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
   *
   * async function runExample() {
   *     // Create a new Aptos client with default settings
   *     const config = new AptosConfig({ network: Network.TESTNET }); // Specify your own settings if needed
   *     const aptos = new Aptos(config);
   *
   *     console.log("Aptos client initialized:", aptos);
   * }
   * runExample().catch(console.error);
   * ```
   * @group Client
   */
  constructor(settings?: AptosConfig) {
    this.config = new AptosConfig(settings);
    this.account = new Account(this.config);
    this.ans = new ANS(this.config);
    this.coin = new Coin(this.config);
    this.digitalAsset = new DigitalAsset(this.config);
    this.event = new Event(this.config);
    this.faucet = new Faucet(this.config);
    this.fungibleAsset = new FungibleAsset(this.config);
    this.general = new General(this.config);
    this.staking = new Staking(this.config);
    this.transaction = new Transaction(this.config);
    this.table = new Table(this.config);
    this.keyless = new Keyless(this.config);
    this.object = new AptosObject(this.config);
  }
}

// extends Aptos interface so all the methods and properties
// from the other classes will be recognized by typescript.
export interface Aptos
  extends Account,
    ANS,
    Coin,
    DigitalAsset,
    Event,
    Faucet,
    FungibleAsset,
    General,
    Keyless,
    Staking,
    Table,
    AptosObject,
    Omit<Transaction, "build" | "simulate" | "submit" | "batch"> {}

/**
In TypeScript, we can’t inherit or extend from more than one class,
Mixins helps us to get around that by creating a partial classes
that we can combine to form a single class that contains all the methods and properties from the partial classes.
{@link https://www.typescriptlang.org/docs/handbook/mixins.html#alternative-pattern}

Here, we combine any subclass and the Aptos class.
 * @group Client
*/
function applyMixin(targetClass: any, baseClass: any, baseClassProp: string) {
  // Mixin instance methods
  Object.getOwnPropertyNames(baseClass.prototype).forEach((propertyName) => {
    const propertyDescriptor = Object.getOwnPropertyDescriptor(baseClass.prototype, propertyName);
    if (!propertyDescriptor) return;
    // eslint-disable-next-line func-names
    propertyDescriptor.value = function (...args: any) {
      return (this as any)[baseClassProp][propertyName](...args);
    };
    Object.defineProperty(targetClass.prototype, propertyName, propertyDescriptor);
  });
}

applyMixin(Aptos, Account, "account");
applyMixin(Aptos, ANS, "ans");
applyMixin(Aptos, Coin, "coin");
applyMixin(Aptos, DigitalAsset, "digitalAsset");
applyMixin(Aptos, Event, "event");
applyMixin(Aptos, Faucet, "faucet");
applyMixin(Aptos, FungibleAsset, "fungibleAsset");
applyMixin(Aptos, General, "general");
applyMixin(Aptos, Staking, "staking");
applyMixin(Aptos, Transaction, "transaction");
applyMixin(Aptos, Table, "table");
applyMixin(Aptos, Keyless, "keyless");
applyMixin(Aptos, AptosObject, "object");
