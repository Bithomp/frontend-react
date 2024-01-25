export default function CheckBox({ children, checked, setChecked, name }) {
  const handleChange = () => {
    setChecked(!checked)
  };

  return <label className="checkbox">
    {children}
    <input
      type="checkbox"
      onChange={handleChange}
      checked={checked === "true" ? true : checked}
      name={name || "checkbox"}
    />
    <span className="checkmark"></span>
  </label>
}