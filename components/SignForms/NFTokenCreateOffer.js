import { useState } from 'react'
import { useTranslation } from 'next-i18next'
import ExpirationSelect from '../UI/ExpirationSelect'
import CheckBox from '../UI/CheckBox'
import { isAddressValid, typeNumberOnly } from '../../utils'
import AddressInput from '../UI/AddressInput'
import { amountFormat } from '../../utils/format'

export default function NFTokenCreateOffer({ signRequest, setSignRequest, setStatus, setFormError }) {
  const { t } = useTranslation()

  const [privateOffer, setPrivateOffer] = useState(false)

  const xls35Sell = signRequest?.request?.TransactionType === 'URITokenCreateSellOffer'

  const onAddressChange = (value) => {
    let newRequest = signRequest
    if (isAddressValid(value)) {
      newRequest.request.Destination = value
      setFormError(false)
      setStatus('')
    } else {
      if (newRequest.request.Destination) {
        delete newRequest.request.Destination
      }
      setStatus(t('form.error.address-invalid'))
      setFormError(true)
    }
    setSignRequest(newRequest)
  }

  const onAmountChange = (e) => {
    let newRequest = signRequest
    newRequest.request.Amount = (e.target.value * 1000000).toString()
    setSignRequest(newRequest)
    setFormError(false)
    setStatus('')
  }

  const onExpirationChange = (daysCount) => {
    if (daysCount) {
      let newRequest = signRequest
      let myDate = new Date()
      myDate.setDate(myDate.getDate() + daysCount)
      newRequest.request.Expiration = Math.floor(myDate / 1000) - 946684800 //ripple epoch
      setSignRequest(newRequest)
    }
  }

  const onPrivateOfferToggle = () => {
    let newRequest = signRequest
    setFormError(false)

    if (!privateOffer) {
      if (newRequest.request.Destination) {
        delete newRequest.request.Destination
      }
      setStatus('')
    }
    newRequest.privateOffer = !privateOffer
    setSignRequest(newRequest)
    setPrivateOffer(!privateOffer)
  }

  return (
    <>
      {signRequest.broker?.nftPrice ? (
        <>
          <span
            className="left whole"
            style={{ margin: '10px auto', fontSize: '14px', width: '360px', maxWidth: 'calc(100% - 80px)' }}
          >
            {t('signin.nft-offer.counteroffer')}
          </span>
          <div style={{ textAlign: 'left', margin: '10px auto', width: '360px', maxWidth: 'calc(100% - 80px)' }}>
            <table style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td>{t('signin.nft-offer.nft-price')}</td>
                  <td className="right"> {amountFormat(signRequest.broker.nftPrice)}</td>
                </tr>
                <tr>
                  <td>
                    {t('signin.nft-offer.fee', {
                      serviceName: signRequest.broker?.name,
                      feeText: signRequest.broker?.feeText
                    })}
                  </td>
                  <td className="right"> {amountFormat(signRequest.broker?.fee, { precise: true })} </td>
                </tr>
                <tr>
                  <td>{t('signin.nft-offer.total')}</td>
                  <td className="right">
                    {' '}
                    <b>{amountFormat(signRequest.request.Amount, { precise: true })}</b>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="center">
          <br />
          <span className={xls35Sell ? 'halv xahOnly' : 'quarter xrpOnly'}>
            <span className="input-title">{t('signin.amount.set-price')}</span>
            <input
              placeholder={t('signin.amount.enter-amount')}
              onChange={onAmountChange}
              onKeyPress={typeNumberOnly}
              className="input-text"
              spellCheck="false"
              maxLength="35"
              min="0"
              type="text"
              inputMode="decimal"
            />
          </span>
          {!xls35Sell && (
            <span className="quarter">
              <span className="input-title">{t('signin.expiration')}</span>
              <ExpirationSelect onChange={onExpirationChange} />
            </span>
          )}
          {(signRequest.request.Flags === 1 || xls35Sell) && (
            <>
              <div className="terms-checkbox">
                <CheckBox checked={privateOffer} setChecked={onPrivateOfferToggle}>
                  {t('table.text.private-offer')}
                </CheckBox>
              </div>
              {privateOffer && (
                <span className="halv">
                  <AddressInput
                    title={t('table.destination')}
                    placeholder={t('table.address')}
                    setInnerValue={onAddressChange}
                    type="address"
                    hideButton={true}
                  />
                </span>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
