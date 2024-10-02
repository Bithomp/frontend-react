import { xahauNetwork } from '../../utils'

import { FaXTwitter } from 'react-icons/fa6'
import { FaDiscord } from 'react-icons/fa6'
import { FaYoutube } from 'react-icons/fa6'
import { FaLinkedin } from 'react-icons/fa6'
import { FaInstagram } from 'react-icons/fa6'
import { FaReddit } from 'react-icons/fa6'
import { FaGithub } from 'react-icons/fa6'

export default function SocialIcons() {
  return (
    <div className="social-icons">
      <a href={'https://x.com/' + (xahauNetwork ? 'XahauExplorer' : 'xrplexplorer')}>
        <FaXTwitter />
      </a>
      <a href="https://discord.gg/ZahGJ29WEs">
        <FaDiscord />
      </a>
      <a href="https://youtube.com/@bithomp">
        <FaYoutube />
      </a>
      <a href="https://linkedin.com/company/bithomp">
        <FaLinkedin />
      </a>
      <a href="https://www.instagram.com/bithomp/">
        <FaInstagram />
      </a>
      <a href="https://www.reddit.com/r/bithomp/">
        <FaReddit />
      </a>
      <a href="https://github.com/Bithomp">
        <FaGithub />
      </a>
    </div>
  )
}
