import { Routes, Route } from "react-router-dom";
import useLocalStorage from 'use-local-storage';
import axios from 'axios';

import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from "./components/ScrollToTop";

import PageNotFound from './screens/PageNotFound';
import Home from './screens/Home';
import Username from './screens/Username';
import LastLedgerInformation from './screens/LastLedgerInformation';
import Disclaimer from './screens/Disclaimer';
import PrivacyPolicy from './screens/PrivacyPolicy';
import TermsAndConditions from './screens/TermsAndConditions';
import CustomerSupport from "./screens/CustomerSupport";

import { renderToStaticMarkup } from 'react-dom/server';
import BackgroundImage from './components/BackgroundImage';

export default function App() {
  const defaultDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [theme, setTheme] = useLocalStorage('theme', defaultDark ? 'dark' : 'light');

  const switchTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }

  const network = process.env.REACT_APP_NETWORK_NAME ? process.env.REACT_APP_NETWORK_NAME : "mainnet";
  const devNet = ['mainnet', 'local'].includes(network) ? false : network;

  let server = "https://test.bithomp.com";

  switch (network) {
    case 'mainnet':
      server = "https://bithomp.com";
      break;
    case 'testnet':
      server = "https://test.bithomp.com";
      break;
    case 'hooks':
      server = "https://hooks.bithomp.com";
      break;
    case 'beta':
      server = "https://beta.bithomp.com";
      break;
    case 'xls20':
      server = "https://xls20.bithomp.com";
      break;
    case 'local':
      server = "https://test.bithomp.com";
      break;
    default:
      break;
  }

  if (process.env.NODE_ENV === 'development') {
    axios.defaults.headers.common['x-bithomp-token'] = process.env.REACT_APP_BITHOMP_API_TEST_KEY;
    axios.defaults.baseURL = server + '/api/';
  } else {
    axios.defaults.baseURL = server + '/api/cors/';
  }

  const backgroundText = devNet ? devNet : '';
  const svgString = encodeURIComponent(renderToStaticMarkup(<BackgroundImage network={backgroundText.toUpperCase()} />));

  return (
    <div data-theme={theme} className="body" data-network={network}>
      <Header theme={theme} switchTheme={switchTheme} devNet={devNet} />
      <div className="content">
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home theme={theme} devNet={devNet} />} />
          <Route path="/username" element={<Username server={server} />} />
          <Route path="/last-ledger-information" element={<LastLedgerInformation server={server} />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/customer-support" element={<CustomerSupport />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </div>
      <div className="background" style={{ backgroundImage: `url("data:image/svg+xml,${svgString}")` }}></div>
      <Footer devNet={devNet} />
    </div>
  );
};
