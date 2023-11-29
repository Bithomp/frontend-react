export default function CheckBox({ children, checked, setChecked }) {
  const handleChange = () => {
    setChecked(!checked);
  };

  return <label className="checkbox">
    {children}
    <input type="checkbox" onChange={handleChange} checked={checked === "true" ? true : checked} />
    <span className="checkmark"></span>
  </label>;
}