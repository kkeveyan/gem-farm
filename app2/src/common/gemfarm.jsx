import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { BN, Idl } from '@project-serum/anchor';

import { createFakeWallet } from './gemBank'
import { GemFarmClient } from '@gemworks/gem-farm-ts';
import { programs } from '@metaplex/js';
const gem_farm = require('./gem_farm.json')
const gem_bank = require('./gem_bank.json')
export async function initGemFarm(
  conn,
  wallet
) {
  const walletToUse = wallet ?? createFakeWallet();
  // console.log("using wallet for gemfarm init: ", walletToUse.publicKey.toBase58())
  const farmIdl = gem_farm;
  // console.log("farmIdl done :", farmIdl)
  const bankIdl = gem_bank;
  // console.log("bankIdl done: ", bankIdl)
  return new GemFarm(conn, walletToUse, farmIdl, bankIdl);
}

export class GemFarm extends GemFarmClient {
  constructor(conn, wallet, farmIdl, bankIdl) {
    const farmProgId = "farmL4xeBFVXJqtfxCzU9b28QACM7E2W2ctT6epAjvE";
    const bankProgId = "bankHHdqMuaaST4qQk6mkzxGeKPHWmqdgor6Gs8r88m";
    super(conn, wallet, farmIdl, farmProgId, bankIdl, bankProgId);
  }

  async initFarmWallet(
    rewardAMint,
    rewardAType,
    rewardBMint,
    rewardBType,
    farmConfig
  ) {
    const farm = Keypair.generate();
    const bank = Keypair.generate();

    const result = await this.initFarm(
      farm,
      this.wallet.publicKey,
      this.wallet.publicKey,
      bank,
      rewardAMint,
      rewardAType,
      rewardBMint,
      rewardBType,
      farmConfig
    );

    console.log('new farm started!', farm.publicKey.toBase58());
    console.log('bank is:', bank.publicKey.toBase58());

    return { farm, bank, ...result };
  }

  async updateFarmWallet(
    farm,
    newConfig,
    newManager
  ) {
    const result = await this.updateFarm(
      farm,
      this.wallet.publicKey,
      newConfig,
      newManager
    );

    console.log('updated the farm');

    return result;
  }

  async authorizeFunderWallet(farm, funder) {
    const result = await this.authorizeFunder(
      farm,
      this.wallet.publicKey,
      funder
    );

    console.log('authorized funder', funder.toBase58());

    return result;
  }

  async deauthorizeFunderWallet(farm, funder) {
    const result = await this.deauthorizeFunder(
      farm,
      this.wallet.publicKey,
      funder
    );

    console.log('DEauthorized funder', funder.toBase58());

    return result;
  }

  async fundVariableRewardWallet(
    farm,
    rewardMint,
    amount,
    duration
  ) {
    const rewardSource = await this.findATA(rewardMint, this.wallet.publicKey);

    const config = {
      amount: new BN(amount),
      durationSec: new BN(duration),
    };

    const result = this.fundReward(
      farm,
      rewardMint,
      this.wallet.publicKey,
      rewardSource,
      config
    );

    console.log('funded variable reward with mint:', rewardMint.toBase58());

    return result;
  }

  async fundFixedRewardWallet(
    farm,
    rewardMint,
    amount,
    duration,
    baseRate,
    denominator,
    t1RewardRate,
    t1RequiredTenure,
    t2RewardRate,
    t2RequiredTenure,
    t3RewardRate,
    t3RequiredTenure,
  ) {
    const rewardSource = await this.findATA(rewardMint, this.wallet.publicKey);

    const config = {
      schedule: {
        baseRate: new BN(baseRate),
        tier1: t1RewardRate
          ? {
            rewardRate: new BN(t1RewardRate),
            requiredTenure: new BN(t1RequiredTenure),
          }
          : null,
        tier2: t2RewardRate
          ? {
            rewardRate: new BN(t2RewardRate),
            requiredTenure: new BN(t2RequiredTenure),
          }
          : null,
        tier3: t3RewardRate
          ? {
            rewardRate: new BN(t3RewardRate),
            requiredTenure: new BN(t3RequiredTenure),
          }
          : null,
        denominator: new BN(denominator),
      },
      amount: new BN(amount),
      durationSec: new BN(duration),
    };

    const result = await this.fundReward(
      farm,
      rewardMint,
      this.wallet.publicKey,
      rewardSource,
      undefined,
      config
    );

    console.log('funded fixed reward with mint:', rewardMint.toBase58());

    return result;
  }

