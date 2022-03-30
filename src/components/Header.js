import logo from '../assets/images/logo.svg';

function Header({theme, switchTheme}) {
  return (
    <header>
      <img src={logo} className="header-logo" alt="logo" />
      <div className="header-menu-left">
        <a href="/explorer/">Explorer</a>
        <div className="menu-dropdown">
          <button className="menu-dropdown-button">Services</button>
          <div className="menu-dropdown-content">
            <a href="/username">Username registartion</a>
            <a href="/alerts">XRPL Price Alerts</a>
            <a href="https://docs.bithomp.com">API</a>
          </div>
        </div>
        <div className="menu-dropdown">
          <button className="menu-dropdown-button">Tools</button>
          <div className="menu-dropdown-content">
            <a href="/submit/">Submit offline transaction</a>
            <a href="https://test.bithomp.com">Bithomp (Testnet)</a>
            <a href="https://xls20.bithomp.com">Bithomp (XLS-20)</a>
            <a href="https://hooks.bithomp.com">Bithomp (Hooks)</a>
            <a href="https://beta.bithomp.com">Bithomp (Hooks v2)</a>
          </div>
        </div>
        <a href="/statistics">XRPL</a>
      </div>
      <div className="header-menu-right">
        <a href="/explorer/?hwlogin">Sign in</a>
        <button onClick={switchTheme}>switch to {theme === 'light' ? 'dark' : 'light'}</button>
      </div>
      <div className="header-under"></div>
    </header>
  );
}

export default Header;
