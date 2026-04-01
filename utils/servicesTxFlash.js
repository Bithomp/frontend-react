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
    const raw = window.sessionStorage.getItem(SERVICES_TX_SUCCESS_KEY)
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
    window.sessionStorage.removeItem(SERVICES_TX_SUCCESS_KEY)
  }
}

