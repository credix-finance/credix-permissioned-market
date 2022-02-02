pub mod context;
pub mod errors;
mod processor;
mod spl_token_utils;
pub mod state;
mod util;

use crate::context::*;
use anchor_lang::prelude::*;
use state::*;

declare_id!("8HE5gUxtvXEpHFjaJW3SNcZe2vXEusKWcWJWoF8aJQ8");

pub const CREDIX_PASS_SEED: &str = "credix-pass";

pub mod gateway_program {
    use anchor_lang::prelude::declare_id;
    declare_id!("gatem74V238djXdzWnJf94Wo1DcnuGkfijbf3AuBhfs");
}
pub mod permissioned_market_program {
    use anchor_lang::prelude::declare_id;
    declare_id!("FYXohVSAyeUykuBDGYpSohgZb4y6DFmNJBjcQrML8ix6");
}

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
