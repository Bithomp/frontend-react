import { useTranslation } from 'next-i18next'
import { isAddressValid } from '../../utils'
import AddressInput from '../UI/AddressInput'

export default function NftTransfer({ setSignRequest, signRequest, setStatus, setFormError }) {
  const { t } = useTranslation()

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

  return (
    <div className="center">
      <br />
      <span className="halv">
        <AddressInput
          title={t('table.destination')}
          placeholder={t('table.address')}
          setInnerValue={onAddressChange}
          type="address"
          hideButton={true}
        />
      </span>
    </div>
  )
}
