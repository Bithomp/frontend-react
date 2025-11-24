import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import { isAddressValid, xahauNetwork } from '../../utils'
import AddressInput from '../UI/AddressInput'
import CheckBox from '../UI/CheckBox'
import axios from 'axios'

export default function NftTransfer({ setSignRequest, signRequest, setStatus, setFormError, setAutoSend }) {
  const { t } = useTranslation()
  const [useRemit, setUseRemit] = useState(false)
  const [destinationRemitDisabled, setDestinationRemitDisabled] = useState(false)

  // Check if destination allows incoming remit when address changes
  useEffect(() => {
    const checkDestinationRemit = async () => {
      if (!signRequest.request?.Destination || !xahauNetwork) {
        setDestinationRemitDisabled(false)
        return
      }

      try {
        const response = await axios(`/v2/address/${signRequest.request.Destination}?ledgerInfo=true`)
        const accountData = response?.data

        if (accountData?.ledgerInfo?.flags) {
          const flags = accountData.ledgerInfo.flags
          const disallowIncomingRemit = flags.disallowIncomingRemit
          setDestinationRemitDisabled(disallowIncomingRemit)
        } else {
          setDestinationRemitDisabled(false)
        }
      } catch (error) {
        console.error('Error checking destination remit status:', error)
        setDestinationRemitDisabled(false)
      }
    }

    checkDestinationRemit()
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signRequest.request?.Destination])

  useEffect(() => {
    if (xahauNetwork) {
      setAutoSend(true)
      const newRequest = { ...signRequest.request, TransactionType: useRemit ? 'Remit' : 'URITokenCreateSellOffer' }
      if (useRemit && newRequest.URITokenID) {
        delete newRequest.URITokenID
        delete newRequest.Amount
      }
      setSignRequest({ ...signRequest, request: newRequest })
    } 
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useRemit])

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
      
      {/* Remit option for Xahau network */}
      {xahauNetwork && (
        <div className="terms-checkbox">
          <CheckBox 
            checked={useRemit} 
            setChecked={setUseRemit} 
            name="use-remit"
            disabled={destinationRemitDisabled}
          >
            Use Remit (Xahau)
            {destinationRemitDisabled && (
              <span className="red">
                {' '}
                (Disabled - destination has incoming remit disabled)
              </span>
            )}
          </CheckBox>
        </div>
      )}
    </div>
  )
}
