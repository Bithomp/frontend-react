import logo from "../assets/images/logo.svg";

function Footer() {

  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="footer">
        <div className="footer-menu">
          <div className="footer-menu-column">
            <span className="footer-menu-header">Services</span>
            <a href="/username">Username registration</a>
            <a href="/alerts">XRP price alerts</a>
            <a href="https://docs.bithomp.com">API</a>
          </div>
          <div className="footer-menu-column">
            <span className="footer-menu-header">Tools</span>
            <a href="/submit/">Submit offline transaction</a>
            <a href="https://test.bithomp.com">Bithomp (Testnet)</a>
            <a href="https://xls20.bithomp.com">Bithomp (XLS-20)</a>
            <a href="https://hooks.bithomp.com">Bithomp (Hooks)</a>
            <a href="https://beta.bithomp.com">Bithomp (Hooks v2)</a>
          </div>
          <div className="footer-menu-column">
            <span className="footer-menu-header">Legal</span>
            <a href="/disclaimer">Disclaimer</a>
            <a href="/privacypolicy">Privacy policy</a>
            <a href="/termsofservice">Terms of service</a>
            <a href="/gdpr">GDPR</a>
          </div>
          <div className="footer-menu-column">
            <span className="footer-menu-header">Bithomp</span>
            <a href="/contact">Contact</a>
            <a href="/midiakit">Media kit</a>
          </div>
        </div>
        <div className="footer-brand">
          <img src={logo} className="footer-logo" alt="logo" />
          <div className="footer-brand-text">
            Copyright © {year} Bithomp AB<br/>
            Vasagatan 16, 111 20 Stockholm<br/>
            Organization number: 559342-2867
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
