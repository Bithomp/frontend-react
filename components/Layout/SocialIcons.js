import { xahauNetwork } from '../../utils'

import { FaXTwitter } from 'react-icons/fa6'
import { FaDiscord } from 'react-icons/fa6'
import { FaYoutube } from 'react-icons/fa6'
import { FaLinkedin } from 'react-icons/fa6'
import { FaInstagram } from 'react-icons/fa6'
import { FaGithub } from 'react-icons/fa6'
//import { FaTelegram } from 'react-icons/fa6'
import { FaFacebook } from 'react-icons/fa6'
import { FaTiktok } from 'react-icons/fa6'
import { FaMedium } from 'react-icons/fa6'

export default function SocialIcons() {
  return (
    <div className="social-icons">
      <a href={'https://x.com/' + (xahauNetwork ? 'XahauExplorer' : 'xrplexplorer')} aria-label="X link">
        <FaXTwitter />
      </a>
      <a href="https://discord.gg/ZahGJ29WEs" area-label="Discord link">
        <FaDiscord />
      </a>
      <a href="https://tiktok.com/@bithomp" area-label="Tiktok link">
        <FaTiktok />
      </a>
      <a href="https://youtube.com/@bithomp" area-label="Youtube link">
        <FaYoutube />
      </a>
      <a href="https://linkedin.com/company/bithomp" area-label="Linkedin link">
        <FaLinkedin />
      </a>
      <a href="https://www.instagram.com/bithomp/" area-label="Instagram link">
        <FaInstagram />
      </a>
      {/*
      <a href="https://t.me/bithomp" area-label="Telegram link">
        <FaTelegram />
      </a>
      */}
      {!xahauNetwork && (
        <a href="https://www.facebook.com/xrpexplorer/" area-label="Facebook link">
          <FaFacebook />
        </a>
      )}
      {!xahauNetwork && (
        <a href="https://medium.com/@xrplexplorer" area-label="Medium link">
          <FaMedium />
        </a>
      )}
      <a href="https://github.com/Bithomp" area-label="Github link">
        <FaGithub />
      </a>
    </div>
  )
}
