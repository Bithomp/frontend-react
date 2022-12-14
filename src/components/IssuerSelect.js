import Select from 'react-select';
import { useTranslation } from "react-i18next";

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

  const onChange = value => {
    setSelectedIssuer(value.label);
  };

  return (
    <Select
      options={issuersArray}
      defaultValue={defaultOption}
      onChange={onChange}
      isSearchable={true}
      className="issuer-select"
      classNamePrefix="react-select"
    />
  );
};
