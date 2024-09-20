import { xahauNetwork } from '../../utils'

export default function SocialIcons() {
  return (
    <>
      <a href={'https://x.com/' + (xahauNetwork ? 'XahauExplorer' : 'xrplexplorer')}>
        <img src="/images/twitter.svg" className="footer-social-icon" alt="twitter" />
      </a>
      <a href="https://discord.gg/ZahGJ29WEs">
        <img src="/images/discord.svg" className="footer-social-icon" alt="discord" />
      </a>
      <a href="https://youtube.com/@bithomp">
        <img src="/images/youtube.svg" className="footer-social-icon" alt="youtube" />
      </a>
      <a href="https://linkedin.com/company/bithomp">
        <img src="/images/linkedin.svg" className="footer-social-icon" alt="linkedin" />
      </a>
      <a href="https://www.instagram.com/bithomp/">
        <img src="/images/instagram.svg" className="footer-social-icon" alt="instagram" />
      </a>
      <a href="https://www.reddit.com/r/bithomp/">
        <img src="/images/reddit.svg" className="footer-social-icon" alt="reddit" />
      </a>
      <a href="https://github.com/Bithomp">
        <img src="/images/github.svg" className="footer-social-icon" alt="github" />
      </a>
    </>
  )
}
