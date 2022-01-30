use anchor_lang::prelude::*;

#[error]
pub enum ErrorCode {
    #[msg("Not enough liquidity.")]
    NotEnoughLiquidity,
    #[msg("The Signer is not authorized to use this instruction.")]
    UnauthorizedSigner,
    #[msg("Credix pass is inactive at the moment.")]
    CredixPassInactive,
    #[msg("Overflow occured.")]
    Overflow,
    #[msg("Underflow occured.")]
    Underflow,
    #[msg("Tried to divide by zero.")]
    ZeroDivision,
    #[msg("Invalid Ratio: denominator can't be zero.")]
    ZeroDenominator,
    #[msg("Invalid u64 used as value for PreciseNumber.")]
    InvalidPreciseNumber,
    #[msg("Unable to cast PreciseNumber to u64")]
    PreciseNumberCastFailed,
    #[msg("Not enough LP tokens.")]
    NotEnoughLPTokens,
    #[msg("Not enough Base tokens.")]
    NotEnoughBaseTokens,
}
