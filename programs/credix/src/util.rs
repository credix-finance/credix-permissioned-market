use anchor_lang::prelude::*;
use solana_gateway::error::GatewayError;
use solana_gateway::{Gateway, VerificationOptions};
pub fn civic_check<'a>(
    user: &AccountInfo<'a>,
    gateway_token: &AccountInfo<'a>,
    gatekeeper: &Pubkey,
) -> Result<(), GatewayError> {
    Gateway::verify_gateway_token_account_info(
        gateway_token,
        user.key,
        gatekeeper,
        Some(VerificationOptions {
            check_expiry: false,
            expiry_tolerance_seconds: None,
        }),
    )
}
