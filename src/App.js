import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import useLocalStorage from 'use-local-storage';
import axios from 'axios';

import Header from '../components/Layout/Header';
import Footer from '../components/components/Footer';
import BackgroundImage from '../components/Layout/BackgroundImage';

import Username from './screens/Username';
import Nfts from '../pages/nfts/[[...id]]';

import { network, server } from './utils';

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
    axios.defaults.headers.common['x-bithomp-token'] = process.env.NEXT_PUBLIC_BITHOMP_API_TEST_KEY;
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
        <Routes>
          <Route
            path="/username"
            element={<Username setSignRequest={setSignRequest} account={account} setAccount={setAccount} signOut={signOut} />}
          />

          <Route path="/nfts/" element={<Nfts signRequest={signRequest} />}>
            <Route path="/nfts/:id" element={<Nfts />} />
          </Route>

          <Route path="/nft-explorer" element={<Nfts />} />

        </Routes>
      </div>
      <BackgroundImage />
      <Footer />
    </div>
  );
};
