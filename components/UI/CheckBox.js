export default function CheckBox({ children, checked, setChecked, name, outline, style, checkmarkStyle, disabled }) {
  const handleChange = () => {
    setChecked(!checked)
  }

  return (
    <label className={`checkbox${outline ? ' checkbox--outline' : ''}`} style={style}>
      {children}
      <input
        type="checkbox"
        onChange={handleChange}
        checked={checked === 'true' ? true : checked}
        name={name || 'checkbox'}
        disabled={disabled}
      />
      <span className="checkmark" style={checkmarkStyle}></span>
    </label>
  )
}
