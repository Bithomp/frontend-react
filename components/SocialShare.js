import {
  FacebookShareButton,
  FacebookIcon,
  WhatsappShareButton,
  WhatsappIcon,
  LinkedinShareButton,
  LinkedinIcon,
  TelegramShareButton,
  TelegramIcon,
  WeiboShareButton,
  WeiboIcon,
  PinterestShareButton,
  PinterestIcon,
  TwitterShareButton,
  XIcon,
  RedditShareButton,
  RedditIcon,
  ViberShareButton,
  ViberIcon,
  LineShareButton,
  LineIcon,
  VKShareButton,
  VKIcon,
  TumblrShareButton,
  TumblrIcon,
  HatenaShareButton,
  HatenaIcon,
  InstapaperShareButton,
  InstapaperIcon,
  PocketShareButton,
  PocketIcon,
  WorkplaceShareButton,
  WorkplaceIcon
} from 'react-share'

import { network, xahauNetwork } from '../utils'
import { useIsMobile } from '../utils/mobile'

import CopyButton from './UI/CopyButton'

const iconStyle = { marginRight: '5px', marginTop: '3px' }

export default function SocialShare({ t, title, hashtag, description, image }) {
  const isMobile = useIsMobile()

  const networkText = network !== 'mainnet' ? ' (' + network + ')' : ''
  const source = 'Bithomp' + networkText
  const size = 32
  let url = ''
  if (typeof window !== 'undefined') {
    url = window.location.href
  }

  const networkHashtag = xahauNetwork ? 'Xahau' : 'XRPL'

  return (
    <table className="table-details">
      <thead>
        <tr>
          <th colSpan="100">
            {t('table.social-share')} <CopyButton text={url}></CopyButton>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <FacebookShareButton url={url} quote={title} hashtag={'#' + hashtag} style={iconStyle}>
              <FacebookIcon size={size} round />
            </FacebookShareButton>

            <WhatsappShareButton url={url} title={title} separator=" " style={iconStyle}>
              <WhatsappIcon size={size} round />
            </WhatsappShareButton>

            <LinkedinShareButton url={url} title={title} summary={description} source={source} style={iconStyle}>
              <LinkedinIcon size={size} round />
            </LinkedinShareButton>

            <TelegramShareButton url={url} title={title} style={iconStyle}>
              <TelegramIcon size={size} round />
            </TelegramShareButton>

            <WeiboShareButton url={url} title={title} image={image} style={iconStyle}>
              <WeiboIcon size={size} round />
            </WeiboShareButton>

            <PinterestShareButton url={url} description={description} media={image} style={iconStyle}>
              <PinterestIcon size={size} round />
            </PinterestShareButton>

            <TwitterShareButton
              url={url}
              title={title}
              via={xahauNetwork ? 'xahauexplorer' : 'bithomp'}
              hashtags={[hashtag, networkHashtag]}
              related={['bithomp', 'xrplexplorer', 'xahauexplorer', 'XRP_PriceAlerts']}
              style={iconStyle}
            >
              <XIcon size={size} round />
            </TwitterShareButton>

            <RedditShareButton url={url} title={title} style={iconStyle}>
              <RedditIcon size={size} round />
            </RedditShareButton>

            {isMobile && (
              <ViberShareButton url={url} title={title} separator=" " style={iconStyle}>
                <ViberIcon size={size} round />
              </ViberShareButton>
            )}

            <LineShareButton url={url} title={title} style={iconStyle}>
              <LineIcon size={size} round />
            </LineShareButton>

            <VKShareButton url={url} title={title} image={image} noParse={'false'} noVkLinks={true} style={iconStyle}>
              <VKIcon size={size} round />
            </VKShareButton>

            <TumblrShareButton
              url={url}
              title={title}
              caption={description}
              tags={[hashtag, networkHashtag]}
              posttype="link"
              style={iconStyle}
            >
              <TumblrIcon size={size} round />
            </TumblrShareButton>

            <HatenaShareButton url={url} title={title} style={iconStyle}>
              <HatenaIcon size={size} round />
            </HatenaShareButton>

            <InstapaperShareButton url={url} title={title} description={description} style={iconStyle}>
              <InstapaperIcon size={size} round />
            </InstapaperShareButton>

            <PocketShareButton url={url} title={title} style={iconStyle}>
              <PocketIcon size={size} round />
            </PocketShareButton>

            <WorkplaceShareButton url={url} quote={title} style={iconStyle} hashtag={hashtag}>
              <WorkplaceIcon size={size} round />
            </WorkplaceShareButton>
          </td>
        </tr>
      </tbody>
    </table>
  )
}
