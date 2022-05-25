import '../assets/styles/components/checkbox.scss';

export default function CheckBox({ children, checked, setChecked }) {
  const handleChange = () => {
    setChecked(!checked);
  };

  return <label className="checkbox">
    {children}
    <input type="checkbox" onChange={handleChange} checked={checked} />
    <span className="checkmark"></span>
  </label>;
}