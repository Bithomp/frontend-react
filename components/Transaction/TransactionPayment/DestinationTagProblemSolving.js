import axios from 'axios'
import { TData } from '../../Table'
import { useEffect, useState } from 'react'
import { addressUsernameOrServiceLink } from '../../../utils/format'

export default function DestinationTagProblemSolving({ specification, pageFiatRate }) {
  const [dtData, setDtData] = useState(null)

  useEffect(() => {
    const noDestTagOrShortDestTag = !specification?.destination?.tag || specification.destination.tag < 9999
    //pageFiatRate - to render only once when the rate is known, otherwise will do 3 calls
    if (noDestTagOrShortDestTag && pageFiatRate) {
      axios
        .get('xrpl/accounts/' + specification.destination.address)
        .then((response) => {
          /*
            {
              "result": "success",
              "account_data": {
                "account": "r325zs5Zuduw7id6DyYSfQ3Gyzd3N6TyLn",
                "parent": "rJRPhDThVkRsicStittXBoPxoCvWGqeAXg",
                "inception": 1727765311,
                "ledger_index": 91118530,
                "tx_hash": "14FB9FF598A6285A048F3B5334922B180028AB40EDE9FBE4E93BF44963AD6EE9",
                "initial_balance": 11,
                "balance": 608942.450567,
                "disable_master": false,
                "require_dest_tag": false,
                "last_submitted_at": 1744291952,
                "last_submitted_ledger_index": 95363314,
                "last_submitted_tx_hash": "441BAF63918C64D0AB10EB75FEDB14267250D1E0A50334BFCF089955AE58A76B",
                "owner_count": 0,
                "default_ripple": false,
                "require_auth": false
              }
            }
          */
          setDtData(response?.data)
        })
        .catch((error) => {
          console.error('Error fetching destination tag data:', error)
        })
    }
  }, [specification, pageFiatRate])

  if (dtData?.result !== 'success' || !dtData?.account_data?.require_dest_tag) return ''

  const thereIsAName =
    specification.destination?.addressDetails?.service || specification.destination?.addressDetails?.username

  const destUser = (
    <>
      {!thereIsAName && 'Service: ('}
      {addressUsernameOrServiceLink(specification.destination, 'address')}
      {!thereIsAName && ')'}
    </>
  )
  const tagSpecified = specification?.destination?.tag || specification?.destination?.tag === 0

  return (
    <tr>
      <TData className="bold orange">Problem solving</TData>
      <TData>
        This payment was sent to {destUser} {tagSpecified ? 'with a short (that can be wrong)' : 'without a'}{' '}
        <span className="red bold">Destination Tag</span>.
        <br />
        <span className="bold">Destination tag</span> is used to identify customers.{' '}
        <span className="bold">{destUser}</span> received that payment, but <span className="bold">{destUser}</span>{' '}
        does not know to whom it belongs to, as there is {tagSpecified ? 'a short (that can be wrong)' : 'no'}{' '}
        <span className="bold">Destination Tag</span> (USER ID) specified.
        <br />
        <span className="red">
          Contact <span className="bold">{destUser}</span> customer support to solve this issue.
        </span>
      </TData>
    </tr>
  )
}
