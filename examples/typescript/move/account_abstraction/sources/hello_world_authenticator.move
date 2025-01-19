module deployer::hello_world_authenticator {
    use aptos_framework::auth_data::{Self, AbstractionAuthData};
    use std::bcs;

    const EINVALID_SIGNATURE: u64 = 1;

    public fun authenticate(
        account: signer,
        signing_data: AbstractionAuthData,
    ): signer  {
        let authenticator = *auth_data::authenticator(&signing_data); // Dereference to get owned vector
        assert!(authenticator == bcs::to_bytes(&b"hello world"), EINVALID_SIGNATURE);
        account
    }
}