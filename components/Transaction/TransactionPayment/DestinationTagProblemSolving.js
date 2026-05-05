import axios from 'axios'
import { TData } from '../TData'
import { useEffect, useState } from 'react'
import { Trans } from 'next-i18next'
import { addressUsernameOrServiceLink } from '../../../utils/format'

export default function DestinationTagProblemSolving({ specification, pageFiatRate }) {
  const [dtData, setDtData] = useState(null)

  useEffect(() => {
    const noDestTagOrShortDestTag = !specification?.destination?.tag || specification.destination.tag < 9999
    //pageFiatRate - to render only once when the rate is known, otherwise will do 3 calls
    if (noDestTagOrShortDestTag && pageFiatRate) {
      axios
        .get('v2/account/' + specification.destination.address)
        .then((response) => {
          setDtData(response?.data)
        })
        .catch((error) => {
          console.error('Error fetching destination tag data:', error)
        })
    }
  }, [specification, pageFiatRate])

  if (!dtData?.account?.requireDestTag) return ''

  const thereIsAName =
    specification.destination?.addressDetails?.service || specification.destination?.addressDetails?.username

  const destUser = (
    <>
      {addressUsernameOrServiceLink(specification.destination, 'address', thereIsAName ? {} : { short: 6 })}
    </>
  )
  const tagSpecified = specification?.destination?.tag || specification?.destination?.tag === 0
  const recipientType = thereIsAName ? 'known' : 'unknown'
  const tagType = tagSpecified ? 'short' : 'missing'
  const DestinationUser = () => destUser
  const DestinationUserBold = () => <span className="bold">{destUser}</span>
  const translationComponents = {
    destUser: <DestinationUser />,
    destUserBold: <DestinationUserBold />,
    redTag: <span className="red bold" />,
    bold: <span className="bold" />,
    boldTag: <span className="bold" />
  }

  return (
    <tr>
      <TData className="bold orange">Problem solving</TData>
      <TData>
        <Trans
          i18nKey={`messages.destinationTagProblem.sent.${recipientType}.${tagType}`}
          ns="transaction"
          components={translationComponents}
        />
        <br />
        <Trans
          i18nKey={`messages.destinationTagProblem.explanation.${recipientType}.${tagType}`}
          ns="transaction"
          components={translationComponents}
        />
        <br />
        <span className="red">
          <Trans
            i18nKey={`messages.destinationTagProblem.contact.${recipientType}`}
            ns="transaction"
            components={translationComponents}
          />
        </span>
      </TData>
    </tr>
  )
}
