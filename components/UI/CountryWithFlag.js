import { useEffect, useState } from 'react'
import { useTranslation } from 'next-i18next'

import ReactCountryFlag from 'react-country-flag'

import { countriesTranslated } from '../../utils'

export default function CountryWithFlag({ countryCode, type }) {
  const { i18n } = useTranslation()
  const [countries, setCountries] = useState(null)

  useEffect(() => {
    const loadCountries = async () => {
      const data = await countriesTranslated(i18n.language)
      setCountries(data)
    }
    loadCountries()
  }, [i18n.language])

  if (!countryCode) return ''
  if (countryCode === 'unknown') return <b>Unknown</b>

  return (
    <>
      <ReactCountryFlag
        countryCode={countryCode}
        style={{
          fontSize: '1.5em',
          lineHeight: '1.5em'
        }}
      />{' '}
      {type === 'code' ? countryCode : countries ? countries.getNameTranslated(countryCode) : countryCode}
    </>
  )
}
