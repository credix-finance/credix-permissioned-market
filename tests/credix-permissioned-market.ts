import { Program } from "@project-serum/anchor";
import { Credix } from "../target/types/credix";
import { CredixPermissionedMarket } from "../target/types/credix_permissioned_market";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import { loadCredixPermissionedMarket } from "./permissioned-market-utils/credix-market";
import { listCredixMarket } from "./permissioned-market-utils/market-lister";
import * as utils from "./utils";
import * as anchor from "@project-serum/anchor";
import * as assert from "assert";
import {
  MarketProxy,
  MarketProxyBuilder,
  Middleware,
  OpenOrders,
  OpenOrdersPda,
} from "@project-serum/serum";
import { Token } from "@solana/spl-token";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";

const DEX_PID = new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");
const referral = new PublicKey("EoYuxcwTfyznBF2ebzZ8McqvveyxtMNTGAXGmNKycchB");

describe("credix-permissioned-market", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const provider = anchor.Provider.env();
  const permissionedMarketProgram = anchor.workspace
    .CredixPermissionedMarket as Program<CredixPermissionedMarket>;
  const credixProgram = anchor.workspace.Credix as Program<Credix>;

  // Token client.
  let baseClient: Token;

  // Global DEX accounts and clients shared accross all tests.
  let tokenAccount, usdcAccount;
  let openOrders: PublicKey,
    openOrdersBump,
    openOrdersInitAuthority,
    openOrdersBumpinit;
  let usdcPosted;
  let referralTokenAddress;
  let marketProxy: MarketProxy;
  const quoteLotSize = 100;
  const baseLotSize = 100000;

  let trader1 = anchor.web3.Keypair.generate();

  it("BOILERPLATE: Initializes an orderbook", async () => {
    // Create the signing PDA for credix-permissioned-market
    const [pda_address, bump] = findProgramAddressSync(
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
    await provider.send(tx);

    baseClient = await utils.create_base_mint();

    const [marketAPublicKey] = await listCredixMarket({
      connection: provider.connection,
      wallet: provider.wallet,
      baseMint: utils.lpTokenMint.publicKey,
      quoteMint: baseClient.publicKey,
      baseLotSize: baseLotSize,
      quoteLotSize: quoteLotSize,
      dexProgramId: DEX_PID,
      proxyProgramId: permissionedMarketProgram.programId,
      feeRateBps: 0,
    });

    marketProxy = await loadCredixPermissionedMarket(
      provider.connection,
      permissionedMarketProgram.programId,
      DEX_PID,
      marketAPublicKey,
      utils.lpTokenMint.publicKey,
      credixProgram.programId,
      utils.GLOBAL_MARKET_SEED,
      utils.gatekeeperNetwork.publicKey
    );
  });

  it("Should Create OpenOrder account for `wallet` and trader", async () => {
    await utils.aidrop_sol(trader1.publicKey);

    let tx = new Transaction();
    tx.add(
      marketProxy.instruction.initOpenOrders(
        provider.wallet.publicKey,
        marketProxy.market.address,
        marketProxy.market.address,
        marketProxy.market.address
      )
    );
    await provider.send(tx);

    await utils.issue_pass(trader1.publicKey);
    await utils.issue_token(trader1.publicKey);

    let tx2 = new Transaction();
    tx2.add(
      marketProxy.instruction.initOpenOrders(
        trader1.publicKey,
        marketProxy.market.address,
        marketProxy.market.address,
        marketProxy.market.address
      )
    );

    await provider.send(tx2, [trader1]);
  });

  it("BOILERPLATE: Calculates open orders addresses", async () => {
    openOrders = await OpenOrdersPda.openOrdersAddress(
      marketProxy.market.address,
      provider.wallet.publicKey,
      marketProxy.dexProgramId,
      marketProxy.proxyProgramId
    );

    openOrdersInitAuthority = await OpenOrdersPda.marketAuthority(
      marketProxy.market.address,
      marketProxy.dexProgramId,
      marketProxy.proxyProgramId
    );
  });

  it("Posts a bid on the orderbook", async () => {
    const size = 1;
    const price = 1;
    const usdcAccount = await baseClient.getOrCreateAssociatedAccountInfo(
      provider.wallet.publicKey
    );

    usdcPosted = new anchor.BN(quoteLotSize).mul(
      marketProxy.market
        .baseSizeNumberToLots(size)
        .mul(marketProxy.market.priceNumberToLots(price))
    );

    await utils.airdrop_mint(
      baseClient,
      utils.baseMintAuthority,
      usdcAccount.address,
      1000_000_000
    );

    const tx = new Transaction();
    tx.add(
      marketProxy.instruction.newOrderV3({
        owner: provider.wallet.publicKey,
        payer: usdcAccount.address,
        side: "buy",
        price,
        size,
        orderType: "postOnly",
        clientId: new anchor.BN(999),
        openOrdersAddressKey: openOrders,
        selfTradeBehavior: "abortTransaction",
      })
    );
    await provider.send(tx);
  });

  it("Cancels a bid on the orderbook", async () => {
    // Given.
    const beforeOoAccount = await OpenOrders.load(
      provider.connection,
      openOrders,
      DEX_PID
    );

    // When.
    const tx = new Transaction();
    tx.add(
      await marketProxy.instruction.cancelOrderByClientId(
        provider.wallet.publicKey,
        openOrders,
        new anchor.BN(999)
      )
    );
    await provider.send(tx);

    // Then.
    const afterOoAccount = await OpenOrders.load(
      provider.connection,
      openOrders,
      DEX_PID
    );
    assert.ok(beforeOoAccount.quoteTokenFree.eq(new anchor.BN(0)));
    assert.ok(beforeOoAccount.quoteTokenTotal.eq(usdcPosted));
    assert.ok(afterOoAccount.quoteTokenFree.eq(usdcPosted));
    assert.ok(afterOoAccount.quoteTokenTotal.eq(usdcPosted));
  });

  it("Posts several bids and asks on the orderbook", async () => {
    const size = 10;
    const price = 2;
    const usdcAccount = await baseClient.getOrCreateAssociatedAccountInfo(
      provider.wallet.publicKey
    );
    const lpTokenAccount = await utils.get_associated_token_address(
      utils.lpTokenMint.publicKey,
      provider.wallet.publicKey
    );

    for (let k = 0; k < 10; k += 1) {
      const tx = new Transaction();
      tx.add(
        marketProxy.instruction.newOrderV3({
          owner: provider.wallet.publicKey,
          payer: usdcAccount.address,
          side: "buy",
          price,
          size,
          orderType: "postOnly",
          clientId: new anchor.BN(999),
          openOrdersAddressKey: openOrders,
          selfTradeBehavior: "abortTransaction",
        })
      );
      await provider.send(tx);
    }

    const sizeAsk = 10;
    const priceAsk = 10;

    for (let k = 0; k < 10; k += 1) {
      const txAsk = new Transaction();
      txAsk.add(
        marketProxy.instruction.newOrderV3({
          owner: provider.wallet.publicKey,
          payer: lpTokenAccount,
          side: "sell",
          price: priceAsk,
          size: sizeAsk,
          orderType: "postOnly",
          clientId: new anchor.BN(1000),
          openOrdersAddressKey: openOrders,
          selfTradeBehavior: "abortTransaction",
        })
      );
      await provider.send(txAsk);
    }
  });

  it("Posts trader1 bid on the orderbook", async () => {
    const usdcAccountTrader = await baseClient.getOrCreateAssociatedAccountInfo(
      trader1.publicKey
    );

    let openOrdersTrader = await OpenOrdersPda.openOrdersAddress(
      marketProxy.market.address,
      trader1.publicKey,
      marketProxy.dexProgramId,
      marketProxy.proxyProgramId
    );

    await utils.airdrop_mint(
      baseClient,
      utils.baseMintAuthority,
      usdcAccountTrader.address
    );
    const tx = new Transaction();
    tx.add(
      marketProxy.instruction.newOrderV3({
        owner: trader1.publicKey,
        payer: usdcAccountTrader.address,
        side: "buy",
        price: 1,
        size: 1,
        orderType: "postOnly",
        clientId: new anchor.BN(999),
        openOrdersAddressKey: openOrdersTrader,
        selfTradeBehavior: "abortTransaction",
      })
    );
    await provider.send(tx, [trader1]);
  });

  it("Settles funds on the orderbook", async () => {
    // Given.

    const usdcAccount = await baseClient.getOrCreateAssociatedAccountInfo(
      provider.wallet.publicKey
    );
    const lpTokenAccount = await utils.get_associated_token_address(
      utils.lpTokenMint.publicKey,
      provider.wallet.publicKey
    );

    const referralUsdc = await baseClient.getOrCreateAssociatedAccountInfo(
      referral
    );

    const beforeTokenAccount = await baseClient.getAccountInfo(
      usdcAccount.address
    );

    // When.
    const tx = new Transaction();
    tx.add(
      await marketProxy.instruction.settleFunds(
        openOrders,
        provider.wallet.publicKey,
        lpTokenAccount,
        usdcAccount.address,
        referralUsdc.address
      )
    );
    await provider.send(tx);
  });
});

async function crankEventQueue(provider, marketProxy) {
  // TODO: can do this in a single transaction if we covert the pubkey bytes
  //       into a [u64; 4] array and sort. I'm lazy though.
  let eq = await marketProxy.market.loadEventQueue(provider.connection);
  while (eq.length > 0) {
    const tx = new Transaction();
    tx.add(
      marketProxy.instruction.consumeEventsPermissioned([eq[0].openOrders], 1)
    );
    await provider.send(tx);
    eq = await marketProxy.market.loadEventQueue(provider.connection);
  }
}
