import { IoMdClose } from 'react-icons/io'
import { useState, useEffect } from 'react'
import { IoSearch } from 'react-icons/io5'

export default function FormInput({
  placeholder,
  title,
  setValue,
  defaultValue,
  disabled,
  hideButton,
  setInnerValue,
  onKeyPress
}) {
  const [inputInnerValue, setInputInnerValue] = useState('')

  useEffect(() => {
    if (defaultValue || defaultValue === '0' || defaultValue === 0) {
      setInputInnerValue(defaultValue)
    }
  }, [defaultValue])

  useEffect(() => {
    if (setInnerValue) {
      setInnerValue(inputInnerValue)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputInnerValue])

  const onChange = (e) => {
    const value = e.target.value
    if (value !== '0' && !value) {
      clearAll()
    } else {
      setInputInnerValue(value)
    }
  }

  const onKeyUp = (e) => {
    const value = e.target.value
    if (e.key === 'Enter') {
      if (setValue) {
        setValue(value)
      }
      return
    }
  }

  const onSearchClick = () => {
    if (setValue) {
      setValue(inputInnerValue)
    }
    setInputInnerValue(inputInnerValue)
  }

  const clearAll = () => {
    if (setValue) {
      setValue('')
    }
    setInputInnerValue('')
  }

  return (
    <div className="center">
      <span className="input-title">{title}</span>
      <div className={`form-input ${disabled ? ' disabled' : ''}`}>
        <div className="form-input__wrap">
          <input
            className={`simple-input${inputInnerValue ? ' not-empty' : ''}`}
            placeholder={placeholder}
            onChange={onChange}
            onKeyUp={onKeyUp}
            value={inputInnerValue}
            disabled={disabled}
            spellCheck="false"
            onKeyPress={onKeyPress}
          />
          {!disabled && (
            <div className="form-input__btns">
              <button className="form-input__clear" onClick={clearAll}>
                <IoMdClose />
              </button>
              {!hideButton && (
                <div className="search-button" onClick={onSearchClick}>
                  <IoSearch />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
