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
#[derive(Default)]
struct Identity<'a> {
    signing_authority_bump: u8,
    cpi_accounts: Option<FreezeThawLpTokens<'a>>,
    credix_program: Option<AccountInfo<'a>>,
}
impl Identity<'static> {
    fn freeze_lp_token_cpi(self) -> ProgramResult {
        if self.credix_program.is_none() || self.cpi_accounts.is_none() {
            return Err(ErrorCode::MissingRequiredCpiAccounts.into());
        }

        let credix_program = self.credix_program.unwrap();
        let cpi_accounts = self.cpi_accounts.unwrap();
        let seeds = [
            "signing-authority".as_bytes(),
            &[self.signing_authority_bump],
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(credix_program, cpi_accounts, signer_seeds);
        credix::cpi::freeze_lp_tokens(cpi_ctx)
    }

    fn thaw_lp_token_cpi(self) -> ProgramResult {
        if self.credix_program.is_none() || self.cpi_accounts.is_none() {
            return Err(ErrorCode::MissingRequiredCpiAccounts.into());
        }

        let credix_program = self.credix_program.unwrap();
        let cpi_accounts = self.cpi_accounts.unwrap();
        let seeds = [
            "signing-authority".as_bytes(),
            &[self.signing_authority_bump],
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(credix_program, cpi_accounts, signer_seeds);
        credix::cpi::thaw_lp_tokens(cpi_ctx)
    }
}

impl<'info> MarketMiddleware for Identity<'info> {
    fn instruction(&mut self, _data: &mut &[u8]) -> ProgramResult {
        self.signing_authority_bump = _data[0];
        *_data = &_data[1..];
        Ok(())
    }

    fn init(&mut self, ctx: &mut Context) -> ProgramResult {
        // let cpi_accounts = FreezeThawLpTokens {
        //     credix_pass: ctx.accounts[0].to_account_info(),
        //     credix_permissioned_pda: ctx.accounts[1].to_account_info(),
        //     global_market_state: ctx.accounts[2].to_account_info(),
        //     lp_holder: ctx.accounts[3].to_account_info(),
        //     lp_token_account: ctx.accounts[4].to_account_info(),
        //     lp_token_mint_account: ctx.accounts[5].to_account_info(),
        //     signing_authority: ctx.accounts[6].to_account_info(),
        //     token_program: ctx.accounts[7].to_account_info(),
        // };
        // self.cpi_accounts = Some(cpi_accounts);
        // let credix_program = ctx.accounts[8].to_account_info();
        // self.credix_program = Some(credix_program);

        Ok(())
    }

    fn init_open_orders(&self, ctx: &mut Context) -> ProgramResult {
        verify_and_strip_auth(ctx)
    }

    fn new_order_v3(&self, ctx: &mut Context, _ix: &mut NewOrderInstructionV3) -> ProgramResult {
        verify_and_strip_auth(ctx)
    }

    fn cancel_order_v2(
        &self,
        ctx: &mut Context,
        _ix: &mut CancelOrderInstructionV2,
    ) -> ProgramResult {
        verify_and_strip_auth(ctx)
    }

    fn cancel_order_by_client_id_v2(
        &self,
        ctx: &mut Context,
        _client_id: &mut u64,
    ) -> ProgramResult {
        verify_and_strip_auth(ctx)
    }

    fn settle_funds(&self, ctx: &mut Context) -> ProgramResult {
        verify_and_strip_auth(ctx)
    }

    fn close_open_orders(&self, ctx: &mut Context) -> ProgramResult {
        verify_and_strip_auth(ctx)
    }

    fn prune(&self, ctx: &mut Context, _limit: &mut u16) -> ProgramResult {
        verify_revoked_and_strip_auth(ctx)?;

        // // Sign with the prune authority.
        // let market = &ctx.accounts[0];
        // ctx.seeds.push(prune_authority! {
        //     program = ctx.program_id,
        //     dex_program = ctx.dex_program_id,
        //     market = market.key
        // });

        // ctx.accounts[3] = Self::prepare_pda(&ctx.accounts[3]);
        Ok(())
    }

    fn consume_events_permissioned(&self, ctx: &mut Context, _limit: &mut u16) -> ProgramResult {
        verify_revoked_and_strip_auth(ctx)?;

        // let market_idx = ctx.accounts.len() - 3;
        // let auth_idx = ctx.accounts.len() - 1;

        // Sign with the consume_events authority.
        // let market = &ctx.accounts[market_idx];
        // ctx.seeds.push(consume_events_authority! {
        //     program = ctx.program_id,
        //     dex_program = ctx.dex_program_id,
        //     market = market.key
        // });

        // ctx.accounts[auth_idx] = Self::prepare_pda(&ctx.accounts[auth_idx]);
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

fn verify_and_strip_auth(ctx: &mut Context) -> ProgramResult {
    Ok(())
}

fn verify_revoked_and_strip_auth(ctx: &mut Context) -> ProgramResult {
    Ok(())
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
