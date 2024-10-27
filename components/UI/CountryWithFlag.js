import ReactCountryFlag from 'react-country-flag'
import { countriesTranslated } from '../../utils'
import { useTranslation } from 'next-i18next'

export default function CountryWithFlag({ countryCode, type }) {
  const { i18n } = useTranslation()
  if (!countryCode) return ''
  const countries = countriesTranslated(i18n.language)

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
      {type === 'code' ? countryCode : countries.getNameTranslated(countryCode)}
    </>
  )
}
