import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmRawTransaction,
  Signer,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  AccountLayout as TokenAccountLayout,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MintLayout,
  Token,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Wallet } from '@project-serum/anchor';
import { AccountUtils } from './account';

export interface TxWithSigners {
  tx: Transaction;
  signers: Signer[];
}

export class WalletUtils {
  conn: Connection;

  constructor(conn: Connection) {
    this.conn = conn;
  }

  // --------------------------------------- Mint

  async createMintTx(
    authority: PublicKey,
    payer: PublicKey,
    decimals: number
  ): Promise<[PublicKey, TxWithSigners]> {
    const mintAccount = Keypair.generate();
    const balanceNeeded = await Token.getMinBalanceRentForExemptMint(this.conn);
    const tx = new Transaction({
      feePayer: payer,
      recentBlockhash: (await this.conn.getRecentBlockhash()).blockhash,
    });
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: authority,
        newAccountPubkey: mintAccount.publicKey,
        lamports: balanceNeeded,
        space: MintLayout.span,
        programId: TOKEN_PROGRAM_ID,
      }),
      Token.createInitMintInstruction(
        TOKEN_PROGRAM_ID,
        mintAccount.publicKey,
        decimals,
        authority,
        authority
      )
    );

    return [mintAccount.publicKey, { tx, signers: [mintAccount] }];
  }

  async mintToTx(
    mint: PublicKey,
    dest: PublicKey,
    authority: PublicKey,
    payer: PublicKey,
    amount: number
  ): Promise<TxWithSigners> {
    const tx = new Transaction({
      feePayer: payer,
      recentBlockhash: (await this.conn.getRecentBlockhash()).blockhash,
    });
    tx.add(
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID,
        mint,
        dest,
        authority,
        [],
        amount
      )
    );

    return { tx, signers: [] };
  }

  // --------------------------------------- Token Acc / ATA

  async createMintAndFundATAWithWallet(
    wallet: Wallet,
    decimals: number,
    amount: number,
    isAssociated = true
  ) {
    //create mint
    const [mint, newMintTx] = await this.createMintTx(
      wallet.publicKey,
      wallet.publicKey,
      decimals
    );
    //create token ATA
    const [tokenAcc, newTokenAccTx] = await this.createTokenAccountTx(
      mint,
      wallet.publicKey,
      wallet.publicKey,
      isAssociated
    );
    //fund ATA
    const mintToTx = await this.mintToTx(
      mint,
      tokenAcc,
      wallet.publicKey,
      wallet.publicKey,
      amount
    );

    const tx = await this.mergeTxs(
      [newMintTx, newTokenAccTx, mintToTx],
      wallet.publicKey
    );
    const txSig = await this.sendTxWithWallet(wallet, tx);

    return { mint, tokenAcc, txSig };
  }

  async createTokenAccountTx(
    mint: PublicKey,
    authority: PublicKey,
    payer: PublicKey,
    isAssociated: boolean
  ): Promise<[PublicKey, TxWithSigners]> {
    const newAccount = Keypair.generate();
    let balanceNeeded = await Token.getMinBalanceRentForExemptAccount(
      this.conn
    );
    const tx = new Transaction({
      feePayer: payer,
      recentBlockhash: (await this.conn.getRecentBlockhash()).blockhash,
    });
    if (isAssociated) {
      const associatedAddress = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mint,
        authority
      );
      tx.add(
        Token.createAssociatedTokenAccountInstruction(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          mint,
          associatedAddress,
          authority,
          payer
        )
      );

      return [associatedAddress, { tx, signers: [] }];
    }
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: authority,
        newAccountPubkey: newAccount.publicKey,
        lamports: balanceNeeded,
        space: TokenAccountLayout.span,
        programId: TOKEN_PROGRAM_ID,
      })
    );
    tx.add(
      Token.createInitAccountInstruction(
        TOKEN_PROGRAM_ID,
        mint,
        newAccount.publicKey,
        authority
      )
    );

    return [newAccount.publicKey, { tx, signers: [newAccount] }];
  }

  // --------------------------------------- Tx

  // ----------------- single

  async sendAndConfirmTx(tx: TxWithSigners, payer: PublicKey): Promise<string> {
    //these need to be done manually for a raw tx
    tx.tx.recentBlockhash = (await this.conn.getRecentBlockhash()).blockhash;
    tx.tx.feePayer = payer;
    tx.signers.forEach((s) => {
      tx.tx.partialSign(s);
    });

    return sendAndConfirmRawTransaction(this.conn, tx.tx.serialize());
  }

  async sendTxWithWallet(wallet: Wallet, tx: TxWithSigners) {
    await wallet.signTransaction(tx.tx);
    return this.sendAndConfirmTx(tx, wallet.publicKey);
  }

  // ----------------- multiple

  async mergeTxs(
    txs: TxWithSigners[],
    payer: PublicKey
  ): Promise<TxWithSigners> {
    const finalTx = new Transaction({
      feePayer: payer,
      recentBlockhash: (await this.conn.getRecentBlockhash()).blockhash,
    });
    let finalSigners: Signer[] = [];

    txs.forEach((t) => {
      finalTx.instructions.push(...t.tx.instructions);
      finalTx.signatures.push(...t.tx.signatures);
      finalSigners.push(...t.signers);
    });

    //dedup
    finalTx.signatures = [...new Set(finalTx.signatures)];
    finalSigners = [...new Set(finalSigners)];

    return { tx: finalTx, signers: finalSigners };
  }

  async sendAndConfirmTxsSet(
    txs: TxWithSigners[],
    payer: PublicKey
  ): Promise<string[]> {
    console.log(`attempting to send ${txs.length} transactions`);
    const signatures = await Promise.all(
      txs.map((t) => this.sendAndConfirmTx(t, payer))
    );
    const result = await Promise.all(
      signatures.map((s) => this.conn.confirmTransaction(s))
    );

    const failedTx = result.filter((r) => r.value.err != null);

    if (failedTx.length > 0) {
      throw new Error(`Transactions failed: ${failedTx}`);
    } else {
      console.log('All transactions succeeded:', signatures);
    }
    return signatures;
  }

  // (!) does NOT merge - will fail if one tx depends on another
  async sendTxsSetWithWallet(wallet: Wallet, txs: TxWithSigners[]) {
    await wallet.signAllTransactions(txs.map((t) => t.tx));
    return this.sendAndConfirmTxsSet(txs, wallet.publicKey);
  }
}