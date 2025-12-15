import Select from 'react-select'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'next-i18next'
import axios from 'axios'

import { countriesTranslated } from '../../utils'

export default function CountrySelect({ countryCode, setCountryCode, type }) {
  const { i18n } = useTranslation()
  const [countries, setCountries] = useState(null)

  const [selectCountry, setSelectCountry] = useState({ value: '', label: '' })

  const hasRun = useRef(false)

  useEffect(() => {
    const loadCountries = async () => {
      const data = await countriesTranslated(i18n.language)
      setCountries(data)
    }
    loadCountries()
  }, [i18n.language])

  async function fetchData() {
    let response
    try {
      response = await axios('client/info')
    } catch (error) {
      return
    }
    const json = response.data
    if (json && json.country) {
      const countryCode = json.country.toUpperCase()
      setSelectCountry({
        value: countryCode,
        label: countries.getNameTranslated?.(countryCode)
      })
      setCountryCode(countryCode)
      if (type !== 'onlySelect') {
        localStorage.setItem('country', countryCode)
      }
    }
  }

  useEffect(() => {
    let savedCountry = localStorage.getItem('country')
    if (savedCountry) {
      savedCountry = savedCountry.replace(/"/g, '')
    }

    if (!hasRun.current && countries !== undefined && countries !== null) {
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
      hasRun.current = true
    }

    if (countries && selectCountry.value && hasRun.current) {
      setSelectCountry({
        value: selectCountry.value,
        label: countries.getNameTranslated(selectCountry.value)
      })
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries])

  const onCountryChange = (item) => {
    setSelectCountry(item)
    if (type !== 'onlySelect') {
      localStorage.setItem('country', item.value)
    }
    setCountryCode(item.value)
  }

  return (
    <Select
      options={countries?.countryArr || []}
      value={selectCountry}
      onChange={onCountryChange}
      isSearchable={true}
      className="country-select"
      classNamePrefix="react-select"
      instanceId="country-select"
    />
  )
}
