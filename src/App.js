import { Routes, Route, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import useLocalStorage from 'use-local-storage';
import axios from 'axios';

import Header from '../components/Layout/Header';
import Footer from '../components/components/Footer';
import SignForm from "../components/SignForm";
import ScrollToTop from "../components/Layout/ScrollToTop";
import BackgroundImage from '../components/Layout/BackgroundImage';
import TopLinks from '../components/Layout/TopLinks';

import Username from './screens/Username';
import NftVolumes from "./screens/NFT/NftVolumes";
import Nft from './screens/NFT/Nft';
import Nfts from './screens/NFT/Nfts';
import NftOffer from "./screens/NFT/NftOffer";
import NftOffers from "./screens/NFT/NftOffers";
import NftSales from './screens/NFT/NftSales';
import NftDistribution from './screens/NFT/NftDistribution';
import NftStatistics from './screens/NFT/NftStatistics';
import Genesis from "./screens/Genesis";

import { network, server } from './utils';

export default function App() {
  const defaultDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [theme, setTheme] = useLocalStorage('theme', defaultDark ? 'dark' : 'light');
  const [account, setAccount] = useLocalStorage('account', null);
  const [signRequest, setSignRequest] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (theme === 'dark') {
      document.body.style.backgroundColor = '#1C1C1C'; //--background-footer
    } else {
      document.body.style.backgroundColor = '#333333';
    }
  }, [theme]);

  const switchTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }

  const signOut = () => {
    localStorage.removeItem('xummUserToken');
    setAccount(null);
  }

  if (process.env.NODE_ENV === 'development') {
    axios.defaults.headers.common['x-bithomp-token'] = process.env.NEXT_PUBLIC_BITHOMP_API_TEST_KEY;
    axios.defaults.baseURL = server + '/api/';
  } else {
    axios.defaults.baseURL = server + '/api/cors/';
  }

  const pagesWithNoTopAdds = ['/', '/username'];
  const showTopAdds = !pagesWithNoTopAdds.includes(location.pathname);

  return (
    <div data-theme={theme} className="body" data-network={network}>
      <Header
        theme={theme}
        switchTheme={switchTheme}
        setSignRequest={setSignRequest}
        account={account}
        signOut={signOut}
      />
      <div className="content">
        {showTopAdds && <TopLinks />}
        <ScrollToTop />
        {signRequest &&
          <SignForm
            setSignRequest={setSignRequest}
            setAccount={setAccount}
            signRequest={signRequest}
          />
        }
        <Routes>
          <Route
            path="/username"
            element={<Username setSignRequest={setSignRequest} account={account} setAccount={setAccount} signOut={signOut} />}
          />
          <Route path="/nft/" element={<Nft setSignRequest={setSignRequest} signRequest={signRequest} account={account} />}>
            <Route path="/nft/:id" element={<Nft setSignRequest={setSignRequest} signRequest={signRequest} account={account} />} />
          </Route>
          <Route path="/nfts/" element={<Nfts />}>
            <Route path="/nfts/:id" element={<Nfts />} />
          </Route>
          <Route path="/nft-explorer" element={<Nfts />} />
          <Route path="/nft-offer/" element={<NftOffer setSignRequest={setSignRequest} signRequest={signRequest} account={account} />}>
            <Route path="/nft-offer/:id" element={<NftOffer setSignRequest={setSignRequest} signRequest={signRequest} account={account} />} />
          </Route>
          <Route path="/nft-offers/" element={<NftOffers setSignRequest={setSignRequest} signRequest={signRequest} account={account} />}>
            <Route path="/nft-offers/:id" element={<NftOffers setSignRequest={setSignRequest} signRequest={signRequest} account={account} />} />
          </Route>
          <Route path="/nft-sales" element={<NftSales />} />
          <Route path="/latest-nft-sales" element={<NftSales />} />
          <Route path="/top-nft-sales" element={<NftSales />} />
          <Route path="/nft-distribution/" element={<NftDistribution />}>
            <Route path="/nft-distribution/:id" element={<NftDistribution />} />
          </Route>
          <Route path="/nft-volumes" element={<NftVolumes />} />
          <Route path="/nft-statistics" element={<NftStatistics />} />

          <Route path="/genesis" element={<Genesis />} />
        </Routes>
      </div>
      <BackgroundImage />
      <Footer />
    </div>
  );
};
