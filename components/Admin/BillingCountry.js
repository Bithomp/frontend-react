import CountrySelect from '../UI/CountrySelect'
import axios from 'axios'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'

import { countriesTranslated } from '../../utils'
import { axiosAdmin } from '../../utils/axios'

export default function BillingCountry({ billingCountry, setBillingCountry, choosingCountry, setChoosingCountry }) {
  const router = useRouter()
  const { i18n } = useTranslation()
  const countries = countriesTranslated(i18n.language)

  const [loading, setLoading] = useState(true) //keep true for country select

  useEffect(() => {
    getApiData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getApiData = async () => {
    const partnerData = await axiosAdmin.get('partner').catch((error) => {
      if (error && error.message !== 'canceled') {
        console.log(error)
        if (error.response?.data?.error === 'errors.token.required') {
          router.push('/admin')
        }
      }
      setLoading(false)
    })

    /*
    {
      "id": 321098,
      "created_at": "2022-09-20T12:42:38.000Z",
      "updated_at": "2024-01-09T12:08:33.000Z",
      "name": "vasia.com",
      "email": "sasha@public.com",
      "country": "GB"
    }
    */

    setLoading(false)

    const partnerCountry = partnerData?.data?.country

    //if we have country available: set country
    if (partnerCountry) {
      setBillingCountry(partnerCountry)
    } else {
      //if no country available
      setChoosingCountry(true)
    }
  }

  const saveCountry = async () => {
    const data = await axios
      .put('partner/partner', { country: billingCountry }, { baseUrl: '/api/' })
      .catch((error) => {
        if (error && error.message !== 'canceled') {
          console.log(error)
        }
      })
    if (data?.data?.country) {
      setChoosingCountry(false)
    }
  }

  return (
    <>
      {(!billingCountry || choosingCountry) && !loading ? (
        <>
          <h4>Choose your country of residence</h4>
          <CountrySelect countryCode={billingCountry} setCountryCode={setBillingCountry} type="onlySelect" />
          <br />
          <button onClick={() => saveCountry()} className="button-action">
            Save
          </button>
          <br />
        </>
      ) : (
        <>
          {billingCountry && (
            <>
              Your billing country is{' '}
              <a onClick={() => setChoosingCountry(true)}>{countries.getNameTranslated(billingCountry)}</a>
            </>
          )}
        </>
      )}
    </>
  )
}
