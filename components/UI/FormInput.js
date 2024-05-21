import { IoMdClose } from "react-icons/io"
import { useState, useEffect } from 'react'

export default function FormInput({ placeholder, title, setValue, defaultValue, disabled }) {

  const [inputValue, setInputValue] = useState("")

  useEffect(() => {
    if (defaultValue) {
      setInputValue(defaultValue)
    }
  }, [defaultValue])

  const onChange = e => {
    const value = e.target.value
    if (!value) {
      clearAll()
    } else {
      setInputValue(value)
    }
  }

  const onKeyUp = e => {
    const value = e.target.value
    if (e.key === 'Enter') {
      setValue(value)
      return
    }
  }

  const onSearchClick = () => {
    setValue(inputValue)
    setInputValue(inputValue)
  }

  const clearAll = () => {
    setValue("")
    setInputValue("")
  }

  return (
    <div className="center">
      <span className='input-title'>{title}</span>
      <div className={`address-input address-input--issuer${disabled ? ' disabled' : ''}`}>
        <div className="address-input__wrap">
          <input
            className={`address-input__input${inputValue ? ' not-empty' : ''}`}
            placeholder={placeholder}
            onChange={onChange}
            onKeyUp={onKeyUp}
            value={inputValue}
            disabled={disabled}
            spellCheck="false"
          />
          <div className="address-input__btns">
            <button className="address-input__clear" onClick={clearAll}>
              <IoMdClose />
            </button>
            <div className='search-button' onClick={onSearchClick}>
              <img
                src='/images/search.svg'
                className='search-icon'
                alt='search'
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}