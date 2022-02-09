import './App.css';
import { getNFTsByOwner, getNFTMetadataForMany } from './common/getNfts';
import { set } from '@project-serum/anchor/dist/cjs/utils/features';
import { useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import idl from './idl.json';
import env from "react-dotenv";
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
require('@solana/wallet-adapter-react-ui/styles.css');
import { depositNftsOnChain, freshStart } from './common/staker'


const wallets = [
  /* view list of available wallets at https://github.com/solana-labs/wallet-adapter#wallets */
  new PhantomWalletAdapter(),
]

const { SystemProgram, Keypair } = web3;
/* create an account  */
const baseAccount = Keypair.generate();
const opts = {
  preflightCommitment: "processed"
}
const programID = new PublicKey(env.farm_id);

function App() {
  const [value, setValue] = useState(null);
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
    console.log("viewing staked nfts")
    const provider = await getProvider()
    const network = "https://api.devnet.solana.com";
    const connection = new Connection(network, opts.preflightCommitment);
    const providerPublicKey = new PublicKey(provider.wallet.publicKey)
    const started = await freshStart(wallet, connection)
    console.log(started)
  }

  async function stakeNft(nft) {
    console.log("staking nft", nft.onchainMetadata.mint)
    const txn = await depositNftsOnChain(nft)
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
                <h2>Your NFTs</h2>
                <div className="m-1 card flex justify-center">
                  <ul>
                    {value.map((value, index) => {
                      if (value.onchainMetadata.data.creators[0].address == env.creator_id) {
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
              <h3>Retrieve Your Unstaked NFTs</h3>
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
