import Select from 'react-select'
import { useTranslation } from "react-i18next"

export default function ExpirationSelect({ onChange }) {
  const { t } = useTranslation()

  let emptyOption = { value: 0, label: t("general.no-expiration")}
  let expirationsArray = [
    emptyOption,
    {value: 1, label: '1 day'},
    {value: 3, label: '3 days'},
    {value: 7, label: '7 days'},
    {value: 30, label: '30 days'},
    {value: 90, label: '90 days'}
  ]

  return (
    <Select
      options={expirationsArray}
      defaultValue={emptyOption}
      onChange={value => onChange(value.value)}
      isSearchable={false}
      className="expiration-select"
      classNamePrefix="react-select"
      instanceId="expiration-select"
    />
  );
};
