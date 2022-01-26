import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import * as utils from "../utils";
const { PublicKey } = require("@solana/web3.js");
const anchor = require("@project-serum/anchor");
const {
  OpenOrders,
  OpenOrdersPda,
  Logger,
  ReferralFees,
  PermissionedCrank,
  MarketProxyBuilder,
} = require("@project-serum/serum");

// Returns a client for the market proxy.
//
// If changing the program, one will likely need to change the builder/middleware
// here as well.
export async function loadCredixPermissionedMarket(
  connection,
  proxyProgramId,
  dexProgramId,
  market,
  lpMint,
  credixProgram
) {
  return new MarketProxyBuilder()
    .middleware(
      new OpenOrdersPda({
        proxyProgramId,
        dexProgramId,
      })
    )
    .middleware(new ReferralFees())
    .middleware(
      new CredixPermissionedMarket(proxyProgramId, lpMint, credixProgram)
    )
    .middleware(new Logger())
    .load({
      connection,
      market,
      dexProgramId,
      proxyProgramId,
      options: { commitment: "recent" },
    });
}

export class CredixPermissionedMarket {
  private programId;
  private lpMint;
  private credixProgram;
  constructor(programId, lpMint, credixProgram) {
    this.programId = programId;
    this.lpMint = lpMint;
    this.credixProgram = credixProgram;
  }
  async initOpenOrders(
    ix,
    globalMarketSeed: string,
    initiator: typeof PublicKey
  ) {
    await this.proxy(ix, globalMarketSeed, initiator);
  }
  async newOrderV3(ix, globalMarketSeed: string, initiator: typeof PublicKey) {
    await this.proxy(ix, globalMarketSeed, initiator);
  }
  async cancelOrderV2(
    ix,
    globalMarketSeed: string,
    initiator: typeof PublicKey
  ) {
    await this.proxy(ix, globalMarketSeed, initiator);
  }
  async cancelOrderByClientIdV2(
    ix,
    globalMarketSeed: string,
    initiator: typeof PublicKey
  ) {
    await this.proxy(ix, globalMarketSeed, initiator);
  }
  async settleFunds(ix, globalMarketSeed: string, initiator: typeof PublicKey) {
    await this.proxy(ix, globalMarketSeed, initiator);
  }
  async closeOpenOrders(
    ix,
    globalMarketSeed: string,
    initiator: typeof PublicKey
  ) {
    await this.proxy(ix, globalMarketSeed, initiator);
  }
  async prune(ix, globalMarketSeed: string, initiator: typeof PublicKey) {
    await this.proxy(ix, globalMarketSeed, initiator);
  }

  async proxy(ix, globalMarketSeed: string, initiator: typeof PublicKey) {
    let [permissionedMarketPDA, permissionedBump] = findProgramAddressSync(
      [Buffer.from("signing-authority")],
      this.programId
    );
    let [globalMarketState, globalMarketStateBump] =
      await utils.get_global_market_state_pda(globalMarketSeed);
    let [signingAuthority, _bump] = await utils.get_signing_authority_pda(
      globalMarketState
    );
    let [credixPassPda, credixPassPdaBump] = await utils.get_credix_pass_pda(
      initiator,
      globalMarketSeed
    );
    let initiator_lpTokenAccount = await utils.get_associated_token_address(
      this.lpMint,
      initiator
    );

    ix.keys = [
      { pubkey: initiator, isWritable: false, isSigner: true },
      { pubkey: initiator_lpTokenAccount, isWritable: true, isSigner: false },
      { pubkey: permissionedMarketPDA, isWritable: false, isSigner: true },
      { pubkey: signingAuthority, isWritable: false, isSigner: true },
      { pubkey: this.lpMint, isWritable: false, isSigner: false },
      { pubkey: globalMarketState, isWritable: false, isSigner: false },
      { pubkey: credixPassPda, isWritable: false, isSigner: false },
      { pubkey: this.credixProgram, isWritable: false, isSigner: false },
      ...ix.keys,
    ];
    ix.data = [permissionedBump, ...ix.data];
  }
}
