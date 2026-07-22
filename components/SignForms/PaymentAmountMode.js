import { useTranslation } from 'next-i18next'

import RadioOptions from '../UI/RadioOptions'
import { PAYMENT_AMOUNT_MODE } from '../../utils/paymentTransferFee'

export default function PaymentAmountMode({ value, onChange }) {
  const { t } = useTranslation('services')

  return (
    <div className="payment-amount-mode">
      <span className="input-title">{t('shared.amount-mode.title')}</span>
      <RadioOptions
        name="payment-amount-mode"
        tab={value}
        setTab={onChange}
        tabList={[
          { value: PAYMENT_AMOUNT_MODE.DELIVER, label: t('shared.amount-mode.deliver') },
          { value: PAYMENT_AMOUNT_MODE.SPEND, label: t('shared.amount-mode.spend') }
        ]}
      />
    </div>
  )
}
