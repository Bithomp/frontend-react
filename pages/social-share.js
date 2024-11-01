import Img from 'next/image'

import LogoAnimated from '../components/Layout/LogoAnimated'
import { server } from '../utils'

const space = 5
const iconStyle = { marginLeft: space + 'px', marginRight: space + 'px' }
const size = 60
const countButtons = 5
const spaceBetweenLogoAndButtons = 20
const logoHeight = 100
const countBigButtons = 2
const longButtonWidth = 42

export default function SocialSharePage() {
  const divStyle = {
    position: 'absolute',
    left: 'calc(50% - ' + ((countButtons * size) / 2 + countButtons * space) + 'px)',
    top:
      'calc(50% - ' +
      (size +
        spaceBetweenLogoAndButtons +
        logoHeight +
        (countBigButtons + 1) * spaceBetweenLogoAndButtons +
        longButtonWidth * countBigButtons) /
        2 +
      'px)'
  }

  return (
    <>
      <div style={divStyle}>
        <LogoAnimated />
        <div style={{ height: spaceBetweenLogoAndButtons + 'px' }}> </div>

        <a href={server} className="button-action wide center">
          Website
        </a>

        <div style={{ height: spaceBetweenLogoAndButtons + 'px' }}> </div>

        <a href="https://discord.com/invite/ZahGJ29WEs" className="button-action wide center">
          Join our Discord
        </a>

        <div style={{ height: spaceBetweenLogoAndButtons + 'px' }}> </div>

        <div>
          <a href="https://x.com/bithomp">
            <Img src="/images/social-share/x.svg" alt="x" width={size} height={size} style={iconStyle} />
          </a>
          <a href="https://www.instagram.com/bithomp/">
            <Img
              src="/images/social-share/instagram.svg"
              alt="instagram"
              width={size}
              height={size}
              style={iconStyle}
            />
          </a>
          <a href="https://www.linkedin.com/company/bithomp/">
            <Img src="/images/social-share/linkedIn.svg" alt="linkedIn" width={size} height={size} style={iconStyle} />
          </a>
          <a href="https://www.youtube.com/@bithomp">
            <Img src="/images/social-share/youTube.svg" alt="youTube" width={size} height={size} style={iconStyle} />
          </a>
        </div>
      </div>
    </>
  )
}
