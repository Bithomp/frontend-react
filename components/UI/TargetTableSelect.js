import Select from 'react-select'
import { useTranslation } from "next-i18next"

export default function TargetTableSelect({ onChange, layer = 1 }) {
  const { t } = useTranslation()

  const array = [
    { value: 1, label: t("components.target-table-select.01") },
    { value: 2, label: t("components.target-table-select.02") }
  ]

  return (
    <Select
      options={array}
      defaultValue={array[layer - 1]}
      onChange={value => onChange(value.value)}
      isSearchable={false}
      className="simple-select"
      classNamePrefix="react-select"
      instanceId="target-table-select"
    />
  )
}
