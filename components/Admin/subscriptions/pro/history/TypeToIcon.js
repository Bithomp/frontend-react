import { GiReceiveMoney } from 'react-icons/gi'
import { GiPayMoney } from 'react-icons/gi'
import { RiNftFill } from 'react-icons/ri'
import { CiSettings } from 'react-icons/ci'
import { CiLink } from 'react-icons/ci'
import { CiFileOn } from 'react-icons/ci'
import { BsCurrencyExchange } from 'react-icons/bs'
import { TbPigMoney } from 'react-icons/tb'
import { LuFileCheck2 } from 'react-icons/lu'
import { BsFillSafeFill } from 'react-icons/bs'

export default function TypeToIcon({ type, direction }) {
  if (!type) return ''
  let icon = null
  if (type === 'Payment') {
    icon = direction === 'sent' ? <GiPayMoney /> : <GiReceiveMoney />
  } else if (type.includes('NFT')) {
    icon = <RiNftFill />
  } else if (type === 'AccountSet' || type === 'SetRegularKey') {
    icon = <CiSettings />
  } else if (type === 'TrustSet') {
    icon = <CiLink />
  } else if (type.includes('Offer')) {
    // NFT offers already presented earlier
    icon = <BsCurrencyExchange />
  } else if (type === 'GenesisMint' || type === 'ClaimReward') {
    icon = <TbPigMoney />
  } else if (type === 'EnableAmendment') {
    icon = <LuFileCheck2 />
  } else if (type.includes('Escrow')) {
    icon = <BsFillSafeFill />
  } else {
    icon = <CiFileOn />
  }

  return (
    <span className="tooltip">
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span className="tooltiptext">
        {type}
        {type === 'Payment' ? ' ' + direction : ''}
      </span>
    </span>
  )
}
