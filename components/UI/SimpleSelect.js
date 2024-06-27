import { useEffect, useState } from "react"
import Select from 'react-select'

export default function SimpleSelect({ setValue, optionsList, choosenOption }) {

  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  if (!ready) return ""

  return <Select
    instanceId="dropdown"
    value={choosenOption}
    options={optionsList}
    onChange={a => {
      setValue(a.value)
    }}
    isSearchable={false}
    className="dropdown dropdown--desktop"
    classNamePrefix="dropdown"
  />
}