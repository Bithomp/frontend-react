import { useEffect, useState } from 'react'
import Select from 'react-select'

export default function SimpleSelect({ value, setValue, optionsList, className }) {
  const [rendered, setRendered] = useState(false)
  const [choosenOption, setChoosenOption] = useState(undefined)

  // Ensure we only render on client (avoid SSR/hydration issues)
  useEffect(() => {
    setRendered(true)
  }, [])

  useEffect(() => {
    if (!rendered) return

    if (!Array.isArray(optionsList) || optionsList.length === 0) {
      setChoosenOption(undefined)
      return
    }

    const targetValue = value ?? optionsList[0].value

    const match = optionsList.find((opt) => String(opt.value).toLowerCase() === String(targetValue).toLowerCase())

    const finalOption = match || optionsList[0]

    setChoosenOption(finalOption)

    if (value !== finalOption.value) {
      setValue(finalOption.value)
    }
  }, [rendered, value, optionsList, setValue])

  if (!rendered) return null

  return (
    <Select
      instanceId="dropdown"
      value={choosenOption}
      options={optionsList}
      onChange={(option) => {
        setValue(option.value)
        setChoosenOption(option)
      }}
      isSearchable={false}
      className={`dropdown ${className || ''}`}
      classNamePrefix="react-select"
      styles={{
        menuList: (provided) => ({
          ...provided,
          maxHeight: 200,
          overflowY: 'auto'
        })
      }}
    />
  )
}
