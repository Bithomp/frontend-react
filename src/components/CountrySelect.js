import Select from 'react-select'
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import countries from "i18n-iso-countries";
import axios from 'axios';
import useLocalStorage from 'use-local-storage';

import '../assets/styles/components/countrySelect.scss';

export default function CountrySelect() {
  const { i18n } = useTranslation();
  const languageData = require('i18n-iso-countries/langs/' + i18n.language + '.json');
  countries.registerLocale(languageData);
  const countryObj = countries.getNames(i18n.language, { select: "official" });
  const countryArr = Object.entries(countryObj).map(([key, value]) => {
    return {
      label: value,
      value: key
    };
  });
  countryArr.sort((a, b) => a.label.localeCompare(b.label, i18n.language));

  const [savedCountry, setSavedCounty] = useLocalStorage('country');
  const [selectCountry, setSelectCountry] = useState({ value: '', label: '' });

  useEffect(() => {
    if (savedCountry) {
      setSelectCountry({
        value: savedCountry,
        label: countries.getName(savedCountry, i18n.language, { select: "official" })
      });
    } else {
      async function fetchData() {
        const response = await axios('client/info');
        const json = response.data;
        if (json && json.country) {
          const countryCode = json.country.toUpperCase();
          setSelectCountry({
            value: countryCode,
            label: countries.getName(countryCode, i18n.language, { select: "official" })
          });
          setSavedCounty(countryCode);
        }
      }
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectCountry.value) {
      setSelectCountry({
        value: selectCountry.value,
        label: countries.getName(selectCountry.value, i18n.language, { select: "official" })
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const onCountryChange = (item) => {
    setSelectCountry(item);
    setSavedCounty(item.value);
  }

  return (
    <Select
      options={countryArr}
      value={selectCountry}
      onChange={onCountryChange}
      isSearchable={true}
      className="country-select"
      classNamePrefix="react-select"
    />
  );
};
