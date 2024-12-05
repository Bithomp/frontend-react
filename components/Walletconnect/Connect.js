import { useConnect } from '@walletconnect/modal-sign-react'
import { networkId } from '../../utils'

export function Connect() {
  const { connect, loading: isConnecting } = useConnect({
    requiredNamespaces: {
      xrpl: {
        chains: ['xrpl:' + networkId],
        methods: ['xrpl_signTransaction'],
        events: ['chainChanged', 'accountsChanged']
      }
    }
  })

  async function onConnect() {
    try {
      const session = await connect()
      console.info('connect result', session)
    } catch (err) {
      console.error(err)
    }
  }
  return (
    <button type="button" onClick={onConnect} disabled={isConnecting}>
      Connect Wallet
    </button>
  )
}
