use anchor_lang::prelude::*;
use anchor_lang::solana_program::account_info::AccountInfo;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use anchor_lang::solana_program::pubkey::Pubkey;
use credix::cpi::accounts::FreezeThawLpTokens;
use serum_dex_permissioned::serum_dex::instruction::{
    CancelOrderInstructionV2, NewOrderInstructionV3,
};
use serum_dex_permissioned::{
    Context, Logger, MarketMiddleware, MarketProxy, OpenOrdersPda, ReferralFees,
};

declare_id!("iPRL869bGrTiJZP6GW2ysPYXV9PMKSMAr6CYhRJx3zq");

#[program]
pub mod permissioned_markets {
    use super::*;
    pub fn entry(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
        MarketProxy::new()
            .middleware(&mut Logger)
            .middleware(&mut Identity::default())
            .middleware(&mut ReferralFees::new(referral::ID))
            .middleware(&mut OpenOrdersPda::new())
            .run(program_id, accounts, data)
    }
}

/// Accounts
/// 0. `[signer]` lp token holder(buyer)
/// 1. `[writable]` lp token account
/// 2. `[signer]` credix_permissioned_pda
/// 3. `[signer]` signing_authority
/// 4. `[]` lp_token_mint_account
/// 5. `[]` global_market_state
/// 6. `[]` credix_pass
/// 7. `[]` token_program
/// 8. `[]` credix_program
#[derive(Default)]
struct Identity {
    signing_authority_bump: u8,
}

impl Identity {
    fn freeze_lp_token_cpi(&self, ctx: &mut Context) {
        let credix_program = ctx.accounts[8].to_account_info();
        let cpi_accounts = FreezeThawLpTokens {
            lp_holder: ctx.accounts[0].to_account_info(),
            lp_token_account: ctx.accounts[1].to_account_info(),
            credix_permissioned_pda: ctx.accounts[2].to_account_info(),
            signing_authority: ctx.accounts[3].to_account_info(),
            lp_token_mint_account: ctx.accounts[4].to_account_info(),
            global_market_state: ctx.accounts[5].to_account_info(),
            credix_pass: ctx.accounts[6].to_account_info(),
            token_program: ctx.accounts[7].to_account_info(),
        };
        let account_meta = cpi_accounts.to_account_metas(None);
        let ix = credix::instruction::FreezeLpTokens;
        let data = anchor_lang::InstructionData::data(&ix);
        let instruction = anchor_lang::solana_program::instruction::Instruction {
            program_id: credix_program.key(),
            accounts: account_meta,
            data,
        };
        let seeds = vec![vec![
            "signing-authority".as_bytes().to_vec(),
            vec![self.signing_authority_bump],
        ]];
        ctx.post_instructions
            .push((instruction, cpi_accounts.to_account_infos(), seeds));
    }

    fn thaw_lp_token_cpi(&self, ctx: &mut Context) {
        let credix_program = ctx.accounts[8].to_account_info();
        let cpi_accounts = FreezeThawLpTokens {
            lp_holder: ctx.accounts[0].to_account_info(),
            lp_token_account: ctx.accounts[1].to_account_info(),
            credix_permissioned_pda: ctx.accounts[2].to_account_info(),
            signing_authority: ctx.accounts[3].to_account_info(),
            lp_token_mint_account: ctx.accounts[4].to_account_info(),
            global_market_state: ctx.accounts[5].to_account_info(),
            credix_pass: ctx.accounts[6].to_account_info(),
            token_program: ctx.accounts[7].to_account_info(),
        };
        let account_meta = cpi_accounts.to_account_metas(None);
        let ix = credix::instruction::ThawLpTokens;
        let data = anchor_lang::InstructionData::data(&ix);
        let instruction = anchor_lang::solana_program::instruction::Instruction {
            program_id: credix_program.key(),
            accounts: account_meta,
            data,
        };
        let seeds = vec![vec![
            "signing-authority".as_bytes().to_vec(),
            vec![self.signing_authority_bump],
        ]];
        ctx.pre_instructions
            .push((instruction, cpi_accounts.to_account_infos(), seeds));
    }
}

