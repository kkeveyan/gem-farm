import './App.css';
import { getNFTsByOwner, getNFTMetadataForMany } from './common/getNfts';
import { fetchFarn, fetchFarmer, stakerMover, endStaking } from './common/staker';

import { useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import idl from './idl.json';
import env from "react-dotenv";
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
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
    // console.log("started: ", farmStarted)
    const farmerStarted = await fetchFarmer(connection, wallet)
    // console.log("started: ", farmerStarted)
    setFarmerState(farmerStarted.farmerState)
  }

  async function stakeNft(nft) {
    const network = "https://api.devnet.solana.com";
    const connection = new Connection(network, opts.preflightCommitment);
    console.log("staking nft", nft.onchainMetadata.mint)
    const stakeResult = await stakerMover(nft, connection, wallet)
    console.log(stakeResult)
    const farmerStarted = await fetchFarmer(connection, wallet)
    setFarmerState(farmerStarted.farmerState)
  }

  async function stopStake() {
    const network = "https://api.devnet.solana.com";
    const connection = new Connection(network, opts.preflightCommitment);
    const endStakeResults = await endStaking(connection, wallet)
    console.log(endStakeResults)
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
            !value && (<p><button onClick={getUnstakedNfts}>Retrieve Unstaked NFTs</button><button onClick={getStakedNfts}>Get Staked NFTs</button></p>)
          }
          {/* {
            value && <button onClick={flip}>Flip the Switch</button>
          } */}
          {
            value ? (
              <>
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
                <button onClick={getStakedNfts}>Get Staked</button><button onClick={getUnstakedNfts}>Get Unstaked</button>
              </>
            ) : (
              <h3>Nothing to display</h3>
            )
          }
          {
            farmerState == "staked" ? (
              <>
                {console.log("state: ", farmerState)}
                <h2>Your Staked NFTs</h2>
                <button onClick={stopStake}>Stop Staking</button>
              </>
            ) : (
              <>
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
