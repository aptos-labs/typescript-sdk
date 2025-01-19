module deployer::any_authenticator {
    use aptos_framework::auth_data::{AbstractionAuthData};

    public fun authenticate(
        account: signer,
        _signing_data: AbstractionAuthData,
    ): signer  {
        account
    }

}