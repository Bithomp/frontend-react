import { useTranslation } from 'next-i18next'
import { amountFormat, AddressWithIconInline } from '../../../utils/format'
import { LinkAmm, LinkObject } from '../../../utils/links'

const rates = (a, b) => {
  return (
    <>
      {amountFormat(
        {
          currency: a.currency,
          issuer: a?.issuer || undefined,
          value: 1
        },
        { icon: true, bold: true, noSpace: true }
      )}{' '}
      ={' '}
      {amountFormat(
        {
          ...b,
          value: Math.abs((b.value || b / 1000000) / (a.value || a / 1000000))
        },
        { icon: true, bold: true, noSpace: true }
      )}
    </>
  )
}

export default function ExchangesTable({ exchanges = [], ledgerIndex = null }) {
  const { t } = useTranslation('transaction')
  const keyOf = (e, i) => e.offer_id || e.amm_id || `${e.type}-${e.address1}-${e.address2}-${i}`

  return (
    <div className="space-y-2">
      {exchanges?.map((e, i) => {
        const sent = amountFormat(e.asset1, { withIssuer: true, icon: true }) ?? '—'
        const received = amountFormat(e.asset2, { withIssuer: true, icon: true }) ?? '—'

        let by = null
        if (e.type === 'amm' && e.amm_id) {
          by = (
            <>
              {' '}
              {t('exchange.byAmm')} <LinkAmm ammId={e.amm_id} hash={true} />
            </>
          )
        } else if (e.type === 'offer' && e.offer_id) {
          by = (
            <>
              {' '}
              {t('exchange.byOffer')}{' '}
              <LinkObject objectId={e.offer_id} hash={true} ledgerIndex={ledgerIndex ? ledgerIndex - 1 : null} />
            </>
          )
        } else if (e.type) {
          by = <> {t('exchange.byType', { type: e.type })}</>
        }

        return (
          <div key={keyOf(e, i)} className="text-sm leading-6">
            {exchanges?.length > 1 && <>{i + 1}. </>}
            <AddressWithIconInline data={e} name="address1" options={{ short: true }} /> {t('exchange.exchanged')}{' '}
            <b className="tabular-nums">{sent}</b> {t('exchange.for')}{' '}
            <b className="tabular-nums">{received}</b> {t('exchange.with')}{' '}
            <AddressWithIconInline data={e} name="address2" options={{ short: true }} />
            {by}.<br />
            {t('exchange.rates')}: {rates(e.asset1, e.asset2)}, {rates(e.asset2, e.asset1)}.
          </div>
        )
      })}
    </div>
  )
}
