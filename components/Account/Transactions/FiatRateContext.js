import { createContext, useContext } from 'react'

export const TxFiatRateContext = createContext(0)

export const useTxFiatRate = () => {
  return useContext(TxFiatRateContext)
}
