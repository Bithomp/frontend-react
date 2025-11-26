import { addressBalanceChanges, isConvertionTx } from '.'
import { xls14NftValue } from '..'

export const isRipplingOnIssuer = (sourceBalanceChangesList, address) => {
  return sourceBalanceChangesList?.length > 1 && sourceBalanceChangesList.every((item) => item.issuer === address)
}

export const paymentTypeName = (data) => {
  if (!data) return 'Payment'
  const { outcome, specification } = data
  let type = 'Payment'
  if (isConvertionTx(specification)) {
    type = 'Currency exchange'
  }
  if (xls14NftValue(outcome?.deliveredAmount?.value)) {
    type = 'NFT transfer (XLS-14)'
  }
  return type
}

export const isIOUpayment = (data) => {
  if (!data) return false
  const { outcome, specification } = data
  let iouPayment = false
  const sourceBalanceChangesList = addressBalanceChanges(data, specification.source.address)
  if (!isConvertionTx(specification)) {
    //check if iou involved (pathfinding or iou with fee)
    if (
      !outcome?.deliveredAmount?.mpt_issuance_id &&
      sourceBalanceChangesList?.[0]?.value !== '-' + outcome?.deliveredAmount?.value
    ) {
      iouPayment = true
    }
  }
  return iouPayment
}

export const optionalAbsPaymentAmount = (change, isConvertion) => {
  return !isConvertion && (change?.value ? change.value.toString()[0] === '-' : change?.toString()[0] === '-')
    ? {
        ...change,
        value: change?.value ? change?.value.toString().slice(1) : change?.toString().slice(1)
      }
    : change
}
