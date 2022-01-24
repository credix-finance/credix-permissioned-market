use crate::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{
    burn, freeze_account, mint_to, thaw_account, transfer, Burn, FreezeAccount, Mint, MintTo,
    ThawAccount, TokenAccount, Transfer,
};

pub fn mint_lp_tokens<'a>(
    token_program_account_info: &AccountInfo<'a>,
    lp_token_mint_account: &Account<'a, Mint>,
    to_account: &mut Account<'a, TokenAccount>,
    signing_authority_account_info: &AccountInfo<'a>,
    global_market_state_account: &Account<'a, GlobalMarketState>,
    amount: u64,
) -> ProgramResult {
    thaw_lp_token_account(
        to_account,
        lp_token_mint_account,
        signing_authority_account_info,
        global_market_state_account,
        token_program_account_info,
    )?;

    let cpi_accounts = MintTo {
        mint: lp_token_mint_account.to_account_info(),
        to: to_account.to_account_info(),
        authority: signing_authority_account_info.clone(),
    };

    let seeds = &[
        global_market_state_account.to_account_info().key.as_ref(),
        &[global_market_state_account.signing_authority_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_context = CpiContext::new_with_signer(
        token_program_account_info.clone(),
        cpi_accounts,
        signer_seeds,
    );

    mint_to(cpi_context, amount)?;

    freeze_lp_token_account(
        to_account,
        lp_token_mint_account,
        signing_authority_account_info,
        global_market_state_account,
        token_program_account_info,
    )
}

#[allow(dead_code)]
pub fn burn_lp_tokens<'a>(
    token_program_account_info: &AccountInfo<'a>,
    token_account: &mut Account<'a, TokenAccount>,
    owner_account: &AccountInfo<'a>,
    mint_account: &Account<'a, Mint>,
    authority_account_info: &AccountInfo<'a>,
    global_market_state_account: &Account<'a, GlobalMarketState>,
    amount: u64,
) -> ProgramResult {
    thaw_lp_token_account(
        token_account,
        mint_account,
        authority_account_info,
        global_market_state_account,
        token_program_account_info,
    )?;

    let cpi_accounts = Burn {
        mint: mint_account.to_account_info(),
        to: token_account.to_account_info(),
        authority: owner_account.clone(),
    };

    let cpi_context = CpiContext::new(token_program_account_info.to_account_info(), cpi_accounts);
    burn(cpi_context, amount)?;

    freeze_lp_token_account(
        token_account,
        mint_account,
        authority_account_info,
        global_market_state_account,
        token_program_account_info,
    )
}

pub fn transfer_base<'a>(
    amount: u64,
    from: &AccountInfo<'a>,
    to: &AccountInfo<'a>,
    authority: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
) -> ProgramResult {
    let transfer_instruction = Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
    };

    let cpi_context = CpiContext::new(token_program.clone(), transfer_instruction);

    transfer(cpi_context, amount)
}

#[allow(dead_code)]
pub fn transfer_base_with_signer<'a>(
    amount: u64,
    from: &AccountInfo<'a>,
    to: &AccountInfo<'a>,
    authority: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
    seeds: &[&[&[u8]]],
) -> ProgramResult {
    let transfer_instruction = Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
    };

    let cpi_context =
        CpiContext::new_with_signer(token_program.clone(), transfer_instruction, seeds);

    transfer(cpi_context, amount)
}

pub fn thaw_lp_token_account<'a>(
    token_account: &mut Account<'a, TokenAccount>,
    mint_account: &Account<'a, Mint>,
    authority_account_info: &AccountInfo<'a>,
    global_market_state_account: &Account<'a, GlobalMarketState>,
    token_program_account_info: &AccountInfo<'a>,
) -> ProgramResult {
    if !token_account.is_frozen() {
        return Ok(());
    }

    let thaw_accounts = ThawAccount {
        mint: mint_account.to_account_info(),
        account: token_account.to_account_info(),
        authority: authority_account_info.clone(),
    };

    let seeds = &[
        global_market_state_account.to_account_info().key.as_ref(),
        &[global_market_state_account.signing_authority_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_context = CpiContext::new_with_signer(
        token_program_account_info.clone(),
        thaw_accounts,
        signer_seeds,
    );

    thaw_account(cpi_context)?;
    token_account.reload()
}

pub fn freeze_lp_token_account<'a>(
    token_account: &mut Account<'a, TokenAccount>,
    lp_token_mint_account: &Account<'a, Mint>,
    authority_account_info: &AccountInfo<'a>,
    global_market_state_account: &Account<'a, GlobalMarketState>,
    token_program_account_info: &AccountInfo<'a>,
) -> ProgramResult {
    if token_account.is_frozen() {
        return Ok(());
    }

    let freeze_accounts = FreezeAccount {
        account: token_account.to_account_info(),
        mint: lp_token_mint_account.to_account_info(),
        authority: authority_account_info.clone(),
    };

    let seeds = &[
        global_market_state_account.to_account_info().key.as_ref(),
        &[global_market_state_account.signing_authority_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_context = CpiContext::new_with_signer(
        token_program_account_info.clone(),
        freeze_accounts,
        signer_seeds,
    );

    freeze_account(cpi_context)?;
    token_account.reload()
}
