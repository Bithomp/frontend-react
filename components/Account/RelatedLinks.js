import { i18n } from 'next-i18next'
import { network } from '../../utils'

export default function RelatedLinks({ data }) {
  const otherNetworksNode = (
    <>
      {network !== 'mainnet' && (
        <>
          <a href={'https://xrplexplorer.com/' + i18n.language + '/account/' + data?.address} rel="nofollow">
            XRPL
          </a>{' '}
          |{' '}
        </>
      )}
      {network !== 'testnet' && (
        <>
          <a href={'https://test.xrplexplorer.com/' + i18n.language + '/account/' + data?.address} rel="nofollow">
            XRPL Testnet
          </a>{' '}
          |{' '}
        </>
      )}
      {network !== 'devnet' && (
        <>
          <a href={'https://dev.xrplexplorer.com/' + i18n.language + '/account/' + data?.address} rel="nofollow">
            XRPL Devnet
          </a>{' '}
          |{' '}
        </>
      )}
      {network !== 'xahau' && (
        <>
          <a href={'https://xahauexplorer.com/' + i18n.language + '/account/' + data?.address} rel="nofollow">
            Xahau
          </a>{' '}
          |{' '}
        </>
      )}
      {network !== 'xahau-testnet' && (
        <>
          <a href={'https://test.xahauexplorer.com/' + i18n.language + '/account/' + data?.address} rel="nofollow">
            Xahau Testnet
          </a>
          {network !== 'xahau-jshooks' && ' | '}
        </>
      )}
      {network !== 'xahau-jshooks' && (
        <>
          <a href={'https://jshooks.xahauexplorer.com/' + i18n.language + '/account/' + data?.address} rel="nofollow">
            Xahau JS Hooks
          </a>
        </>
      )}
    </>
  )
  const otherExplorersNode = (
    <>
      {network === 'mainnet' && (
        <>
          <a href={'https://xrplexplorer.com/explorer/' + data?.address} rel="nofollow">
            Bithomp
          </a>{' '}
          (old view) |{' '}
          <a href={'https://livenet.xrpl.org/accounts/' + data?.address} rel="nofollow">
            XRPL.org
          </a>{' '}
          |{' '}
          <a href={'https://explorer.xrplf.org/' + data?.address} rel="nofollow">
            XRPLF
          </a>{' '}
          |{' '}
          <a href={'https://xrpscan.com/account/' + data?.address} rel="nofollow">
            XRPScan
          </a>{' '}
          |{' '}
          <a href={'https://xrplwin.com/account/' + data?.address} rel="nofollow">
            XRPLWin
          </a>{' '}
          |{' '}
          <a href={'https://blockchair.com/xrp-ledger/account/' + data?.address} rel="nofollow">
            Blockchair
          </a>{' '}
          |{' '}
          <a href={'https://gatehub.net/explorer/' + data?.address} rel="nofollow">
            Gatehub
          </a>{' '}
          |{' '}
          <a href={'https://explorer.bitquery.io/ripple/address/' + data?.address} rel="nofollow">
            BitQuery
          </a>
        </>
      )}
      {network === 'testnet' && (
        <>
          <a href={'https://test.xrplexplorer.com/explorer/' + data?.address} rel="nofollow">
            Bithomp
          </a>{' '}
          (old view) |{' '}
          <a href={'https://testnet.xrpl.org/accounts/' + data?.address} rel="nofollow">
            XRPL.org
          </a>{' '}
          |{' '}
          <a href={'https://explorer-testnet.xrplf.org/' + data?.address} rel="nofollow">
            XRPLF
          </a>
        </>
      )}
      {network === 'devnet' && (
        <>
          <a href={'https://dev.xrplexplorer.com/explorer/' + data?.address} rel="nofollow">
            Bithomp
          </a>{' '}
          (old view) |{' '}
          <a href={'https://devnet.xrpl.org/accounts/' + data?.address} rel="nofollow">
            XRPL.org
          </a>
        </>
      )}
      {network === 'xahau' && (
        <>
          <a href={'https://xahauexplorer.com/explorer/' + data?.address} rel="nofollow">
            Xahau Explorer
          </a>{' '}
          (old view) |{' '}
          <a href={'https://xahau.xrpl.org/accounts/' + data?.address} rel="nofollow">
            XRPL.org
          </a>{' '}
          |{' '}
          <a href={'https://explorer.xahau.network/' + data?.address} rel="nofollow">
            XRPLF
          </a>
        </>
      )}
      {network === 'xahau-testnet' && (
        <>
          <a href={'https://test.xahauexplorer.com/explorer/' + data?.address} rel="nofollow">
            Xahau Explorer
          </a>{' '}
          (old view) |
          <a href={'https://xahau-testnet.xrpl.org/accounts/' + data?.address} rel="nofollow">
            XRPL.org
          </a>{' '}
          |{' '}
          <a href={'https://explorer.xahau-test.net/' + data?.address} rel="nofollow">
            XRPLF
          </a>
        </>
      )}
      {network === 'xahau-jshooks' && (
        <>
          <a href={'https://jshooks.xahauexplorer.com/explorer/' + data?.address} rel="nofollow">
            Xahau Explorer
          </a>{' '}
          (old view) |
          <a href={'https://jshooks.xahau-test.net/' + data?.address} rel="nofollow">
            XRPLF
          </a>
        </>
      )}
    </>
  )
  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">Related Links</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>On other networks</td>
            <td>{otherNetworksNode}</td>
          </tr>
          <tr>
            <td>On other explorers</td>
            <td>{otherExplorersNode}</td>
          </tr>
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <br />
        <center>{'Related Links'.toUpperCase()}</center>
        <p>
          <span className="grey">On other networks</span>
          <br />
          {otherNetworksNode}
        </p>
        <p>
          <span className="grey">On other explorers</span>
          <br />
          {otherExplorersNode}
        </p>
      </div>
    </>
  )
}
