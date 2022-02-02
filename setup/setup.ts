import { Program, Provider, setProvider } from "@project-serum/anchor";
import { Credix } from "../target/types/credix";
import * as anchor from "@project-serum/anchor";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as utils from "../tests/utils";
import * as fs from "fs";
import { PermissionedMarkets } from "../target/types/permissioned_markets";
import { listCredixMarket } from "../tests/permissioned-market-utils/market-lister";
import { initialize_gatekeeper, issue_token } from "../tests/utils";

const DEX_PID = new PublicKey("A3KCE92wXZMtGGJT6XYL2KHva58VXvWkhcqfJ6Q5JEia");

async function init() {
  let provider = Provider.env();
  setProvider(provider);

  const program = anchor.workspace.Credix as Program<Credix>;
  const permissionedMarketProgram = anchor.workspace
    .CredixPermissionedMarket as Program<PermissionedMarkets>;

  const stringByteArrayToByteArray = (path: string) => {
    return Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8")));
  };
  const lpTokenMintKeypair = utils.lpTokenMint;
  const GLOBAL_MARKET_SEED = utils.GLOBAL_MARKET_SEED;
  const baseMint = new PublicKey(
    "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"
  );
  let providerBaseAssociatedTokenPK;
  let lpTokenMint;
  let gatewayToken;
  await utils.aidrop_sol(utils.payer.publicKey);

  // issue civic tokens
  // await initialize_gatekeeper();
  // await issue_token(provider.wallet.publicKey);
  // gatewayToken = await utils.get_gateway_token(provider.wallet.publicKey);

  const [globalMarketStatePda, globalMarketStateBump] =
    await utils.get_global_market_state_pda(GLOBAL_MARKET_SEED);
  const [signingAuthorityPda, signingAuthorityBump] =
    await utils.get_signing_authority_pda(globalMarketStatePda);
  const liquidityPoolBaseTokenAccount =
    await utils.get_associated_token_address(baseMint, signingAuthorityPda);

  /* await program.rpc.initializeMarket(
    signingAuthorityBump,
    globalMarketStateBump,
    GLOBAL_MARKET_SEED,
    {
      accounts: {
        owner: provider.wallet.publicKey,
        gatekeeperNetwork: new PublicKey(
          "gatem74V238djXdzWnJf94Wo1DcnuGkfijbf3AuBhfs"
        ),
        globalMarketState: globalMarketStatePda,
        signingAuthority: signingAuthorityPda,
        liquidityPoolTokenAccount: liquidityPoolBaseTokenAccount,
        lpTokenMintAccount: lpTokenMintKeypair.publicKey,
        baseMintAccount: baseMint,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [lpTokenMintKeypair],
    }
  ); */

  // Create the signing PDA for credix-permissioned-market
  /*   const [pda_address, bump] = await PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode("signing-authority"))],
    permissionedMarketProgram.programId
  );
  let tx = new Transaction();
  tx.add({
    keys: [
      {
        pubkey: provider.wallet.publicKey,
        isSigner: true,
        isWritable: true,
      },
      { pubkey: pda_address, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([255, bump]),
    programId: permissionedMarketProgram.programId,
  });
  await provider.send(tx); */

  const gm = await program.account.globalMarketState.fetch(
    globalMarketStatePda
  );

  const [marketAPublicKey] = await listCredixMarket({
    connection: provider.connection,
    wallet: provider.wallet,
    baseMint: gm.lpTokenMintAccount,
    quoteMint: baseMint,
    baseLotSize: 10000,
    quoteLotSize: 10000,
    dexProgramId: DEX_PID,
    proxyProgramId: permissionedMarketProgram.programId,
    feeRateBps: 0,
  });

  console.log("Market Address : " + marketAPublicKey.toString());
}

init();