impl MarketMiddleware for Identity {
    fn instruction(&mut self, _data: &mut &[u8]) -> ProgramResult {
        self.signing_authority_bump = _data[0];
        *_data = &_data[1..];
        Ok(())
    }

    fn init_open_orders(&self, ctx: &mut Context) -> ProgramResult {
        self.thaw_lp_token_cpi(ctx);
        self.freeze_lp_token_cpi(ctx);
        ctx.accounts = ctx.accounts[8..].to_vec();
        Ok(())
    }

    fn new_order_v3(&self, ctx: &mut Context, _ix: &mut NewOrderInstructionV3) -> ProgramResult {
        self.thaw_lp_token_cpi(ctx);
        self.freeze_lp_token_cpi(ctx);
        ctx.accounts = ctx.accounts[8..].to_vec();
        Ok(())
    }

    fn cancel_order_v2(
        &self,
        ctx: &mut Context,
        _ix: &mut CancelOrderInstructionV2,
    ) -> ProgramResult {
        self.thaw_lp_token_cpi(ctx);
        self.freeze_lp_token_cpi(ctx);
        ctx.accounts = ctx.accounts[8..].to_vec();
        Ok(())
    }

    fn cancel_order_by_client_id_v2(
        &self,
        ctx: &mut Context,
        _client_id: &mut u64,
    ) -> ProgramResult {
        self.thaw_lp_token_cpi(ctx);
        self.freeze_lp_token_cpi(ctx);
        ctx.accounts = ctx.accounts[8..].to_vec();
        Ok(())
    }

    fn settle_funds(&self, ctx: &mut Context) -> ProgramResult {
        self.thaw_lp_token_cpi(ctx);
        self.freeze_lp_token_cpi(ctx);
        ctx.accounts = ctx.accounts[8..].to_vec();
        Ok(())
    }

    fn close_open_orders(&self, ctx: &mut Context) -> ProgramResult {
        self.thaw_lp_token_cpi(ctx);
        self.freeze_lp_token_cpi(ctx);
        ctx.accounts = ctx.accounts[8..].to_vec();
        Ok(())
    }

    fn prune(&self, ctx: &mut Context, _limit: &mut u16) -> ProgramResult {
        self.thaw_lp_token_cpi(ctx);
        self.freeze_lp_token_cpi(ctx);
        ctx.accounts = ctx.accounts[8..].to_vec();
        Ok(())
    }

    fn consume_events_permissioned(&self, ctx: &mut Context, _limit: &mut u16) -> ProgramResult {
        self.thaw_lp_token_cpi(ctx);
        self.freeze_lp_token_cpi(ctx);
        ctx.accounts = ctx.accounts[9..].to_vec();
        Ok(())
    }

    fn fallback(&self, ctx: &mut Context) -> ProgramResult {
        let cpi = anchor_lang::solana_program::system_instruction::create_account_with_seed(
            &ctx.accounts[0].key(),
            &ctx.accounts[1].key(),
            &ctx.accounts[0].key(),
            "signing-authority",
            0,
            0,
            ctx.program_id,
        );
        anchor_lang::solana_program::program::invoke(&cpi, ctx.accounts.as_slice())
    }
}

// Error.
#[error]
pub enum ErrorCode {
    #[msg("Invalid auth token provided")]
    InvalidAuth,
    #[msg("Auth token not revoked")]
    TokenNotRevoked,
    #[msg("Required cpi accounts and variables not found")]
    MissingRequiredCpiAccounts,
}

// Constants.
pub mod referral {
    use anchor_lang::prelude::*;
    declare_id!("EoYuxcwTfyznBF2ebzZ8McqvveyxtMNTGAXGmNKycchB");
}
