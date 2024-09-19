// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable max-len */

import { ClientRequest, ClientResponse } from "../../src";

export const FUND_AMOUNT = 100_000_000;
export const TRANSFER_AMOUNT = 500_000;

export const wallet = {
  address: "0x07968dab936c1bad187c60ce4082f307d030d780e91e694ae03aef16aba73f30",
  mnemonic: "shoot island position soft burden budget tooth cruel issue economy destroy above",
  path: "m/44'/637'/0'/0'/0'",
  privateKey: "0x5d996aa76b3212142792d9130796cd2e11e3c445a93118c08414df4f66bc60ec",
  publicKey: "0xea526ba1710343d953461ff68641f1b7df5f23b9042ffa2d2a798d3adb3f3d6c",
};

export const Ed25519WalletTestObject = {
  address: "0x28b829b524d7c24aa7fd8916573c814df766dae542f724e1cf8914536232c346",
  mnemonic: "shoot island position soft burden budget tooth cruel issue economy destroy above",
  path: "m/44'/637'/0'/0'/0'",
  privateKey: "0x5d996aa76b3212142792d9130796cd2e11e3c445a93118c08414df4f66bc60ec",
  publicKey: "0xea526ba1710343d953461ff68641f1b7df5f23b9042ffa2d2a798d3adb3f3d6c",
};

export const secp256k1WalletTestObject = {
  address: "0x4b4aa8759fcef40ba49e999409eb73a98252f44f6612a4de2b23bad5c37b15a6",
  mnemonic: "shoot island position soft burden budget tooth cruel issue economy destroy above",
  path: "m/44'/637'/0'/0/0",
  privateKey: "0x1eec55afc2f72c4ab7b46c84d761739035ac420a2b6b22cef3411adaf91ce1f7",
  publicKey:
    "0x04913871f1d6cb7b867e8671cf63cf7b4c43819539fa0074ff933434bf20bab825b335535251f720fff72fd8b567e414af84aacf2f26ec804562081f2e0b0c9478",
};

export const secp256r1WalletTestObject = {
  address: "0x071ce203b24472a3f1fffbc864671aa22694e1bb97a515392c3dcbc88b8142ae",
  mnemonic: "shoot island position soft burden budget tooth cruel issue economy destroy above",
  path: "m/44'/637'/0'/0/0",
  privateKey: "0x1eec55afc2f72c4ab7b46c84d761739035ac420a2b6b22cef3411adaf91ce1f7",
  publicKey:
    "0x04a321d7d3d68e87055b021799dd5916ccf102f81e714ed0bc98d8f001fa40e519f75aebd1d397d6963d8d6f920c79f41506adf1e91b745fd2b845c71fe0d297de",
};

export const zeroWallet = {
  address: "0x00fe71257b6b4caca517ef4c9979ada97aa2e2688e950654a40ff82e98f68163",
  mnemonic: "shoot island position soft burden budget tooth cruel issue economy destroy above",
  path: "m/44'/637'/0'/0'/44'",
  privateKey: "0xeb70332d79a384f57052b34282748be65a57548513b3b99ee1bd858244b36d28",
  publicKey: "0xeb70332d79a384f57052b34282748be65a57548513b3b99ee1bd858244b36d28",
};

export const ed25519 = {
  privateKey: "0xc5338cd251c22daa8c9c9cc94f498cc8a5c7e1d2e75287a5dda91096fe64efa5",
  publicKey: "0xde19e5d1880cac87d57484ce9ed2e84cf0f9599f12e7cc3a52e4e7657a763f2c",
  authKey: "0x978c213990c4833df71548df7ce49d54c759d6b6d932de22b24d56060b7af2aa",
  address: "0x978c213990c4833df71548df7ce49d54c759d6b6d932de22b24d56060b7af2aa",
  messageEncoded: "68656c6c6f20776f726c64",
  stringMessage: "hello world",
  signatureHex:
    "0x9e653d56a09247570bb174a389e85b9226abd5c403ea6c504b386626a145158cd4efd66fc5e071c0e19538a96a05ddbda24d3c51e1e6a9dacc6bb1ce775cce07",
};

export const multiEd25519PkTestObject = {
  public_keys: [
    "b9c6ee1630ef3e711144a648db06bbb2284f7274cfbee53ffcee503cc1a49200",
    "aef3f4a4b8eca1dfc343361bf8e436bd42de9259c04b8314eb8e2054dd6e82ab",
    "8a5762e21ac1cdb3870442c77b4c3af58c7cedb8779d0270e6d4f1e2f7367d74",
  ],
  threshold: 2,
  bytesInStringWithoutPrefix:
    "b9c6ee1630ef3e711144a648db06bbb2284f7274cfbee53ffcee503cc1a49200aef3f4a4b8eca1dfc343361bf8e436bd42de9259c04b8314eb8e2054dd6e82ab8a5762e21ac1cdb3870442c77b4c3af58c7cedb8779d0270e6d4f1e2f7367d7402",
};

export const multiEd25519SigTestObject = {
  signatures: [
    "e6f3ba05469b2388492397840183945d4291f0dd3989150de3248e06b4cefe0ddf6180a80a0f04c045ee8f362870cb46918478cd9b56c66076f94f3efd5a8805",
    "2ae0818b7e51b853f1e43dc4c89a1f5fabc9cb256030a908f9872f3eaeb048fb1e2b4ffd5a9d5d1caedd0c8b7d6155ed8071e913536fa5c5a64327b6f2d9a102",
  ],
  bitmap: "c0000000",
  bytesInStringWithoutPrefix:
    "e6f3ba05469b2388492397840183945d4291f0dd3989150de3248e06b4cefe0ddf6180a80a0f04c045ee8f362870cb46918478cd9b56c66076f94f3efd5a88052ae0818b7e51b853f1e43dc4c89a1f5fabc9cb256030a908f9872f3eaeb048fb1e2b4ffd5a9d5d1caedd0c8b7d6155ed8071e913536fa5c5a64327b6f2d9a102c0000000",
};

