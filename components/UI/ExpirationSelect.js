import Select from 'react-select'
import { useTranslation } from "next-i18next"

export default function ExpirationSelect({ onChange, value = 0 }) {
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

  // Find the option that matches the current value
  const safeValue = value !== null && value !== undefined ? Number(value) : 0
  const selectedOption = expirationsArray.find(option => option.value === safeValue) || emptyOption

  return (
    <Select
      options={expirationsArray}
      value={selectedOption}
      onChange={value => onChange(value.value)}
      isSearchable={false}
      className="simple-select"
      classNamePrefix="react-select"
      instanceId="expiration-select"
    />
  )
}
