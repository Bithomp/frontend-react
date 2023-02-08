import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import useLocalStorage from 'use-local-storage';
import axios from 'axios';

import Header from './components/Header';
import Footer from './components/Footer';
import SignForm from "./components/SignForm";
import ScrollToTop from "./components/ScrollToTop";
import BackgroundImage from './components/BackgroundImage';

import Home from './screens/Home';
import Username from './screens/Username';
import Alerts from "./screens/Alerts";
import Developer from "./screens/Developer";
import Domains from './screens/Domains';
import Ledger from './screens/Ledger';
import LastLedgerInformation from './screens/LastLedgerInformation';
import NftVolumes from "./screens/NFT/NftVolumes";
import Nft from './screens/NFT/Nft';
import Nfts from './screens/NFT/Nfts';
import NftOffer from "./screens/NFT/NftOffer";
import NftOffers from "./screens/NFT/NftOffers";
import NftSales from './screens/NFT/NftSales';
import NftDistribution from './screens/NFT/NftDistribution';
import NftStatistics from './screens/NFT/NftStatistics';
import Validators from './screens/Validators';
import Amendments from './screens/Amendments';
import Genesis from "./screens/Genesis";
import Disclaimer from './screens/Disclaimer';
import PrivacyPolicy from './screens/PrivacyPolicy';
import TermsAndConditions from './screens/TermsAndConditions';
import CustomerSupport from "./screens/CustomerSupport";
import Press from "./screens/Press";
import Donate from "./screens/Donate";
import PageNotFound from './screens/PageNotFound';
import Redirect from './screens/Redirect';

import { network, devNet, server } from './utils';

export default function App() {
  const defaultDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [theme, setTheme] = useLocalStorage('theme', defaultDark ? 'dark' : 'light');
  const [account, setAccount] = useLocalStorage('account', null);
  const [signRequest, setSignRequest] = useState(false);

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
    axios.defaults.headers.common['x-bithomp-token'] = process.env.REACT_APP_BITHOMP_API_TEST_KEY;
    axios.defaults.baseURL = server + '/api/';
  } else {
    axios.defaults.baseURL = server + '/api/cors/';
  }

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
        <ScrollToTop />
        {signRequest &&
          <SignForm
            setSignRequest={setSignRequest}
            setAccount={setAccount}
            signRequest={signRequest}
          />
        }
        <Routes>
          <Route path="/" element={<Home theme={theme} devNet={devNet} />} />
          <Route path="/index.html" element={<Home theme={theme} devNet={devNet} />} />
          <Route
            path="/username"
            element={<Username setSignRequest={setSignRequest} account={account} setAccount={setAccount} signOut={signOut} />}
          />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/developer" element={<Developer />} />
          <Route path="/domains" element={<Domains />} />
          <Route path="/ledger/" element={<Ledger />}>
            <Route path="/ledger/:ledgerIndex" element={<Ledger />} />
          </Route>
          <Route path="/last-ledger-information" element={<LastLedgerInformation />} />
          <Route path="/nft/" element={<Nft setSignRequest={setSignRequest} signRequest={signRequest} account={account} />}>
            <Route path="/nft/:id" element={<Nft setSignRequest={setSignRequest} signRequest={signRequest} account={account} />} />
          </Route>
          <Route path="/nfts/" element={<Nfts />}>
            <Route path="/nfts/:id" element={<Nfts />} />
          </Route>
          <Route path="/nft-explorer" element={<Nfts />} />
          <Route path="/nft-offer/" element={<NftOffer />}>
            <Route path="/nft-offer/:id" element={<NftOffer />} />
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
          <Route path="/validators" element={<Validators />} />
          <Route path="/amendments" element={<Amendments />} />
          <Route path="/genesis" element={<Genesis />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/customer-support" element={<CustomerSupport />} />
          <Route path="/press" element={<Press />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/error" element={<PageNotFound />} />
          <Route path="*" element={<Redirect />} />
        </Routes>
      </div>
      <BackgroundImage />
      <Footer />
    </div>
  );
};
