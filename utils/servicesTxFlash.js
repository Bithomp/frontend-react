const SERVICES_TX_SUCCESS_KEY = 'services:tx-success'

const defaultTxSuccessMessages = {
  SetRegularKey: 'Regular key updated successfully.',
  SignerListSet: 'Signer list updated successfully.',
  AccountSet: 'Settings updated successfully.'
}

export const getServicesTxSuccessMessage = (txType, customMessages = {}) => {
  return customMessages?.[txType] || defaultTxSuccessMessages?.[txType] || 'Transaction successful.'
}

export const consumeServicesTxSuccessFlash = ({ setSuccessMessage, setErrorMessage, customMessages = {} }) => {
  if (typeof window === 'undefined') return

  try {
    const raw = window.localStorage.getItem(SERVICES_TX_SUCCESS_KEY)
    if (!raw) return

    const parsed = JSON.parse(raw)
    if (parsed?.txType) {
      setSuccessMessage(getServicesTxSuccessMessage(parsed.txType, customMessages))
      if (typeof setErrorMessage === 'function') {
        setErrorMessage('')
      }
    }
  } catch (_e) {
    // ignore parsing/storage errors
  } finally {
    window.localStorage.removeItem(SERVICES_TX_SUCCESS_KEY)
  }
}

export const setServicesTxSuccessFlash = ({ txType, path }) => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      SERVICES_TX_SUCCESS_KEY,
      JSON.stringify({
        txType: txType || null,
        path: path || window.location.pathname,
        ts: Date.now()
      })
    )
  } catch (_e) {
    return
  }
}
