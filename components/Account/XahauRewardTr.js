import { i18n } from 'next-i18next'
import { amountFormat, fullDateAndTime, nativeCurrencyToFiat, timeFromNow } from '../../utils/format'
import { nativeCurrency } from '../../utils'
import { TbPigMoney } from 'react-icons/tb'

export default function XahauRewardTr({ data, setSignRequest, account, mobile, selectedCurrency, fiatRate }) {
  if (!data?.ledgerInfo?.rewardLgrFirst) return null
  const timeNow = Math.floor(new Date().getTime() / 1000)
  const rewardDelay = 2600000 //seconds // take it from hook instead later
  const rewardRate = 0.0033333333300000004 // get it from hook later
  const remainingSec = rewardDelay - (timeNow - (data.ledgerInfo?.rewardTime + 946684800))
  const claimable = remainingSec <= 0
  const claimableDate = timeNow + remainingSec

  // calculate reward
  const elapsed = data.ledgerInfo?.ledger - data.ledgerInfo?.rewardLgrFirst
  const elapsedSinceLast = data.ledgerInfo?.ledger - data.ledgerInfo?.rewardLgrLast
  let accumulator = parseInt(data.ledgerInfo?.rewardAccumulator, 16)
  if (parseInt(data.ledgerInfo?.balance) > 0 && elapsedSinceLast > 0) {
    accumulator += (parseInt(data.ledgerInfo?.balance) / 1000000) * elapsedSinceLast
  }
  const reward = (accumulator / elapsed) * rewardRate * 1000000

  const rewardNode = (
    <span className="bold">
      {reward ? (
        <>
          <span className="green">{amountFormat(reward, { maxFractionDigits: 6 })}</span>{' '}
          {nativeCurrencyToFiat({ amount: reward, selectedCurrency, fiatRate })}
        </>
      ) : (
        <>0 {nativeCurrency}</>
      )}
    </span>
  )

  const rewardButtonsNode = (
    <span className="bold">
      {claimable && (
        <span className="orange">
          <TbPigMoney style={{ fontSize: 18, marginBottom: -4 }} />{' '}
          {data.address === account?.address ? (
            <a
              href="#"
              onClick={() =>
                setSignRequest({
                  request: {
                    TransactionType: 'ClaimReward',
                    Issuer: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
                    Account: data.address
                  }
                })
              }
            >
              Claim now
            </a>
          ) : (
            <a href="#" onClick={() => setSignRequest({})}>
              Sign in to claim
            </a>
          )}
        </span>
      )}
    </span>
  )

  const claimableNode = (
    <>
      {timeFromNow(claimableDate, i18n)} ({fullDateAndTime(claimableDate)})
    </>
  )

  if (mobile) {
    return (
      <>
        <p>
          <span className="grey">Reward</span>
          <br />
          {rewardNode} {rewardButtonsNode}
        </p>
        {!claimable && (
          <p>
            <span className="grey">Claimable</span>
            <br />
            {claimableNode}
          </p>
        )}
      </>
    )
  }

  return (
    <>
      <tr>
        <td>Reward</td>
        <td>
          {rewardNode} {rewardButtonsNode}
        </td>
      </tr>
      {!claimable && (
        <tr>
          <td>Claimable</td>
          <td>{claimableNode}</td>
        </tr>
      )}
    </>
  )
}
