import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import * as utils from "../utils";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  OpenOrders,
  OpenOrdersPda,
  Logger,
  ReferralFees,
  PermissionedCrank,
  MarketProxyBuilder,
  DexInstructions,
} from "@project-serum/serum";
import * as anchor from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getTokenAccount } from "@project-serum/common";

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID: PublicKey = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

const GATEWAY_PROGRAM: PublicKey = new PublicKey(
  "gatem74V238djXdzWnJf94Wo1DcnuGkfijbf3AuBhfs"
);

// Returns a client for the market proxy.
//
// If changing the program, one will likely need to change the builder/middleware
// here as well.
export async function loadCredixPermissionedMarket(
  connection,
  proxyProgramId: PublicKey,
  dexProgramId: PublicKey,
  market: PublicKey,
  lpMint: PublicKey,
  credixProgram: PublicKey,
  globalMarketSeed: string,
  gatewayNetwork: PublicKey
) {
  return (
    new MarketProxyBuilder()
      .middleware(
        new OpenOrdersPda({
          proxyProgramId: proxyProgramId,
          dexProgramId: dexProgramId,
        })
      )
      .middleware(new ReferralFees())
      .middleware(
        new CredixPermissionedMarket(
          dexProgramId,
          proxyProgramId,
          lpMint,
          credixProgram,
          globalMarketSeed,
          gatewayNetwork
        )
      )
      // .middleware(new Logger())
      .load({
        connection,
        market,
        dexProgramId,
        proxyProgramId,
        options: { commitment: "recent" },
      })
  );
}

export class CredixPermissionedMarket {
  private dexProgram: PublicKey;
  private programId: PublicKey;
  private lpMint: PublicKey;
  private credixProgram: PublicKey;
  private globalMarketSeed: string;
  private gatewayNetwork: PublicKey;
  constructor(
    dexProgram: PublicKey,
    programId: PublicKey,
    lpMint: PublicKey,
    credixProgram: PublicKey,
    globalMarketSeed: string,
    gatewayNetwork: PublicKey
  ) {
    this.dexProgram = dexProgram;
    this.programId = programId;
    this.lpMint = lpMint;
    this.credixProgram = credixProgram;
    this.globalMarketSeed = globalMarketSeed;
    this.gatewayNetwork = gatewayNetwork;
  }
  initOpenOrders(ix) {
    this.proxy(ix, 3);
  }
  newOrderV3(ix) {
    this.proxy(ix, 7);
  }
  cancelOrderV2(ix) {
    this.proxy(ix, 4);
  }
  cancelOrderByClientIdV2(ix) {
    this.proxy(ix, 4);
  }
  settleFunds(ix) {
    this.proxy(ix, 2);
  }
  closeOpenOrders(ix) {
    this.proxy(ix, 1);
  }
  prune(ix) {
    this.proxy(ix, 3);
  }
  consumeEvents(ix) {}
  consumeEventsPermissioned(ix) {}

  proxy(ix, inititorIndex) {
    let initiator: PublicKey = ix.keys[inititorIndex].pubkey;
    let [permissionedMarketPDA, permissionedBump] = findProgramAddressSync(
      [Buffer.from(anchor.utils.bytes.utf8.encode("signing-authority"))],
      this.programId
    );
    let [globalMarketState, _globalMarketStateBump] = findProgramAddressSync(
      [Buffer.from(anchor.utils.bytes.utf8.encode(this.globalMarketSeed))],
      this.credixProgram
    );

    let [signingAuthority, _bump] = findProgramAddressSync(
      [globalMarketState.toBuffer()],
      this.credixProgram
    );

    let [credixPassPda, credixPassPdaBump] = findProgramAddressSync(
      [
        globalMarketState.toBuffer(),
        initiator.toBuffer(),
        Buffer.from(anchor.utils.bytes.utf8.encode("credix-pass")),
      ],
      this.credixProgram
    );
    const GATEWAY_TOKEN_ADDRESS_SEED = "gateway";

    const seeds = [
      initiator.toBuffer(),
      Buffer.from(GATEWAY_TOKEN_ADDRESS_SEED, "utf8"),
      Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
      this.gatewayNetwork.toBuffer(),
    ];

    let gateway_account = findProgramAddressSync(seeds, GATEWAY_PROGRAM);

    let initiator_lpTokenAccount = findProgramAddressSync(
      [
        initiator.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        this.lpMint.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    );

    ix.keys = [
      { pubkey: initiator, isWritable: true, isSigner: true },
      {
        pubkey: initiator_lpTokenAccount[0],
        isWritable: true,
        isSigner: false,
      },
      { pubkey: permissionedMarketPDA, isWritable: false, isSigner: false },
      { pubkey: signingAuthority, isWritable: false, isSigner: false },
      { pubkey: this.lpMint, isWritable: false, isSigner: false },
      { pubkey: globalMarketState, isWritable: false, isSigner: false },
      { pubkey: credixPassPda, isWritable: false, isSigner: false },
      { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
      { pubkey: this.credixProgram, isWritable: false, isSigner: false },
      {
        pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
        isWritable: false,
        isSigner: false,
      },
      { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
      { pubkey: gateway_account[0], isWritable: false, isSigner: false },
      ...ix.keys,
    ];
    ix.data = Buffer.concat([Buffer.from([permissionedBump]), ix.data]);
  }
}
