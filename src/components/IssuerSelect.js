import Select from 'react-select';
import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';

import '../assets/styles/components/issuerSelect.scss';

export default function CurrencySelect({ issuersList, selectedIssuer, setSelectedIssuer }) {
  const { t } = useTranslation();

  let emptyOption = { value: '', label: t("general.all-issuers")};
  let defaultOption = emptyOption;
  let issuersArray = [];

  if (issuersList) {
    for (let i = 0; i < issuersList.length; i++) {
      const { address, service, username } = issuersList[i];
      let label = address;
      if (service) {
        label = service;
      } else if (username) {
        label = username;
      }
      const option = { value: address, label };
      if (address === selectedIssuer || label.toLowerCase() === selectedIssuer.toLowerCase()) {
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
    setSelectedIssuer(value.label);
  };

  useEffect(() => {
    if (selectedIssuer && issuersList) {
      for (let i = 0; i < issuersList.length; i++) {
        const { address, username, service } = issuersList[i];
        if (address === selectedIssuer || username?.toLowerCase() === selectedIssuer.toLowerCase()) {
          let label = address;
          if (service) {
            label = service;
          } else if (username) {
            label = username;
          }
          setValue({ value: address, label });
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
