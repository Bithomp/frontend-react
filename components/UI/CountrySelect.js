import Select from 'react-select'
import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import axios from 'axios'

import { useLocalStorage, countriesTranslated } from '../../utils'

export default function CountrySelect({ countryCode, setCountryCode, type }) {
  const { i18n } = useTranslation()
  const countries = countriesTranslated(i18n.language)

  const countryArr = countries.countryArr

  const [savedCountry, setSavedCounty] = useLocalStorage('country')
  const [selectCountry, setSelectCountry] = useState({ value: '', label: '' })

  async function fetchData() {
    const response = await axios('client/info')
    const json = response.data
    if (json && json.country) {
      const countryCode = json.country.toUpperCase()
      setSelectCountry({
        value: countryCode,
        label: countries.getNameTranslated(countryCode)
      })
      setCountryCode(countryCode)
      if (type !== 'onlySelect') {
        setSavedCounty(countryCode)
      }
    }
  }

  useEffect(() => {
    if (type === 'onlySelect') {
      if (countryCode) {
        setSelectCountry({
          value: countryCode,
          label: countries.getNameTranslated(countryCode)
        })
        setCountryCode(countryCode)
      } else {
        fetchData()
      }
    } else if (savedCountry) {
      setSelectCountry({
        value: savedCountry,
        label: countries.getNameTranslated(savedCountry)
      })
      setCountryCode(savedCountry)
    } else {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectCountry.value) {
      setSelectCountry({
        value: selectCountry.value,
        label: countries.getNameTranslated(selectCountry.value)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language])

  const onCountryChange = (item) => {
    setSelectCountry(item)
    if (type !== 'onlySelect') {
      setSavedCounty(item.value)
    }
    setCountryCode(item.value)
  }

  return (
    <Select
      options={countryArr}
      value={selectCountry}
      onChange={onCountryChange}
      isSearchable={true}
      className="country-select"
      classNamePrefix="react-select"
      instanceId="country-select"
    />
  )
}
