pub mod context;
pub mod errors;
mod processor;
mod spl_token_utils;
pub mod state;
mod util;

use crate::context::*;
use anchor_lang::prelude::*;
use state::*;

declare_id!("v1yuc1NDc1N1YBWGFdbGjEDBXepcbDeHY1NphTCgkAP");

pub const CREDIX_PASS_SEED: &str = "credix-pass";

pub const GATEWAY_PROGRAM_ID: &str = "gatem74V238djXdzWnJf94Wo1DcnuGkfijbf3AuBhfs";

#[program]
pub mod credix {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        signing_authority_bump: u8,
        global_market_state_bump: u8,
        _global_market_seed: String,
    ) -> ProgramResult {
        processor::process_initialize_market(ctx, signing_authority_bump, global_market_state_bump)
    }

    pub fn deposit_funds(ctx: Context<DepositFunds>, amount: u64) -> ProgramResult {
        msg!("Depositing funds with amount {}", amount);
        util::civic_check(
            &ctx.accounts.investor,
            &ctx.accounts.gateway_token,
            &ctx.accounts.global_market_state.gatekeeper_network,
        )?;
        processor::process_deposit(ctx, amount)
    }

    pub fn create_credix_pass(ctx: Context<CreateCredixPass>, pass_bump: u8) -> ProgramResult {
        msg!("Create Credix pass with pass_bump: {}", pass_bump,);
        processor::process_create_credix_pass(ctx, pass_bump)
    }

    pub fn update_credix_pass(ctx: Context<UpdateCredixPass>, is_active: bool) -> ProgramResult {
        msg!("Update Credix pass with is_active: {}", is_active,);
        processor::process_update_credix_pass(ctx, is_active)
    }

    pub fn freeze_lp_tokens(ctx: Context<FreezeThawLpTokens>) -> ProgramResult {
        processor::freeze_lp_tokens(ctx)
    }

    pub fn thaw_lp_tokens(ctx: Context<FreezeThawLpTokens>) -> ProgramResult {
        processor::thaw_lp_tokens(ctx)
    }
}
