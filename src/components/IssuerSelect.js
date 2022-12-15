import Select from 'react-select';
import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';

import '../assets/styles/components/issuerSelect.scss';

export default function CurrencySelect({ issuersList, selectedIssuer, setSelectedIssuer }) {
  const { t } = useTranslation();

  let emptyOption = { value: '', label: t("general.all-issuers"), username: ""};
  let defaultOption = emptyOption;
  let issuersArray = [];

  if (issuersList) {
    for (let i = 0; i < issuersList.length; i++) {
      const { address, service, username } = issuersList[i];
      let label = address;
      if (username) {
        label = username;
      } else if (service) {
        label = service;
      }
      const option = { value: address, label, username };
      if (address === selectedIssuer || username?.toLowerCase() === selectedIssuer.toLowerCase()) {
        defaultOption = option;
      }
      if (address === label) {
        issuersArray.push(option);
      } else {
        issuersArray.unshift(option);
      }
    }
    issuersArray.unshift(emptyOption);
  }

  const [value, setValue] = useState(defaultOption);

  const onChange = value => {
    setValue(value);
    setSelectedIssuer(value.username || value.value);
  };

  useEffect(() => {
    if (selectedIssuer && issuersList) {
      for (let i = 0; i < issuersList.length; i++) {
        const { address, username, service } = issuersList[i];
        if (address === selectedIssuer || username?.toLowerCase() === selectedIssuer.toLowerCase()) {
          let label = address;
          if (username) {
            label = username;
          } else if (service) {
            label = service;
          }
          setValue({ value: address, label, username });
        }
      }
    }
  }, [selectedIssuer, issuersList]);

  return (
    <Select
      options={issuersArray}
      defaultValue={defaultOption}
      onChange={onChange}
      value={value}
      isSearchable={true}
      className="issuer-select"
      classNamePrefix="react-select"
    />
  );
};
