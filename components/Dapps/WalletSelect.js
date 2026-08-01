import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'next-i18next'
import Select from 'react-select'
import { DAPP_WALLETS } from '../../utils/dapps'

const iconStyle = { width: 16, height: 16, borderRadius: 4, display: 'block' }

function WalletIcon({ id }) {
  const wallet = DAPP_WALLETS[id]
  if (!wallet?.logo) {
    return (
      <span
        style={{
          ...iconStyle,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--accent-icon)',
          color: 'var(--background-main)',
          fontSize: 10,
          fontWeight: 800
        }}
      >
        {(wallet?.name || id).charAt(0).toUpperCase()}
      </span>
    )
  }
  return <img src={`/images/wallets/square-logos/${wallet.logo}`} alt={wallet.name || id} style={iconStyle} />
}

export default function WalletSelect({
  value, // string wallet id or '' (all)
  setValue, // (string) => void
  walletsList, // array of wallet ids: ['xaman','joey',...]
  className,
  instanceId = 'wallet-filter'
}) {
  const { t } = useTranslation('dapps')
  const [rendered, setRendered] = useState(false)

  useEffect(() => setRendered(true), [])

  const options = useMemo(() => {
    const uniq = Array.from(new Set((walletsList || []).filter(Boolean).map((w) => String(w).toLowerCase())))
    uniq.sort((a, b) => (DAPP_WALLETS[a]?.name || a).localeCompare(DAPP_WALLETS[b]?.name || b))

    const list = uniq.map((id) => ({
      value: id,
      label: DAPP_WALLETS[id]?.name || id,
      id
    }))

    return [{ value: '', label: t('filters.allWallets'), id: '' }, ...list]
  }, [t, walletsList])

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
      className={`dropdown ${className || ''}`}
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
        menu: (base) => ({
          ...base,
          backgroundColor: 'var(--background-secondary)',
          border: '1px solid var(--accent-icon)',
          borderRadius: 10,
          overflow: 'hidden'
        }),
        menuList: (provided) => ({ ...provided, maxHeight: 260, overflowY: 'auto', paddingTop: 0, paddingBottom: 0 }),
        option: (base, state) => ({
          ...base,
          backgroundColor: state.isSelected
            ? 'var(--accent-icon)'
            : state.isFocused
              ? 'var(--unaccent-icon)'
              : 'var(--background-secondary)',
          color: state.isSelected ? 'var(--background-main)' : 'var(--text-main)'
        })
      }}
    />
  )
}
