import logo from "../assets/images/logo.svg";
import twitter from "../assets/images/twitter.svg";
import youtube from "../assets/images/youtube.svg";
import instagram from "../assets/images/instagram.svg";
import reddit from "../assets/images/reddit.svg";
import github from "../assets/images/github.svg";

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
            Copyright © {year} Bithomp AB<br />
            Vasagatan 16, 111 20 Stockholm<br />
            Organization number: 559342-2867
          </div>
        </div>
        <div className="footer-social">
          <a href="https://twitter.com/bithomp"><img src={twitter} className="footer-social-icon" alt="twitter" /></a>
          <a href="https://www.youtube.com/channel/UCTvrMnG-Tpqi5FN9zO7GcWw"><img src={youtube} className="footer-social-icon" alt="youtube" /></a>
          <a href="https://www.instagram.com/bithomp/"><img src={instagram} className="footer-social-icon" alt="instagram" /></a>
          <a href="https://www.reddit.com/user/bithomp/"><img src={reddit} className="footer-social-icon" alt="reddit" /></a>
          <a href="https://github.com/Bithomp"><img src={github} className="footer-social-icon" alt="github" /></a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
