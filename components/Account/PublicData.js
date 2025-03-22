import { useTranslation } from 'next-i18next'

import {
  AddressWithIconFilled,
  fullDateAndTime,
  fullNiceNumber,
  niceNumber,
  timeFromNow,
  txIdLink
} from '../../utils/format'
import { devNet, nativeCurrency, networks, server } from '../../utils'

import CopyButton from '../UI/CopyButton'

import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaMedium,
  FaReddit,
  FaTelegram,
  FaYoutube,
  FaXTwitter
} from 'react-icons/fa6'
import Link from 'next/link'

import LinkIcon from '../../public/images/link.svg'
import { LinkTx } from '../../utils/links'

export default function PublicData({ data }) {
  const { t, i18n } = useTranslation()

  if (!data?.inception) return ''

  const socialAccountsNode = data.service?.socialAccounts ? (
    <div className="social-icons">
      {data.service.socialAccounts.twitter && (
        <a href={'https://x.com/' + data.service.socialAccounts.twitter} aria-label="X" target="_blank" rel="noopener">
          <FaXTwitter />
        </a>
      )}
      {data.service.socialAccounts.youtube && (
        <a
          href={'https://youtube.com/' + data.service.socialAccounts.youtube}
          aria-label="Youtube"
          target="_blank"
          rel="noopener"
        >
          <FaYoutube />
        </a>
      )}
      {data.service.socialAccounts.linkedin && (
        <a
          href={'https://linkedin.com/company/' + data.service.socialAccounts.linkedin + '/'}
          aria-label="Linkedin"
          target="_blank"
          rel="noopener"
        >
          <FaLinkedin />
        </a>
      )}
      {data.service.socialAccounts.instagram && (
        <a
          href={'https://www.instagram.com/' + data.service.socialAccounts.instagram + '/'}
          aria-label="Instagram"
          target="_blank"
          rel="noopener"
        >
          <FaInstagram />
        </a>
      )}
      {data.service.socialAccounts.telegram && (
        <a
          href={'https://t.me/' + data.service.socialAccounts.telegram}
          aria-label="Telegram"
          target="_blank"
          rel="noopener"
        >
          <FaTelegram />
        </a>
      )}
      {data.service.socialAccounts.facebook && (
        <a
          href={'https://www.facebook.com/' + data.service.socialAccounts.facebook + '/'}
          aria-label="Facebook"
          target="_blank"
          rel="noopener"
        >
          <FaFacebook />
        </a>
      )}
      {data.service.socialAccounts.medium && (
        <a
          href={'https://medium.com/' + data.service.socialAccounts.medium}
          aria-label="Medium"
          target="_blank"
          rel="noopener"
        >
          <FaMedium />
        </a>
      )}
      {data.service.socialAccounts.reddit && (
        <a
          href={'https://www.reddit.com/' + data.service.socialAccounts.reddit + '/'}
          aria-label="Reddit"
          target="_blank"
          rel="noopener"
        >
          <FaReddit />
        </a>
      )}
    </div>
  ) : (
    ''
  )

  const accountNameTr = ({ data, mobile }) => {
    let output = []

    const blacklisted = data.blacklist?.blacklisted

    if (data.ledgerInfo?.activated) {
      //show username registration link and usernsmes only for active accounts
      if (data.username) {
        const usernameNode = (
          <span className={'blue bold' + (blacklisted ? ' strike' : '')}>
            {data.username} <CopyButton text={server + '/account/' + data.username}></CopyButton>
          </span>
        )
        if (mobile) {
          output.push(
            <p key="0">
              <span className="grey">{t('table.username')}</span> {usernameNode}
            </p>
          )
        } else {
          output.push(
            <tr key="0">
              <td>{t('table.username')}</td>
              <td>{usernameNode}</td>
            </tr>
          )
        }
      } else if (!data.service?.name && !blacklisted) {
        //if no username and no service - show register link
        const regsiterUsernameNode = <Link href={'/username?address=' + data.address}>register</Link>
        if (mobile) {
          output.push(
            <p key="0">
              <span className="grey">{t('table.username')}</span> {regsiterUsernameNode}
            </p>
          )
        } else {
          output.push(
            <tr key="0">
              <td>{t('table.username')}</td>
              <td>{regsiterUsernameNode}</td>
            </tr>
          )
        }
      }
    }

    let thirdPartyService = null
    if (data.xamanMeta?.thirdPartyProfiles?.length) {
      for (let i = 0; i < data.xamanMeta.thirdPartyProfiles.length; i++) {
        const excludeList = ['xumm.app', 'xaman.app', 'xrpl', 'xrplexplorer.com', 'bithomp.com']
        if (!excludeList.includes(data.xamanMeta.thirdPartyProfiles[i].source)) {
          thirdPartyService = data.xamanMeta.thirdPartyProfiles[i].accountAlias
          break
        }
      }
    }

    if (data.service?.name || thirdPartyService) {
      const serviceNode = <span className="green bold">{data.service?.name}</span>
      const thirdPartyServiceNode = (
        <>
          <span className="bold">{thirdPartyService}</span> (unverified)
        </>
      )
      if (mobile) {
        output.push(
          <p key="1">
            <span className="grey">Service name</span> {data.service?.name ? serviceNode : thirdPartyServiceNode}
          </p>
        )
      } else {
        output.push(
          <tr key="1">
            <td>Service name</td>
            {data.service?.name ? <td>{serviceNode}</td> : <td>{thirdPartyServiceNode}</td>}
          </tr>
        )
      }
    }

    if (data.nickname) {
      const nicknameNode = <span className="orange bold">{data.nickname}</span>
      if (mobile) {
        output.push(
          <p key="2">
            <span className="grey">Nickname</span> {nicknameNode}
          </p>
        )
      } else {
        output.push(
          <tr key="2">
            <td>Nickname</td>
            <td>{nicknameNode}</td>
          </tr>
        )
      }
    }

    return output
  }

  const showPaystring =
    data.payString &&
    !data.ledgerInfo?.requireDestTag &&
    !data.ledgerInfo?.blackholed &&
    !data.blacklist?.blacklisted &&
    !data.service

  const payStringNode = (
    <span className="blue">
      {data.payString} <CopyButton text={data.payString} />
    </span>
  )

  const webAddressNode = data.service?.domain ? (
    <a href={'https://' + data.service.domain} className="bold" target="_blank" rel="noopener nofollow">
      {data.service.domain}
    </a>
  ) : (
    ''
  )

  const genesisNode = (
    <span className="bold">
      {niceNumber(data.initialBalance)} {nativeCurrency}
    </span>
  )

  const importedFromNode = (
    <a href={(devNet ? networks.testnet.server : networks.mainnet.server) + '/account/' + data.address}>
      {data.address}
    </a>
  )

  const activatedByNode = (
    <AddressWithIconFilled
      data={{
        address: data.parent?.address,
        addressDetails: {
          username: data.parent?.username,
          service: data.parent?.service?.name || data.parent?.service?.domain
        }
      }}
    />
  )

  const activatedWithNode = (
    <>
      {fullNiceNumber(data.initialBalance)} {nativeCurrency}
    </>
  )

  const flareClaimNode = data.flare?.spark ? <>{fullNiceNumber(data.flare.spark * 0.15)} FLR</> : ''

  const songbirdClaimNode = data.flare?.songbird ? <>{fullNiceNumber(data.flare.songbird)} SGB</> : ''

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">Public data</th>
          </tr>
        </thead>
        <tbody>
          {data.service?.socialAccounts && (
            <tr>
              <td>Social accounts</td>
              <td>{socialAccountsNode}</td>
            </tr>
          )}

          {accountNameTr({ data })}
          {data.bithomp?.bithompPro && (
            <tr>
              <td>Bithomp Pro</td>
              <td className="bold">Activated ❤️</td>
            </tr>
          )}
          {showPaystring && (
            <tr>
              <td>PayString</td>
              <td>{payStringNode}</td>
            </tr>
          )}
          {data.service?.domain && data.ledgerInfo?.domain !== data.service.domain && (
            <tr>
              <td>Web address</td>
              <td>{webAddressNode}</td>
            </tr>
          )}
          <tr>
            <td>Activated</td>
            <td>
              {timeFromNow(data.inception, i18n)} ({fullDateAndTime(data.inception)})
              {data?.inceptionTxHash ? <> {txIdLink(data.inceptionTxHash, 0)}</> : ''}
            </td>
          </tr>
          {data.genesis && (
            <tr>
              <td>Genesis balance</td>
              <td>{genesisNode}</td>
            </tr>
          )}
          {data.parent?.address === data.address ? (
            <tr>
              <td>
                Imported from <span className="bold">XRPL</span>
              </td>
              <td>{importedFromNode}</td>
            </tr>
          ) : (
            !data.genesis && (
              <tr>
                <td>Activated by</td>
                <td>{activatedByNode}</td>
              </tr>
            )
          )}
          {!data.genesis && data.initialBalance && (
            <tr>
              <td>Activated with</td>
              <td>{activatedWithNode}</td>
            </tr>
          )}
          {data.flare?.spark && (
            <>
              <tr>
                <td>Flare address</td>
                <td>
                  <a href={'https://flarescan.com/address/' + data.flare.address} target="_blank" rel="noopener">
                    {data.flare.address}
                  </a>
                </td>
              </tr>
              <tr>
                <td>Flare claim</td>
                <td>{flareClaimNode}</td>
              </tr>
              <tr>
                <td>Songbird address</td>
                <td>
                  <a
                    href={'https://songbird.flarescan.com/address/' + data.flare.address}
                    target="_blank"
                    rel="noopener"
                  >
                    {data.flare.address}
                  </a>
                </td>
              </tr>
              <tr>
                <td>Songbird claim</td>
                <td>{songbirdClaimNode}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <br />
        <center>{'Public data'.toUpperCase()}</center>
        {data.service?.socialAccounts && (
          <div className="center">
            <br />
            {socialAccountsNode}
          </div>
        )}
        {accountNameTr({ data, mobile: true })}
        {data.bithomp?.bithompPro && (
          <p>
            <span className="grey">Bithomp Pro</span> <span className="bold">Activated ❤️</span>
          </p>
        )}
        {showPaystring && (
          <p>
            <span className="grey">PayString</span> {payStringNode}
          </p>
        )}
        {data.service?.domain && (
          <p>
            <span className="grey">Web address</span>
            <br />
            {webAddressNode}
          </p>
        )}
        {data.genesis && (
          <p>
            <span className="grey">Genesis balance</span>
            <br />
            {genesisNode}
          </p>
        )}
        {data.parent?.address === data.address ? (
          <p>
            <span className="grey">Imported</span> {timeFromNow(data.inception, i18n)}{' '}
            <span className="grey">
              from <span className="bold">XRPL</span>
            </span>
            <br />
            {importedFromNode}
          </p>
        ) : (
          !data.genesis && (
            <>
              <p>
                <span className="grey">Activated </span>
                <LinkTx tx={data.inceptionTxHash}>{timeFromNow(data.inception, i18n)}</LinkTx>{' '}
                {data.initialBalance ? (
                  <>
                    <span className="grey">with</span> {activatedWithNode} <span className="grey">by</span>
                  </>
                ) : (
                  <span className="grey">by</span>
                )}
              </p>
              {data.initialBalance && activatedByNode}
              <br />
            </>
          )
        )}
        {data.flare?.spark && (
          <>
            <p>
              <span className="grey">Flare claim</span> {flareClaimNode}{' '}
              <a href={'https://flarescan.com/address/' + data.flare.address} target="_blank" rel="noopener">
                <LinkIcon />
              </a>
            </p>
            <p>
              <span className="grey">Songbird claim</span> {songbirdClaimNode}{' '}
              <a href={'https://songbird.flarescan.com/address/' + data.flare.address} target="_blank" rel="noopener">
                <LinkIcon />
              </a>
            </p>
          </>
        )}
      </div>
    </>
  )
}
