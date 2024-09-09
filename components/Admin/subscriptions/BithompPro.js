import Select from 'react-select'
import Link from 'next/link'
import { xahauNetwork } from '../../../utils'

const options = [
  { value: 'm1', label: '1 month', price: '4.99 EUR' },
  { value: 'm3', label: '3 months', price: '14.97 EUR' },
  { value: 'm6', label: '6 months', price: '29.94 EUR' },
  { value: 'y1', label: '1 year', price: '49.99 EUR' }
]

export default function Pro({ setPayPeriod }) {
  return (
    <>
      <h4 className="center">Why Purchase a Bithomp Pro Subscription?</h4>
      <div style={{ textAlign: 'left' }}>
        <p>
          This premium offering is packed with benefits that make your experience with our platform more efficient and
          enjoyable:
        </p>
        <p>
          ✅ <b>Exclusive Access to Advanced Tools:</b>
          <ul>
            <li>
              Enable Infinite scroll in the <Link href="/nft-explorer">NFT Explorer</Link>
            </li>
            <li>
              Enable Infinite scroll in the <Link href="/nft-sales">NFT Sales</Link>
            </li>
            <li>
              Unlock the full list of <Link href="/nft-distribution">NFT holders</Link>
            </li>
            {!xahauNetwork && (
              <li>
                View the complete lists of NFT <Link href="/nft-volumes?list=collections">Collections</Link> &{' '}
                <Link href="/nft-volumes?list=issuers">Issuers</Link>
              </li>
            )}
            <li>CSV exports of complete lists</li>
          </ul>
        </p>
        <p>
          ✅ <b>Priority Support</b>: As a Pro subscriber, you'll receive prioritized customer support, ensuring that
          any questions or issues you have are addressed with speed and care.
        </p>
        <p>
          ✅ <b>Fewer Ads</b>: Experience the platform with significantly fewer advertisements, allowing you to focus on
          what matters most.
        </p>
        <p>
          ✅ <b>Support the Project</b>: By subscribing, you're directly contributing to the growth and development of
          Bithomp. Your support is deeply appreciated and helps us continue to innovate and improve.
        </p>
        <p>
          And this is just the beginning! More features to add even greater value to your Pro Subscription are coming
          soon.
        </p>
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
