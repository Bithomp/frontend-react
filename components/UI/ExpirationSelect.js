import Select from 'react-select'
import { useTranslation } from "next-i18next"

export default function ExpirationSelect({ onChange }) {
  const { t } = useTranslation()

  let emptyOption = { value: 0, label: t("general.no-expiration") }
  let expirationsArray = [
    emptyOption,
    { value: 1, label: t("components.expiration-select.1d") },
    { value: 3, label: t("components.expiration-select.3d") },
    { value: 7, label: t("components.expiration-select.7d") },
    { value: 14, label: t("components.expiration-select.14d") },
    { value: 30, label: t("components.expiration-select.30d") },
    { value: 90, label: t("components.expiration-select.90d") },
  ]

  return (
    <Select
      options={expirationsArray}
      defaultValue={emptyOption}
      onChange={value => onChange(value.value)}
      isSearchable={false}
      className="simple-select"
      classNamePrefix="react-select"
      instanceId="expiration-select"
    />
  )
}
