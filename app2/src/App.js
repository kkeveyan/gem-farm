import './App.css';
import { getNFTsByOwner, getNFTMetadataForMany } from './common/getNfts';
import { fetchFarn, fetchFarmer, stakerMover, endStaking, stakerMoreMover } from './common/staker';
import { populateVaultNFTs } from './common/getVaultNfts';
import { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import idl from './idl.json';
import env from "react-dotenv";
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { superUnstakeMover } from './common/unstaker';
import { claim, getRewards } from './common/claimer';
require('@solana/wallet-adapter-react-ui/styles.css');




const wallets = [
  /* view list of available wallets at https://github.com/solana-labs/wallet-adapter#wallets */
  new PhantomWalletAdapter(),
]


const opts = {
  preflightCommitment: "processed"
}
const programID = new PublicKey(env.farm_id);

function App() {
  const [value, setValue] = useState(null);
  const [farmerState, setFarmerState] = useState(null)
  const [stakedValue, setStakedValue] = useState(null)
  const [rewardValue, setRewardValue] = useState(null)
  const wallet = useWallet();

  async function getProvider() {
    /* create the provider and return it to the caller */
    /* network set to local network for now */
    const network = "https://api.devnet.solana.com";
    const connection = new Connection(network, opts.preflightCommitment);

    const provider = new Provider(
      connection, wallet, opts.preflightCommitment,
    );
    return provider;
  }

  async function claimRewards() {

    const network = "https://api.devnet.solana.com";
    const connection = new Connection(network, opts.preflightCommitment);
    const farm = await fetchFarn(connection, wallet)
    const claimResults = await claim(farm, connection, wallet)

  }

  async function refreshAll() {
    await getUnstakedNfts()
    await getStakedNfts()
    await getRewardA()
  }

  async function getRewardA() {
    const network = "https://api.devnet.solana.com";
    const connection = new Connection(network, opts.preflightCommitment);
    const farmerAcc = await fetchFarmer(connection, wallet)
    const diff = farmerAcc.farmerAcc.rewardA.accruedReward - farmerAcc.farmerAcc.rewardA.paidOutReward
    console.log("reward amount: ", diff.toString())
    const rewardA = diff.toString()
    setRewardValue(rewardA)
  }

  async function getUnstakedNfts() {
    const provider = await getProvider()
    const network = "https://api.devnet.solana.com";
    const connection = new Connection(network, opts.preflightCommitment);

    const providerPublicKey = new PublicKey(provider.wallet.publicKey)
    const nfts = await getNFTsByOwner(providerPublicKey, connection)
    const nftdata = await getNFTMetadataForMany(nfts, connection)
    for (let nft of nfts) {
      console.log(nft.onchainMetadata.data.name)
    }

    setValue(nftdata)
  }

  async function getStakedNfts() {
    // console.log("viewing staked nfts")
    // console.log(wallet.publicKey.toBase58())
    const network = "https://api.devnet.solana.com";
    const connection = new Connection(network, opts.preflightCommitment);

    const farmStarted = await fetchFarn(connection, wallet)
    console.log("started: ", farmStarted)
    const farmerStarted = await fetchFarmer(connection, wallet)
    console.log("started: ", farmerStarted)
    const gdrs = await populateVaultNFTs(connection, wallet)
    setFarmerState(farmerStarted.farmerState)
    setStakedValue(gdrs)
  }

  async function stakeNft(nft) {
    const network = "https://api.devnet.solana.com";
    const connection = new Connection(network, opts.preflightCommitment);
    console.log("staking nft", nft.onchainMetadata.mint)
    const stakeResult = await stakerMover(nft, connection, wallet)
    console.log(stakeResult)
    const farmerStarted = await fetchFarmer(connection, wallet)
    setFarmerState(farmerStarted.farmerState)
    await refreshAll()
  }

  async function stakeMoreNfts(nft) {
    const network = "https://api.devnet.solana.com";
    const connection = new Connection(network, opts.preflightCommitment);
    console.log("staking additional nft", nft.onchainMetadata.mint)
    const stakeResult = await stakerMoreMover(nft, connection, wallet)
    console.log(stakeResult)
    const farmerStarted = await fetchFarmer(connection, wallet)
    setFarmerState(farmerStarted.farmerState)
    await refreshAll()
  }

  async function withdrawStake(nfts) {
    const network = "https://api.devnet.solana.com";
    const connection = new Connection(network, opts.preflightCommitment);
    const endStakeResults = await superUnstakeMover(nfts, connection, wallet)
    console.log(endStakeResults)
    await refreshAll()
  }

  if (!wallet.connected) {
    /* If the user's wallet is not connected, display connect wallet button. */
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
        <WalletMultiButton />
      </div>
    )
  } else {
    return (
      <div className="App">
        <div>
          {
            (!value && !stakedValue) && (<p><button onClick={refreshAll}>Refresh NFTs</button></p>)
          }
          {/* {
            value && <button onClick={flip}>Flip the Switch</button>
          } */}
          {
            (value && farmerState === "unstaked") ? (
              <>
                <button onClick={refreshAll}>Refresh NFTs</button>
                <h2>Reward Value: {rewardValue}</h2>
                <button onClick={claimRewards}>Claim Rewards</button>
                <h2>Your Unstaked NFTs</h2>
                <div className="m-1 card flex justify-center">
                  <ul>
                    {value.map((value, index) => {
                      if (value.onchainMetadata.data.creators[0].address == env.creator_id || value.onchainMetadata.data.creators[0].address == env.creator_id2 || value.onchainMetadata.data.creators[0].address == env.creator_id3) {
                        return <p>
                          <img
                            src={value.externalMetadata.image}
                            alt={value.onchainMetadata.data.name}
                            width="150" height="150"
                          ></img>
                          <span><br />
                            <button onClick={() => stakeNft(value)}>Stake</button>
                          </span>
                        </p>
                      }
                    })}
                  </ul>
                </div>

              </>
            ) : (
              <h3></h3>
            )
          }
          {
            (farmerState == "staked" && stakedValue && !value) ? (
              <>
                <button onClick={refreshAll}>Refresh NFTs</button>
                <h2>Reward Value: {rewardValue}</h2>
                <button onClick={claimRewards}>Claim Rewards</button>
                {console.log("state: ", farmerState)}
                <h2>Your Staked NFTs</h2>
                <div>
                  <ul>
                    {stakedValue.map((stakedValue) => {
                      return <p>
                        <img src={stakedValue.externalMetadata.image}
                          alt={stakedValue.onchainMetadata.data.name}
                          width="150" height="150"></img>
                        <span><br /><button onClick={() => withdrawStake(stakedValue)}>Unstake</button></span>
                      </p>
                    })}
                  </ul>
                </div>
              </>
            ) : (
              <>
                <h2></h2>
                {console.log("state: ", farmerState)}
              </>

            )
          }
          {
            (farmerState == "staked" && stakedValue && value) ? (
              <>
                <button onClick={refreshAll}>Refresh NFTs</button>
                <h2>Reward Value: {rewardValue}</h2>
                <button onClick={claimRewards}>Claim Rewards</button>
                <h2>Your Unstaked NFTs</h2>
                <div className="m-1 card flex justify-center">
                  <ul>
                    {value.map((value, index) => {
                      if (value.onchainMetadata.data.creators[0].address == env.creator_id || value.onchainMetadata.data.creators[0].address == env.creator_id2 || value.onchainMetadata.data.creators[0].address == env.creator_id3) {
                        return <p>
                          <img
                            src={value.externalMetadata.image}
                            alt={value.onchainMetadata.data.name}
                            width="150" height="150"
                          ></img>
                          <span><br />
                            <button onClick={() => stakeMoreNfts(value)}>Stake</button>
                          </span>
                        </p>
                      }
                    })}
                  </ul>
                </div>
                {console.log("state: ", farmerState)}
                <h2>Your Staked NFTs</h2>
                <div>
                  <ul>
                    {stakedValue.map((stakedValue) => {
                      return <p>
                        <img src={stakedValue.externalMetadata.image}
                          alt={stakedValue.onchainMetadata.data.name}
                          width="150" height="150"></img>
                        <span><br /><button onClick={() => withdrawStake(stakedValue)}>Unstake</button></span>
                      </p>
                    })}
                  </ul>
                </div>
              </>
            ) : (
              <>
                <button onClick={refreshAll}>Refresh NFTs</button>
                <h2>No staked NFTs</h2>
                {console.log("state: ", farmerState)}
              </>

            )
          }
        </div>
      </div>
    );
  }
}

const AppWithProvider = () => (
  <ConnectionProvider endpoint="https://api.devnet.solana.com">
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <App />
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
)

export default AppWithProvider;
