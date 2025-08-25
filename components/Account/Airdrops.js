import { fullNiceNumber } from '../../utils/format'
import LinkIcon from '../../public/images/link.svg'

export default function Airdrops({ data }) {
  if (!data?.flare?.spark) return ''

  const flareClaimNode = data.flare?.spark ? <>{fullNiceNumber(data.flare.spark * 0.15)} FLR</> : ''
  const songbirdClaimNode = data.flare?.songbird ? <>{fullNiceNumber(data.flare.songbird)} SGB</> : ''

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">Airdrops</th>
          </tr>
        </thead>
        <tbody>
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
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <br />
        <center>{'Airdrops'.toUpperCase()}</center>
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
      </div>
    </>
  )
}
