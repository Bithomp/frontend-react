import { amountFormat, AddressWithIconInline } from '../../../utils/format'
import { LinkAmm, LinkObject } from '../../../utils/links'

export default function ExchangesTable({ exchanges = [], ledgerIndex = null }) {
  const keyOf = (e, i) => e.offer_id || e.amm_id || `${e.type}-${e.address1}-${e.address2}-${i}`

  return (
    <div className="space-y-2">
      {exchanges.map((e, i) => {
        const sent = amountFormat(e.asset1, { withIssuer: true, icon: true }) ?? '—'
        const received = amountFormat(e.asset2, { withIssuer: true, icon: true }) ?? '—'

        let by = null
        if (e.type === 'amm' && e.amm_id) {
          by = (
            <>
              {' '}
              by AMM <LinkAmm ammId={e.amm_id} hash={true} />
            </>
          )
        } else if (e.type === 'offer' && e.offer_id) {
          by = (
            <>
              {' '}
              by offer{' '}
              <LinkObject objectId={e.offer_id} hash={true} ledgerIndex={ledgerIndex ? ledgerIndex - 1 : null} />
            </>
          )
        } else if (e.type) {
          by = <> by {e.type}</>
        }

        return (
          <div key={keyOf(e, i)} className="text-sm leading-6">
            {exchanges.length > 1 && <>{i + 1}. </>}
            <AddressWithIconInline data={e} name="address1" options={{ short: true }} /> exchanged{' '}
            <b className="tabular-nums">{sent}</b> for <b className="tabular-nums">{received}</b> with{' '}
            <AddressWithIconInline data={e} name="address2" options={{ short: true }} />
            {by}.
          </div>
        )
      })}
    </div>
  )
}
