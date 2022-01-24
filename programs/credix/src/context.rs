use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::rent;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{Mint, TokenAccount},
};
use spl_token::{self, solana_program::system_program};
use std::mem::size_of;

use crate::errors::ErrorCode;
use crate::*;
use std::str::FromStr;

#[derive(Accounts)]
#[instruction(signing_authority_bump: u8, global_market_state_bump: u8, global_market_seed: String)]
pub struct InitializeMarket<'info> {
    #[account(mut, signer)]
    pub owner: AccountInfo<'info>,
    pub gatekeeper_network: AccountInfo<'info>,
    #[account(
        init,
        payer = owner,
        seeds = [global_market_seed.as_bytes()],
        bump = global_market_state_bump,
        space = 2 * size_of::<GlobalMarketState>() + 8,
    )]
    pub global_market_state: Box<Account<'info, GlobalMarketState>>,
    #[account(
        seeds = [global_market_state.key().as_ref()],
        bump = signing_authority_bump
    )]
    pub signing_authority: AccountInfo<'info>,
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = base_mint_account,
        associated_token::authority = signing_authority
    )]
    pub liquidity_pool_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = owner,
        mint::decimals = base_mint_account.decimals,
        mint::authority = signing_authority,
        mint::freeze_authority = signing_authority
    )]
    pub lp_token_mint_account: Account<'info, Mint>,
    pub base_mint_account: Account<'info, Mint>,
    #[account(address = associated_token::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,
    #[account[address = rent::ID]]
    pub rent: Sysvar<'info, Rent>,
    #[account(address = spl_token::ID)]
    pub token_program: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct DepositFunds<'info> {
    #[account(mut, signer)]
    pub investor: AccountInfo<'info>,
    #[account(
        constraint = gateway_token.owner == &Pubkey::from_str(GATEWAY_PROGRAM_ID).unwrap()
    )]
    pub gateway_token: AccountInfo<'info>,
    #[account(mut)]
    pub global_market_state: Box<Account<'info, GlobalMarketState>>,
    #[account(
        seeds = [global_market_state.key().as_ref()],
        bump = global_market_state.signing_authority_bump
    )]
    pub signing_authority: AccountInfo<'info>,
    #[account(
        mut,
        constraint = investor_token_account.owner == investor.key(),
        constraint = investor_token_account.mint == liquidity_pool_token_account.mint,
        constraint = investor_token_account.amount >= amount @ ErrorCode::NotEnoughBaseTokens
    )]
    pub investor_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = global_market_state.liquidity_pool_token_mint_account,
        associated_token::authority = signing_authority,
    )]
    pub liquidity_pool_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        address = global_market_state.lp_token_mint_account,
    )]
    pub lp_token_mint_account: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = investor,
        associated_token::mint = lp_token_mint_account,
        associated_token::authority = investor
    )]
    pub investor_lp_token_account: Account<'info, TokenAccount>,
    #[account(
        seeds = [global_market_state.key().as_ref(), investor.key.as_ref(), CREDIX_PASS_SEED.as_bytes()],
        bump,
        constraint = credix_pass.active @ ErrorCode::CredixPassInactive,
        constraint = credix_pass.is_underwriter @ ErrorCode::CredixPassInvalid,
    )]
    pub credix_pass: Account<'info, CredixPass>,
    #[account(address = global_market_state.liquidity_pool_token_mint_account)]
    pub base_mint_account: AccountInfo<'info>,
    #[account(address = associated_token::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,
    #[account[address = rent::ID]]
    pub rent: Sysvar<'info, Rent>,
    #[account(address = spl_token::ID)]
    pub token_program: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(pass_bump: u8)]
pub struct CreateCredixPass<'info> {
    #[account(mut, signer)]
    pub owner: AccountInfo<'info>,
    pub pass_holder: AccountInfo<'info>,
    #[account(
        init,
        seeds = [global_market_state.key().as_ref(), pass_holder.key.as_ref(), CREDIX_PASS_SEED.as_bytes()],
        bump = pass_bump,
        payer = owner,
        space = 2 * size_of::<CredixPass>() + 8,
    )]
    pub credix_pass: Account<'info, CredixPass>,
    pub global_market_state: Account<'info, GlobalMarketState>,
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
    #[account[address = rent::ID]]
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateCredixPass<'info> {
    #[account(signer)]
    pub owner: AccountInfo<'info>,
    pub pass_holder: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [global_market_state.key().as_ref(), pass_holder.key.as_ref(), CREDIX_PASS_SEED.as_bytes()],
        bump,
    )]
    pub credix_pass: Account<'info, CredixPass>,
    pub global_market_state: Account<'info, GlobalMarketState>,
}

#[derive(Accounts)]
pub struct FreezeThawLpTokens<'info> {
    #[account(
        signer,
        // constraint = credix_permissioned_pda.owner = "someprogram",
    )]
    pub credix_permissioned_pda: AccountInfo<'info>,
    #[account(signer)]
    pub lp_holder: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [global_market_state.key().as_ref(), lp_holder.key.as_ref(), CREDIX_PASS_SEED.as_bytes()],
        bump,
    )]
    pub credix_pass: Account<'info, CredixPass>,
    #[account(
        mut,
        constraint = lp_token_account.owner == lp_holder.key(),
        constraint = lp_token_account.mint == lp_token_mint_account.key(),
    )]
    pub lp_token_account: Account<'info, TokenAccount>,
    pub global_market_state: Account<'info, GlobalMarketState>,
    #[account(
        seeds = [global_market_state.key().as_ref()],
        bump = global_market_state.signing_authority_bump
    )]
    pub signing_authority: AccountInfo<'info>,
    #[account(
        mut,
        address = global_market_state.lp_token_mint_account,
    )]
    pub lp_token_mint_account: Account<'info, Mint>,
    #[account(address = spl_token::ID)]
    pub token_program: AccountInfo<'info>,
}
