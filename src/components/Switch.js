import sun from "../assets/images/sun.svg";
import moon from "../assets/images/moon.svg";

function Switch({ theme, switchTheme }) {
  return (
    <div className="switch">
      <div className={`switch-container ${theme}`} onClick={switchTheme}>
        <div className="switcher"></div>
        <img src={sun} className="switch-icon" alt="light mode" />
        <img src={moon} className="switch-icon" alt="dark mode" />
      </div>
    </div>
  );
}
export default Switch;
