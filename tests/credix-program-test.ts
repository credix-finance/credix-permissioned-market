import * as anchor from "@project-serum/anchor";
import * as utils from "./utils";
import * as assert from "assert";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { initialize_gatekeeper, issue_token } from "./utils";

describe("credix program test!", () => {
  let provider = anchor.Provider.env();
  anchor.setProvider(provider);

  // bug in 0.19.0
  // @ts-ignore
  const program = anchor.workspace.Credix as Program<Credix>;
  const treasury = anchor.web3.Keypair.generate();
  const lpTokenMintKeypair = anchor.web3.Keypair.generate();
  const GLOBAL_MARKET_SEED = utils.GLOBAL_MARKET_SEED;
  let baseMint;
  let treasuryPoolBaseAssociatedTokenPK;
  let providerBaseAssociatedTokenPK;
  let lpTokenMint;
  let gatewayToken;

  it("Should initialize all components", async () => {
    await utils.aidrop_sol(utils.payer.publicKey);
    baseMint = await utils.create_base_mint();

    treasuryPoolBaseAssociatedTokenPK = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      baseMint.publicKey,
      treasury.publicKey
    );

    providerBaseAssociatedTokenPK = await baseMint.createAssociatedTokenAccount(
      provider.wallet.publicKey
    );

    await utils.airdrop_mint(
      baseMint,
      utils.baseMintAuthority,
      providerBaseAssociatedTokenPK,
      1000_000_000
    );

    // issue civic tokens
    await initialize_gatekeeper();
    await issue_token(provider.wallet.publicKey);
    gatewayToken = await utils.get_gateway_token(provider.wallet.publicKey);
  });

  it("Should correctly initialize the market", async () => {
    const [globalMarketStatePda, globalMarketStateBump] =
      await utils.get_global_market_state_pda(GLOBAL_MARKET_SEED);
    const [signingAuthorityPda, signingAuthorityBump] =
      await utils.get_signing_authority_pda(globalMarketStatePda);
    const liquidityPoolBaseTokenAccount =
      await utils.get_associated_token_address(
        baseMint.publicKey,
        signingAuthorityPda
      );

    await program.rpc.initializeMarket(
      signingAuthorityBump,
      globalMarketStateBump,
      GLOBAL_MARKET_SEED,
      {
        accounts: {
          owner: provider.wallet.publicKey,
          gatekeeperNetwork: utils.gatekeeperNetwork.publicKey,
          globalMarketState: globalMarketStatePda,
          signingAuthority: signingAuthorityPda,
          liquidityPoolTokenAccount: liquidityPoolBaseTokenAccount,
          treasury: treasury.publicKey,
          treasuryPoolTokenAccount: treasuryPoolBaseAssociatedTokenPK,
          lpTokenMintAccount: lpTokenMintKeypair.publicKey,
          baseMintAccount: baseMint.publicKey,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [lpTokenMintKeypair],
      }
    );

    // get tokens
    lpTokenMint = new Token(
      program.provider.connection,
      lpTokenMintKeypair.publicKey,
      TOKEN_PROGRAM_ID,
      program.provider.wallet.payer
    );

    const globalMarketState = await program.account.globalMarketState.fetch(
      globalMarketStatePda
    );

    assert.ok(
      baseMint.publicKey.equals(globalMarketState.liquidityPoolTokenMintAccount)
    );
  });

  it("Should create a credix pass for wallet id", async () => {
    const [credixPassPDA, pass_bump] = await utils.get_credix_pass_pda(
      provider.wallet.publicKey,
      GLOBAL_MARKET_SEED
    );

    await utils.create_credix_pass(
      [true, true],
      credixPassPDA,
      pass_bump,
      provider.wallet.publicKey,
      GLOBAL_MARKET_SEED
    );
  });

  it("Should correctly fail on depositing too many tokens to the market", async () => {
    const depositAmount = new anchor.BN(100_000_000_000);

    const [globalMarketStatePda, _globalMarketStateBump] =
      await utils.get_global_market_state_pda(GLOBAL_MARKET_SEED);
    const [signingAuthorityPda, _signingAuthorityBump] =
      await utils.get_signing_authority_pda(globalMarketStatePda);
    const liquidityPoolBaseTokenAccount =
      await utils.get_associated_token_address(
        baseMint.publicKey,
        signingAuthorityPda
      );
    const [credixPassPDA, pass_bump] = await utils.get_credix_pass_pda(
      provider.wallet.publicKey,
      GLOBAL_MARKET_SEED
    );

    const investorLpTokenAccountPK = await utils.get_associated_token_address(
      lpTokenMint.publicKey,
      provider.wallet.publicKey
    );

    try {
      await program.rpc.depositFunds(depositAmount, {
        accounts: {
          investor: provider.wallet.publicKey,
          gatewayToken: gatewayToken.publicKey,
          globalMarketState: globalMarketStatePda,
          signingAuthority: signingAuthorityPda,
          investorTokenAccount: providerBaseAssociatedTokenPK,
          liquidityPoolTokenAccount: liquidityPoolBaseTokenAccount,
          lpTokenMintAccount: lpTokenMint.publicKey,
          investorLpTokenAccount: investorLpTokenAccountPK,
          baseMintAccount: baseMint.publicKey,
          credixPass: credixPassPDA,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [],
      });
      assert.ok(false);
    } catch (err) {
      assert.equal(err.code, 6011);
      assert.equal(err.msg, "Not enough Base tokens.");
    }
  });

  it("Should correctly deposit tokens to the market", async () => {
    const depositAmount = new anchor.BN(500_000_000);

    const [globalMarketStatePda, _globalMarketStateBump] =
      await utils.get_global_market_state_pda(GLOBAL_MARKET_SEED);
    const [signingAuthorityPda, _signingAuthorityBump] =
      await utils.get_signing_authority_pda(globalMarketStatePda);
    const liquidityPoolBaseTokenAccount =
      await utils.get_associated_token_address(
        baseMint.publicKey,
        signingAuthorityPda
      );
    const [credixPassPDA, pass_bump] = await utils.get_credix_pass_pda(
      provider.wallet.publicKey,
      GLOBAL_MARKET_SEED
    );

    const investorLpTokenAccountPK = await utils.get_associated_token_address(
      lpTokenMint.publicKey,
      provider.wallet.publicKey
    );

    await program.rpc.depositFunds(depositAmount, {
      accounts: {
        investor: provider.wallet.publicKey,
        gatewayToken: gatewayToken.publicKey,
        globalMarketState: globalMarketStatePda,
        signingAuthority: signingAuthorityPda,
        investorTokenAccount: providerBaseAssociatedTokenPK,
        liquidityPoolTokenAccount: liquidityPoolBaseTokenAccount,
        lpTokenMintAccount: lpTokenMint.publicKey,
        investorLpTokenAccount: investorLpTokenAccountPK,
        baseMintAccount: baseMint.publicKey,
        credixPass: credixPassPDA,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [],
    });

    // provider base 500
    const providerBaseAssociatedTokenAccountInfo =
      await baseMint.getAccountInfo(providerBaseAssociatedTokenPK);
    assert.equal(
      providerBaseAssociatedTokenAccountInfo.amount.toNumber(),
      500_000_000
    );

    // lp base 500
    const liquidityPoolBaseTokenAccountInfo = await baseMint.getAccountInfo(
      liquidityPoolBaseTokenAccount
    );
    assert.equal(
      liquidityPoolBaseTokenAccountInfo.amount.toNumber(),
      500_000_000
    );

    // provider lp 500
    const providerLPTokenAccountInfo = await lpTokenMint.getAccountInfo(
      investorLpTokenAccountPK
    );
    assert.equal(providerLPTokenAccountInfo.amount.toNumber(), 500_000_000);
  });
});
