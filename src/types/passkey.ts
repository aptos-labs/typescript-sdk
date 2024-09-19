import { AuthenticatorTransportFuture, Base64URLString } from "@simplewebauthn/server/esm/deps";

export type AllowCredentialOption = {
  id: Base64URLString;
  transports?: AuthenticatorTransportFuture[];
};
