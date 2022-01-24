use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct GlobalMarketState {
    pub gatekeeper_network: Pubkey,
    pub liquidity_pool_token_mint_account: Pubkey,
    pub lp_token_mint_account: Pubkey,
    pub signing_authority_bump: u8,
    pub bump: u8,
}

#[account]
#[derive(Default)]
pub struct CredixPass {
    pub bump: u8,
    pub is_borrower: bool,
    pub is_underwriter: bool,
    pub active: bool,
}
