import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import useLocalStorage from 'use-local-storage';
import axios from 'axios';

import Header from './components/Header';
import Footer from './components/Footer';
import SignInForm from "./components/SignInForm";
import ScrollToTop from "./components/ScrollToTop";
import BackgroundImage from './components/BackgroundImage';

import Home from './screens/Home';
import Username from './screens/Username';
import Alerts from "./screens/Alerts";
import Developer from "./screens/Developer";
import LastLedgerInformation from './screens/LastLedgerInformation';
import NftStatistics from './screens/NftStatistics';
import Genesis from "./screens/Genesis";
import Disclaimer from './screens/Disclaimer';
import PrivacyPolicy from './screens/PrivacyPolicy';
import TermsAndConditions from './screens/TermsAndConditions';
import CustomerSupport from "./screens/CustomerSupport";
import Press from "./screens/Press";
import PageNotFound from './screens/PageNotFound';
import Redirect from './screens/Redirect';

import { network, devNet, server } from './utils';

export default function App() {
  const defaultDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [theme, setTheme] = useLocalStorage('theme', defaultDark ? 'dark' : 'light');
  const [signInFormOpen, setSignInFormOpen] = useState(false);

  const switchTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }

  if (process.env.NODE_ENV === 'development') {
    axios.defaults.headers.common['x-bithomp-token'] = process.env.REACT_APP_BITHOMP_API_TEST_KEY;
    axios.defaults.baseURL = server + '/api/';
  } else {
    axios.defaults.baseURL = server + '/api/cors/';
  }

  return (
    <div data-theme={theme} className="body" data-network={network}>
      <Header theme={theme} switchTheme={switchTheme} setSignInFormOpen={setSignInFormOpen} />
      <div className="content">
        <ScrollToTop />
        {signInFormOpen && <SignInForm setSignInFormOpen={setSignInFormOpen} />}
        <Routes>
          <Route path="/" element={<Home theme={theme} devNet={devNet} />} />
          <Route path="/index.html" element={<Home theme={theme} devNet={devNet} />} />
          <Route path="/username" element={<Username />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/developer" element={<Developer />} />
          <Route path="/last-ledger-information" element={<LastLedgerInformation />} />
          <Route path="/nft-statistics" element={<NftStatistics />} />
          <Route path="/genesis" element={<Genesis />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/customer-support" element={<CustomerSupport />} />
          <Route path="/press" element={<Press />} />
          <Route path="/error" element={<PageNotFound />} />
          <Route path="*" element={<Redirect />} />
        </Routes>
      </div>
      <BackgroundImage />
      <Footer />
    </div>
  );
};
