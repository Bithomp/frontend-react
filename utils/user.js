import axios from 'axios'
import BigNumber from 'bignumber.js'
import { errorCodeDescription } from './transaction'

export const broadcastTransaction = async ({
  blob,
  setStatus,
  onSignIn,
  afterSubmitExe,
  address,
  wallet,
  walletMetaMap,
  signRequest,
  tx,
  setAwaiting
}) => {
  if (!blob) {
    setStatus('There is no blob to broadcast')
    setAwaiting(false)
    return
  }

  const response = await axios.post('v2/transaction/submit', { signedTransaction: blob }).catch((error) => {
    setAwaiting(false)
    if (error.response?.data?.result) {
      setStatus(errorCodeDescription(error.response.data.result))
    } else if (error.response?.data?.message) {
      setStatus(error.response.data.message)
    } else {
      setStatus(error.message)
    }
  })

  const data = response?.data

  if (data) {
    const txHash = data.id
    if (txHash) {
      const redirectName = signRequest.redirect
      onSignIn({ address, wallet, walletMetaMap, redirectName })
      afterSubmitExe({
        redirectName,
        broker: signRequest.broker?.name,
        txHash,
        txType: tx.TransactionType
      })
    } else {
      //when failed transaction: onlyLogin, remove redirectName
      onSignIn({ address, wallet, walletMetaMap, redirectName: null })
    }
  } else {
    //when failed transaction: onlyLogin, remove redirectName
    onSignIn({ address, wallet, walletMetaMap, redirectName: null })
  }
}

export const getNextTransactionParams = async (tx) => {
  // If a custom fee is set, store it before getting params
  const customFee = tx.Fee

  const response = await axios.post('v2/transaction/nextTransactionParams', tx).catch((error) => {
    console.error(error)
  })

  const params = response?.data
  if (params && customFee) {
    // Restore the custom fee if it was set
    params.Fee = customFee
  }

  return params
}

const normalizedCurrency = (currency) => String(currency || '').toUpperCase()

export const prepareTransactionWithFundingCheck = async (tx, { checkFunding = false } = {}) => {
  const params = await getNextTransactionParams(tx)
  if (!params) return null

  const transaction = {
    ...tx,
    Sequence: params.Sequence,
    Fee: params.Fee,
    LastLedgerSequence: params.LastLedgerSequence
  }

  if (!checkFunding || !transaction.Account) return { transaction, funding: null }

  const limitAmount = transaction.TransactionType === 'TrustSet' ? transaction.LimitAmount : null
  const trustlineLimit = new BigNumber(limitAmount?.value || 0)
  const mayCreateTrustline = trustlineLimit.isFinite() && !trustlineLimit.isZero()
  const [addressResponse, serverResponse, trustlinesResponse] = await Promise.all([
    axios(`/v2/address/${encodeURIComponent(transaction.Account)}?ledgerInfo=true`),
    axios('/v2/server'),
    mayCreateTrustline ? axios(`/v2/trustlines/${encodeURIComponent(transaction.Account)}`) : Promise.resolve(null)
  ])

  const ledgerInfo = addressResponse?.data?.ledgerInfo
  const serverInfo = serverResponse?.data
  const balanceDrops = new BigNumber(ledgerInfo?.balance ?? NaN)
  const reserveBaseDrops = new BigNumber(serverInfo?.reserveBase ?? NaN)
  const reserveIncrementDrops = new BigNumber(serverInfo?.reserveIncrement ?? NaN)
  const ownerCount = new BigNumber(ledgerInfo?.ownerCount || 0)
  const feeDrops = new BigNumber(transaction.Fee ?? NaN)

  if (
    !balanceDrops.isFinite() ||
    !reserveBaseDrops.isFinite() ||
    !reserveIncrementDrops.isFinite() ||
    !ownerCount.isFinite() ||
    !feeDrops.isFinite()
  ) {
    throw new Error('Invalid account funding data')
  }

  const reservedDrops = BigNumber.minimum(balanceDrops, reserveBaseDrops.plus(ownerCount.multipliedBy(reserveIncrementDrops)))
  const availableDrops = BigNumber.maximum(0, balanceDrops.minus(reservedDrops))
  let additionalReserveDrops = new BigNumber(0)

  if (mayCreateTrustline) {
    const trustlinesData = trustlinesResponse?.data
    const trustlines = Array.isArray(trustlinesData)
      ? trustlinesData
      : trustlinesData?.trustlines || trustlinesData?.tokens || trustlinesData?.lines || []
    const trustlineExists = trustlines.some(
      (trustline) =>
        trustline?.counterparty === limitAmount.issuer &&
        normalizedCurrency(trustline?.currency) === normalizedCurrency(limitAmount.currency)
    )
    if (!trustlineExists) additionalReserveDrops = reserveIncrementDrops
  }

  const requiredDrops = feeDrops.plus(additionalReserveDrops)

  return {
    transaction,
    funding: {
      sufficient: availableDrops.gte(requiredDrops),
      availableDrops: availableDrops.toFixed(0),
      requiredDrops: requiredDrops.toFixed(0),
      feeDrops: feeDrops.toFixed(0),
      additionalReserveDrops: additionalReserveDrops.toFixed(0)
    }
  }
}
