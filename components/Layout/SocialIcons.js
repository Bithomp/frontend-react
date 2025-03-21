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
      <a href={'https://x.com/' + (xahauNetwork ? 'XahauExplorer' : 'bithomp')} aria-label="X">
        <FaXTwitter />
      </a>
      <a href="https://discord.gg/ZahGJ29WEs" aria-label="Discord">
        <FaDiscord />
      </a>
      <a href="https://tiktok.com/@bithomp" aria-label="Tiktok">
        <FaTiktok />
      </a>
      <a href="https://youtube.com/@bithomp" aria-label="Youtube">
        <FaYoutube />
      </a>
      <a href={'https://linkedin.com/company/' + (xahauNetwork ? 'xahauexplorer' : 'bithomp')} aria-label="Linkedin">
        <FaLinkedin />
      </a>
      <a href={'https://www.instagram.com/' + (xahauNetwork ? 'xahauexplorer' : 'bithomp')} aria-label="Instagram">
        <FaInstagram />
      </a>
      {/*
      <a href="https://t.me/bithomp" aria-label="Telegram">
        <FaTelegram />
      </a>
      */}
      {!xahauNetwork && (
        <a href="https://www.facebook.com/xrpexplorer/" aria-label="Facebook">
          <FaFacebook />
        </a>
      )}
      {!xahauNetwork && (
        <a href="https://medium.com/@xrplexplorer" aria-label="Medium">
          <FaMedium />
        </a>
      )}
      <a href="https://github.com/Bithomp" aria-label="Github">
        <FaGithub />
      </a>
    </div>
  )
}
