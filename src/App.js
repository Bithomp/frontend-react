import useLocalStorage from 'use-local-storage';

import Header from './components/Header';
import Body from './components/Body';
import Footer from './components/Footer';

function App() {
  const defaultDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [theme, setTheme] = useLocalStorage('theme', defaultDark ? 'dark' : 'light');

  const switchTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }

  return (
    <div data-theme={theme} className="body">
      <Header theme={theme} switchTheme={switchTheme} />
      <div className="content">
        <Body />
      </div>
      <Footer />
    </div>
  );
}

export default App;
