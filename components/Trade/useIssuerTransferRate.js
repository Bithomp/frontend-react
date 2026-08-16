import { useEffect, useState } from 'react'
import axios from 'axios'
import BigNumber from 'bignumber.js'

const NO_TRANSFER_FEE_RATE = '1'

export default function useIssuerTransferRate(asset, enabled) {
  const issuer = enabled ? asset?.issuer || '' : ''
  const [state, setState] = useState({ issuer: '', status: 'idle', rate: null })

  useEffect(() => {
    if (!issuer) {
      setState({ issuer: '', status: 'idle', rate: null })
      return
    }

    let active = true
    setState({ issuer, status: 'loading', rate: null })

    axios(`/v2/address/${encodeURIComponent(issuer)}?ledgerInfo=true`)
      .then(({ data }) => {
        if (!active) return
        const rawRate = data?.ledgerInfo?.transferRate
        const rate = new BigNumber(rawRate || NO_TRANSFER_FEE_RATE)
        if (!rate.isFinite() || rate.lt(1)) throw new Error('invalid-transfer-rate')
        setState({ issuer, status: 'ready', rate: rate.toFixed() })
      })
      .catch(() => {
        if (active) setState({ issuer, status: 'error', rate: null })
      })

    return () => {
      active = false
    }
  }, [issuer])

  return state.issuer === issuer
    ? state
    : { issuer, status: issuer ? 'loading' : 'idle', rate: null }
}
