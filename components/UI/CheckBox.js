export default function CheckBox({ children, checked, setChecked, name, outline, style }) {
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
      />
      <span className="checkmark"></span>
    </label>
  )
}
