import { useConnect } from '@walletconnect/modal-sign-react'

export function Connect() {
  const { connect, loading: isConnecting } = useConnect({
    requiredNamespaces: {
      xrpl: {
        chains: ['xrpl:0', 'xrpl:1'],
        methods: ['xrpl_signTransaction'],
        events: ['chainChanged', 'accountsChanged']
      }
    }
  })

  async function onConnect() {
    try {
      console.info('connect try')
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
