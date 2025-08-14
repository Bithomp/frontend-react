export const InputField = ({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  helpText,
  error,
  required = false,
  ...props
}) => (
  <div className={`flex flex-col gap-2 ${error ? 'error' : ''}`}>
    <label htmlFor={id} className={`font-bold ${error ? 'error' : ''}`}>
      {label}
    </label>
    <input
      id={id}
      name={id}
      type={type}
      className={`input-text input-bordered ${error ? 'error' : ''}`}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      {...props}
    />
    {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
    {error && <p className="text-sm text-red-500">{error}</p>}
  </div>
)
