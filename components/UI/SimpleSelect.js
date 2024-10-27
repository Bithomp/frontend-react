import { useEffect, useState } from 'react'
import Select from 'react-select'

export default function SimpleSelect({ value, setValue, optionsList }) {
  const [rendered, setRendered] = useState(false)
  const [choosenOption, setChoosenOption] = useState()

  useEffect(() => {
    setRendered(true)
    if (optionsList?.length === 0) return
    let found = false
    if (value) {
      for (let i = 0; i < optionsList.length; i++) {
        if (optionsList[i].value.toLowerCase() === value.toLowerCase()) {
          setChoosenOption(optionsList[i])
          found = true
          break
        }
      }
    }
    if (!found) {
      setValue(optionsList?.[0].value)
      setChoosenOption(optionsList?.[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  if (!rendered) return ''

  return (
    <Select
      instanceId="dropdown"
      value={choosenOption}
      options={optionsList}
      onChange={(a) => {
        setValue(a.value)
      }}
      isSearchable={false}
      className="dropdown dropdown--desktop"
      classNamePrefix="react-select"
    />
  )
}
