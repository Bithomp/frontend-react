import { hexdec } from '../../utils'
import { amountFormat, fullDateAndTime } from '../../utils/format'

export default function XahauRewardTr({ data }) {
  if (!data?.rewardLgrFirst) return null
  const timeNow = Math.floor(new Date().getTime() / 1000)
  const rewardDelay = 2600000 //seconds // take it from hook instead later
  const rewardRate = 0.0033333333300000004 // get it from hook later
  const remainingSec = rewardDelay - (timeNow - (data.rewardTime + 946684800))
  // const claimable = remainingSec <= 0
  const claimableDate = fullDateAndTime(timeNow + remainingSec)

  // calculate reward
  const elapsed = data.ledger - data.rewardLgrFirst
  const elapsedSinceLast = data.ledger - data.rewardLgrLast
  let accumulator = hexdec(data.rewardAccumulator)
  if (parseInt(data.balance) > 0 && elapsedSinceLast > 0) {
    accumulator += parseInt(data.balance) * elapsedSinceLast
  }
  const reward = (accumulator / elapsed) * rewardRate

  return (
    <>
      <tr>
        <td>Reward</td>
        <td>{amountFormat(reward, { maxFractionDigits: 6 })}</td>
      </tr>
      <tr>
        <td>Claimable</td>
        <td>{claimableDate}</td>
      </tr>
    </>
  )
}
