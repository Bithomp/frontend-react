import { useEffect, useMemo, useState } from 'react'
import Select from 'react-select'

const WALLET_LOGOS = {
  xaman: 'xaman.png',
  gemwallet: 'gemwallet.png',
  crossmark: 'crossmark.png',
  joey: 'joey.png',
  bifrost: 'bifrost.png',
  girin: 'girin.png',
  uphodl: 'uphodl.png',
  metamask: 'metamask.png',
  ledger: 'ledger.png',
  dcent: 'dcent.png',
  xyra: 'xyra.svg'
}

const WALLET_NAMES = {
  xaman: 'Xaman',
  gemwallet: 'GemWallet',
  crossmark: 'Crossmark',
  joey: 'Joey',
  bifrost: 'Bifrost',
  girin: 'Girin',
  uphodl: 'Uphodl',
  metamask: 'MetaMask',
  ledger: 'Ledger',
  dcent: 'Dcent',
  xyra: 'Xyra'
}

const iconStyle = { width: 16, height: 16, borderRadius: 4, display: 'block' }

function WalletIcon({ id }) {
  const logo = WALLET_LOGOS[id] || `${id}.png`
  return <img src={`/images/wallets/square-logos/${logo}`} alt={WALLET_NAMES[id] || id} style={iconStyle} />
}

export default function WalletSelect({
  value, // string wallet id or '' (all)
  setValue, // (string) => void
  walletsList, // array of wallet ids: ['xaman','joey',...]
  className,
  instanceId = 'wallet-filter'
}) {
  const [rendered, setRendered] = useState(false)

  useEffect(() => setRendered(true), [])

  const options = useMemo(() => {
    const uniq = Array.from(new Set((walletsList || []).filter(Boolean).map((w) => String(w).toLowerCase())))
    uniq.sort((a, b) => (WALLET_NAMES[a] || a).localeCompare(WALLET_NAMES[b] || b))

    const list = uniq.map((id) => ({
      value: id,
      label: WALLET_NAMES[id] || id,
      id
    }))

    // "All wallets"
    return [{ value: '', label: 'All wallets', id: '' }, ...list]
  }, [walletsList])

  const selectedOption = useMemo(() => {
    const v = (value || '').toLowerCase()
    return options.find((o) => String(o.value).toLowerCase() === v) || options[0]
  }, [options, value])

  if (!rendered) return null

  return (
    <Select
      instanceId={instanceId}
      options={options}
      value={selectedOption}
      onChange={(opt) => setValue(opt?.value || '')}
      isSearchable={true}
      className={className || ''}
      classNamePrefix="react-select"
      menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
      menuPosition="fixed"
      menuPlacement="auto"
      formatOptionLabel={(opt) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {opt.id ? <WalletIcon id={opt.id} /> : null}
          <span>{opt.label}</span>
        </div>
      )}
      styles={{
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        menuList: (provided) => ({ ...provided, maxHeight: 260, overflowY: 'auto' })
      }}
    />
  )
}
