use crate::{util::civic_check, *};
use anchor_lang::prelude::*;
use spl_token_utils::*;

pub fn process_initialize_market(
    ctx: Context<InitializeMarket>,
    signing_authority_bump: u8,
    global_market_state_bump: u8,
) -> ProgramResult {
    ctx.accounts.global_market_state.lp_token_mint_account =
        ctx.accounts.lp_token_mint_account.key();

    ctx.accounts.global_market_state.signing_authority_bump = signing_authority_bump;
    ctx.accounts.global_market_state.bump = global_market_state_bump;
    ctx.accounts.global_market_state.gatekeeper_network = ctx.accounts.gatekeeper_network.key();

    ctx.accounts
        .global_market_state
        .liquidity_pool_token_mint_account = ctx.accounts.base_mint_account.key();

    Ok(())
}

pub fn process_deposit(ctx: Context<DepositFunds>, amount: u64) -> ProgramResult {
    civic_check(
        &ctx.accounts.investor,
        &ctx.accounts.gateway_token,
        &ctx.accounts.global_market_state.gatekeeper_network,
    )?;
    transfer_base(
        amount,
        &ctx.accounts.investor_token_account.to_account_info(),
        &ctx.accounts.liquidity_pool_token_account.to_account_info(),
        &ctx.accounts.investor,
        &ctx.accounts.token_program,
    )?;

    mint_lp_tokens(
        &ctx.accounts.token_program,
        &ctx.accounts.lp_token_mint_account,
        &mut ctx.accounts.investor_lp_token_account,
        &ctx.accounts.signing_authority,
        &ctx.accounts.global_market_state,
        amount,
    )?;

    Ok(())
}

pub fn process_create_credix_pass(ctx: Context<CreateCredixPass>, pass_bump: u8) -> ProgramResult {
    ctx.accounts.credix_pass.active = true;
    ctx.accounts.credix_pass.bump = pass_bump;

    Ok(())
}

pub fn process_update_credix_pass(
    ctx: Context<UpdateCredixPass>,
    is_active: bool,
) -> ProgramResult {
    ctx.accounts.credix_pass.active = is_active;

    Ok(())
}

pub fn freeze_lp_tokens(ctx: Context<FreezeThawLpTokens>) -> ProgramResult {
    civic_check(
        &ctx.accounts.lp_holder,
        &ctx.accounts.gateway_token,
        &ctx.accounts.global_market_state.gatekeeper_network,
    )?;
    freeze_lp_token_account(
        &mut ctx.accounts.lp_token_account,
        &ctx.accounts.lp_token_mint_account,
        &ctx.accounts.signing_authority,
        &ctx.accounts.global_market_state,
        &ctx.accounts.token_program,
    )
}

pub fn thaw_lp_tokens(ctx: Context<FreezeThawLpTokens>) -> ProgramResult {
    civic_check(
        &ctx.accounts.lp_holder,
        &ctx.accounts.gateway_token,
        &ctx.accounts.global_market_state.gatekeeper_network,
    )?;
    thaw_lp_token_account(
        &mut ctx.accounts.lp_token_account,
        &ctx.accounts.lp_token_mint_account,
        &ctx.accounts.signing_authority,
        &ctx.accounts.global_market_state,
        &ctx.accounts.token_program,
    )
}
