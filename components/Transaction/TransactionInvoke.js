import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled } from '../../utils/format'
import { decode } from '../../utils'
import CopyButton from '../UI/CopyButton'

const decodeHookParameters = (params) => {
  if (!params || !Array.isArray(params)) return null

  const decoded = {}

  params.forEach((param) => {
    const p = param.HookParameter
    if (!p) return

    const name = decode(p.HookParameterName)
    const value = p.HookParameterValue

    if (name === 'L') {
      // Layer: 01 for L1, 02 for L2
      decoded.layer = value === '01' ? 'L1' : value === '02' ? 'L2' : value
    } else if (name === 'T') {
      // Topic: first byte is topic type (H/S/R/D), second byte is topic number
      const topicType = decode(value.substring(0, 2))
      const topicNumber = value.substring(2)
      if (topicType === 'H') {
        decoded.topic = `Hook #${parseInt(topicNumber, 16)}`
      } else if (topicType === 'S') {
        decoded.topic = `Seat #${parseInt(topicNumber, 16)}`
      } else if (topicType === 'R') {
        decoded.topic = 'Reward Rate'
      } else if (topicType === 'D') {
        decoded.topic = 'Reward Delay'
      } else {
        decoded.topic = topicType + ' ' + topicNumber
      }
    } else if (name === 'V') {
      // Vote value: can be HookHash (64 chars), Address (40 chars), or numeric value
      if (value.length === 64) {
        if (value === '0000000000000000000000000000000000000000000000000000000000000000') {
          decoded.vote = 'Erase/Delete'
        } else {
          decoded.vote = value
          decoded.voteType = 'HookHash'
        }
      } else if (value.length === 40) {
        if (value === '0000000000000000000000000000000000000000') {
          decoded.vote = 'Erase/Delete'
        } else {
          decoded.vote = value
          decoded.voteType = 'Address'
        }
      } else {
        decoded.vote = value
      }
    }
  })

  return decoded
}

export const TransactionInvoke = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { tx } = data

  const hookParams = decodeHookParameters(tx.HookParameters)

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <tr>
        <TData>Destination</TData>
        <TData>
          <AddressWithIconFilled data={{ address: tx.Destination }} name="address" />
        </TData>
      </tr>
      {hookParams && (
        <>
          {hookParams.layer && (
            <tr>
              <TData>Governance Layer</TData>
              <TData>{hookParams.layer}</TData>
            </tr>
          )}
          {hookParams.topic && (
            <tr>
              <TData>Topic</TData>
              <TData>{hookParams.topic}</TData>
            </tr>
          )}
          {hookParams.vote && (
            <tr>
              <TData>Vote {hookParams.voteType && `(${hookParams.voteType})`}</TData>
              <TData style={{ wordBreak: 'break-all' }}>
                {hookParams.vote}
                {hookParams.voteType === 'HookHash' && (
                  <>
                    {' '}
                    <CopyButton text={hookParams.vote} />
                  </>
                )}
              </TData>
            </tr>
          )}
        </>
      )}
    </TransactionCard>
  )
}