  async cancelRewardWallet(farm, rewardMint) {
    const result = await this.cancelReward(
      farm,
      this.wallet.publicKey,
      rewardMint,
      this.wallet.publicKey
    );

    console.log('cancelled reward', rewardMint.toBase58());

    return result;
  }

  async lockRewardWallet(farm, rewardMint) {
    const result = await this.lockReward(
      farm,
      this.wallet.publicKey,
      rewardMint
    );

    console.log('locked reward', rewardMint.toBase58());

    return result;
  }

  async refreshFarmerWallet(farm, farmerIdentity) {
    const result = await this.refreshFarmer(farm, farmerIdentity);

    console.log('refreshed farmer', farmerIdentity.toBase58());

    return result;
  }

  async treasuryPayoutWallet(
    farm,
    destination,
    lamports
  ) {
    const result = await this.payoutFromTreasury(
      farm,
      this.wallet.publicKey,
      destination,
      new BN(lamports)
    );

    console.log('paid out from treasury', lamports);

    return result;
  }

  async initFarmerWallet(farm) {
    const result = await this.initFarmer(
      farm,
      this.wallet.publicKey,
      this.wallet.publicKey
    );

    console.log('initialized new farmer', this.wallet.publicKey.toBase58());

    return result;
  }

  async stakeWallet(farm) {
    const result = await this.stake(farm, this.wallet.publicKey);

    console.log('begun staking for farmer', this.wallet.publicKey.toBase58());

    return result;
  }

  async unstakeWallet(farm) {
    const result = await this.unstake(farm, this.wallet.publicKey);

    console.log('ended staking for farmer', this.wallet.publicKey.toBase58());

    return result;
  }

  async claimWallet(
    farm,
    rewardAMint,
    rewardBMint
  ) {
    const result = await this.claim(
      farm,
      this.wallet.publicKey,
      rewardAMint,
      rewardBMint
    );

    console.log('claimed rewards for farmer', this.wallet.publicKey.toBase58());

    return result;
  }

  async flashDepositWallet(
    farm,
    gemAmount,
    gemMint,
    gemSource,
    creator
  ) {
    const farmAcc = await this.fetchFarmAcc(farm);
    const bank = farmAcc.bank;

    const [mintProof, bump] = await this.findWhitelistProofPDA(bank, gemMint);
    const [creatorProof, bump2] = await this.findWhitelistProofPDA(
      bank,
      creator
    );
    const metadata = await programs.metadata.Metadata.getPDA(gemMint);

    const result = await this.flashDeposit(
      farm,
      this.wallet.publicKey,
      new BN(gemAmount),
      gemMint,
      gemSource,
      mintProof,
      metadata,
      creatorProof
    );

    console.log('added extra gem for farmer', this.wallet.publicKey.toBase58());

    return result;
  }

  async addToBankWhitelistWallet(
    farm,
    addressToWhitelist,
    whitelistType
  ) {
    const result = await this.addToBankWhitelist(
      farm,
      this.wallet.publicKey,
      addressToWhitelist,
      whitelistType
    );

    console.log(`${addressToWhitelist.toBase58()} added to whitelist`);

    return result;
  }

  async removeFromBankWhitelistWallet(
    farm,
    addressToRemove
  ) {
    const result = await this.removeFromBankWhitelist(
      farm,
      this.wallet.publicKey,
      addressToRemove
    );

    console.log(`${addressToRemove.toBase58()} removed from whitelist`);

    return result;
  }
}