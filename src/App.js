import { Routes, Route } from "react-router-dom";
import useLocalStorage from 'use-local-storage';
import axios from 'axios';

import Header from './components/Header';
import Footer from './components/Footer';

import Home from './screens/Home';
import About from './screens/About';

function App() {
  const defaultDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [theme, setTheme] = useLocalStorage('theme', defaultDark ? 'dark' : 'light');

  const switchTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }

  const network = process.env.REACT_APP_NETWORK_NAME ? process.env.REACT_APP_NETWORK_NAME : "mainnet";

  let baseApi = "https://test.bithomp.com/api/";

  switch(network) {
    case 'mainnet':
      baseApi = "https://bithomp.com/api/";
      break;
    case 'testnet':
      baseApi = "https://test.bithomp.com/api/";
      break;
    case 'hooks':
      baseApi = "https://hooks.bithomp.com/api/";
      break;
    case 'beta':
      baseApi = "https://beta.bithomp.com/api/";
      break;
    case 'xls20':
      baseApi = "https://xls20.bithomp.com/api/";
      break;
    case 'local':
      baseApi = "https://test.bithomp.com/api/";
      break;
  }

  if (process.env.NODE_ENV === 'development') {
    axios.defaults.headers.common['x-bithomp-token'] = process.env.REACT_APP_BITHOMP_API_TEST_KEY;
    axios.defaults.baseURL = baseApi;
  } else {
    axios.defaults.baseURL = baseApi + '/cors/';
  }

  return (
    <div data-theme={theme} className="body" data-network={network}>
      <Header theme={theme} switchTheme={switchTheme} />
      <div className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

export default App;