export const secp256k1TestObject = {
  privateKey: "0xd107155adf816a0a94c6db3c9489c13ad8a1eda7ada2e558ba3bfa47c020347e",
  publicKey:
    "0x04acdd16651b839c24665b7e2033b55225f384554949fef46c397b5275f37f6ee95554d70fb5d9f93c5831ebf695c7206e7477ce708f03ae9bb2862dc6c9e033ea",
  address: "0x5792c985bc96f436270bd2a3c692210b09c7febb8889345ceefdbae4bacfe498",
  authKey: "0x5792c985bc96f436270bd2a3c692210b09c7febb8889345ceefdbae4bacfe498",
  messageEncoded: "68656c6c6f20776f726c64",
  stringMessage: "hello world",
  signatureHex:
    "0xd0d634e843b61339473b028105930ace022980708b2855954b977da09df84a770c0b68c29c8ca1b5409a5085b0ec263be80e433c83fcf6debb82f3447e71edca",
};

export const secp256r1TestObject = {
  privateKey: "0xd107155adf816a0a94c6db3c9489c13ad8a1eda7ada2e558ba3bfa47c020347e",
  publicKey:
    "0x04c81c1005cbaff7cdbabee843b1dcd2cabd21e0b728792c73cdaf92bb37bca7d52e9526bb15a32dd8f542bb62b050532884366369f7acfe7d10d8c3840778de8c",
  address: "0xbf4cbeb52e99e75bff8908b2c412ae453a2bbaee808f152674193b7866cd1645",
  authKey: "0xbf4cbeb52e99e75bff8908b2c412ae453a2bbaee808f152674193b7866cd1645",
  messageEncoded: "68656c6c6f20776f726c64",
  stringMessage: "hello world",
  signatureHex:
    "0x67a8c6539315eea3953c04165d2448f2de9bbb800bf5672af8098b73026292966ea226dfe4591b89da58999ef5e7f659a7d5bbee8aedbabe550e3b7034ddc51b",
};

export const singleSignerED25519 = {
  publicKey: "0xe425451a5dc888ac871976c3c724dec6118910e7d11d344b4b07a22cd94e8c2e",
  privateKey: "0xf508cbef4e0fe463204aab724a90791c9a9dbe60a53b4978bbddbc712b55f2fd",
  address: "0x5bdf77d5bf826c8c04273d4e7323f7bc4a85ee7ee34b37bd7458b7aed3639dd3",
  authKey: "0x5bdf77d5bf826c8c04273d4e7323f7bc4a85ee7ee34b37bd7458b7aed3639dd3",
  messageEncoded: "68656c6c6f20776f726c64", // "hello world"
  signatureHex:
    "0xc6f50f4e0cb1961f6f7b28be1a1d80e3ece240dfbb7bd8a8b03cc26bfd144fc176295d7c322c5bf3d9669d2ad49d8bdbfe77254b4a6393d8c49da04b40cee600",
};

export const multiKeyTestObject = {
  publicKeys: [
    // secp256k1
    "0x049a6f7caddff8064a7dd5800e4fb512bf1ff91daee965409385dfa040e3e63008ab7ef566f4377c2de5aeb2948208a01bcee2050c1c8578ce5fa6e0c3c507cca2",
    // ed25519
    "0x7a73df1afd028e75e7f9e23b2187a37d092a6ccebcb3edff6e02f93185cbde86",
    // ed25519
    "0x17fe89a825969c1c0e5f5e80b95f563a6cb6240f88c4246c19cb39c9535a1486",
  ],
  signaturesRequired: 2,
  address: "0x738a998ac1f69db4a91fc5a0152f792c98ad87354c65a2a842a118d7a17109b1",
  authKey: "0x738a998ac1f69db4a91fc5a0152f792c98ad87354c65a2a842a118d7a17109b1",
  bitmap: [160, 0, 0, 0],
  stringBytes:
    "0x030141049a6f7caddff8064a7dd5800e4fb512bf1ff91daee965409385dfa040e3e63008ab7ef566f4377c2de5aeb2948208a01bcee2050c1c8578ce5fa6e0c3c507cca200207a73df1afd028e75e7f9e23b2187a37d092a6ccebcb3edff6e02f93185cbde86002017fe89a825969c1c0e5f5e80b95f563a6cb6240f88c4246c19cb39c9535a148602",
};

export const longTestTimeout = 120 * 1000;

export async function customClient<Req, Res>(requestOptions: ClientRequest<Req>): Promise<ClientResponse<Res>> {
  const { params, method, url, headers, body } = requestOptions;

  const customHeaders: any = {
    ...headers,
    customClient: true,
  };

  const request = {
    headers: customHeaders,
    body:
      // weird fetch issue
      headers!["content-type"] === "application/x.aptos.signed_transaction+bcs" ? (body as any) : JSON.stringify(body),
    method,
  };

  const response = await fetch(`${url}?${params}`, request);
  const data = await response.json();
  return {
    status: response.status,
    statusText: response.statusText,
    data,
    headers: response.headers,
    config: response,
    request,
  };
}
