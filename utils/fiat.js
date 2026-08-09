import { createContext, useContext } from 'react'

export const FiatContext = createContext({
  selectedCurrency: null,
  fiatRate: null
})

export const useFiat = () => useContext(FiatContext)
