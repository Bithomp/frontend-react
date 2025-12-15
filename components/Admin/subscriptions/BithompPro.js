import Select from 'react-select'
import Link from 'next/link'
import { xahauNetwork } from '../../../utils'

const options = [
  { value: 'm1', label: '1 month', price: '9.99 EUR' },
  { value: 'm3', label: '3 months', price: '29.97 EUR' },
  { value: 'm6', label: '6 months', price: '59.94 EUR' },
  { value: 'y1', label: '1 year', price: '99.99 EUR' }
]

export default function Pro({ setPayPeriod }) {
  return (
    <>
      <h4 className="center">Why Purchase a Bithomp Pro Subscription?</h4>
      <div style={{ textAlign: 'left' }}>
        <p>This premium offering is packed with benefits that make your experience more efficient:</p>

        <p>
          ✅ <b>Balance changes reports:</b> <Link href="/admin/pro">Up to 5 addresses</Link>, <b>40 FIAT</b>{' '}
          currencies, historical token value calculations, CSV Export.
        </p>
        <p>
          ✅ <b>Advanced options in services:</b> <Link href="/services/send">Send Payment</Link>,{' '}
          <Link href="/services/check">Issuer Check</Link>, <Link href="/services/escrow">Create Escrow</Link>.
        </p>
        <p>
          ✅ <b>Infinite scroll:</b> Enable infinite scroll in the <Link href="/tokens">Tokens</Link>,{' '}
          {!xahauNetwork && (
            <>
              <Link href="/amms">AMM Explorer</Link>,{' '}
            </>
          )}
          <Link href="/nft-explorer">NFT Explorer</Link>, <Link href="/nft-sales">NFT Sales</Link>,{' '}
          <Link href="/nft-distribution">NFT holders</Link>,{' '}
          {!xahauNetwork && (
            <>
              <Link href="/nft-volumes">NFT Collections</Link> &{' '}
            </>
          )}
          <Link href="/nft-volumes?list=issuers">NFT Issuers</Link>.
        </p>
        <p>
          ✅ <b>Higher limits:</b> 100 Addresses or NFTs in your <Link href="/admin/watchlist">Watchlist</Link>.
        </p>
        <p>
          ✅ <b>Animated avatars:</b> Set .gif avatars in <Link href="/admin/pro">My addresses</Link>.
        </p>
        <p>
          ✅ <b>Fewer ads</b>: Focus on what matters most.
        </p>
        <p>
          ✅ <b>Priority support</b>: As a Pro subscriber, you'll receive prioritized customer support.
        </p>
        <p>
          ✅ <b>Support the project</b>: You're contributing to the growth and development of our project.
        </p>
        <p>More features to add even greater value to your Pro Subscription are coming.</p>
      </div>
      <p>Subscribe to Bithomp Pro!</p>

      <div className="center">
        <Select
          options={options}
          getOptionLabel={(option) => (
            <div style={{ width: '150px' }}>
              {option.label} <span style={{ float: 'right' }}>{option.price}</span>
            </div>
          )}
          onChange={(selected) => {
            setPayPeriod(selected.value)
          }}
          defaultValue={options[1]}
          isSearchable={false}
          className="simple-select"
          classNamePrefix="react-select"
          instanceId="period-select"
        />
      </div>
    </>
  )
}
