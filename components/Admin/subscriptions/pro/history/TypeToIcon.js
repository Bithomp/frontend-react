import { GiReceiveMoney, GiPayMoney, GiPassport, GiMoneyStack } from 'react-icons/gi'
import { RiNftFill } from 'react-icons/ri'
import { CiSettings, CiLink, CiFileOn } from 'react-icons/ci'
import { BsCurrencyExchange, BsFillSafeFill } from 'react-icons/bs'
import { TbPigMoney } from 'react-icons/tb'
import { LuFileCheck2 } from 'react-icons/lu'
import { FaMoneyCheckAlt, FaSwimmingPool } from 'react-icons/fa'
import { MdDeleteSweep } from 'react-icons/md'

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
  } else if (type.includes('DID')) {
    icon = <GiPassport />
  } else if (type.includes('AMM')) {
    icon = <FaSwimmingPool />
  } else if (type.includes('PaymentChannel')) {
    icon = <GiMoneyStack />
  } else if (type === 'AccountDelete') {
    icon = <MdDeleteSweep />
  } else if (type.includes('Check')) {
    icon = <FaMoneyCheckAlt />
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
