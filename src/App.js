import { Routes, Route } from "react-router-dom";
import useLocalStorage from 'use-local-storage';

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
