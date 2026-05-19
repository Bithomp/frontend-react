export default function InputField({
  className = '',
  error,
  helpText,
  id,
  label,
  onChange,
  placeholder,
  required = false,
  inputProps = {},
  type = 'text',
  value
}) {
  return (
    <label className={`notification-field${className ? ` ${className}` : ''}`} htmlFor={id}>
      <span>
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        {...inputProps}
        className={'input-text' + (error ? ' error' : '')}
        id={id}
        name={id}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
      {helpText && <small>{helpText}</small>}
      {error && <strong>{error}</strong>}
    </label>
  )
}
