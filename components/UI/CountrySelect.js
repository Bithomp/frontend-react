import Select from 'react-select'
import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import countries from "i18n-iso-countries"
import axios from 'axios'

import { useLocalStorage } from '../../utils'

export default function CountrySelect({ countryCode, setCountryCode, type }) {
  const { i18n } = useTranslation()
  let lang = i18n.language.slice(0, 2)
  const notSupportedLanguages = ['my'] // supported "en", "ru", "ja", "ko" etc
  if (notSupportedLanguages.includes(lang)) {
    lang = "en"
  }
  const languageData = require('i18n-iso-countries/langs/' + lang + '.json')
  countries.registerLocale(languageData)
  const countryObj = countries.getNames(lang, { select: "official" })
  const countryArr = Object.entries(countryObj).map(([key, value]) => {
    return {
      label: value,
      value: key
    }
  })
  countryArr.sort((a, b) => a.label.localeCompare(b.label, lang))

  const [savedCountry, setSavedCounty] = useLocalStorage('country')
  const [selectCountry, setSelectCountry] = useState({ value: '', label: '' })

  async function fetchData() {
    const response = await axios('client/info');
    const json = response.data;
    if (json && json.country) {
      const countryCode = json.country.toUpperCase()
      setSelectCountry({
        value: countryCode,
        label: countries.getName(countryCode, lang, { select: "official" })
      })
      setCountryCode(countryCode)
      if (type !== "onlySelect") {
        setSavedCounty(countryCode)
      }
    }
  }

  useEffect(() => {
    if (type === "onlySelect") {
      if (countryCode) {
        setSelectCountry({
          value: countryCode,
          label: countries.getName(countryCode, lang, { select: "official" })
        })
        setCountryCode(countryCode)
      } else {
        fetchData()
      }
    } else if (savedCountry) {
      setSelectCountry({
        value: savedCountry,
        label: countries.getName(savedCountry, lang, { select: "official" })
      })
      setCountryCode(savedCountry)
    } else {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const lang = i18n.language.slice(0, 2)
    if (selectCountry.value) {
      setSelectCountry({
        value: selectCountry.value,
        label: countries.getName(selectCountry.value, lang, { select: "official" })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language])

  const onCountryChange = (item) => {
    setSelectCountry(item)
    if (type !== "onlySelect") {
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
