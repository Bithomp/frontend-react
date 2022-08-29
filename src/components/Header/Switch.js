import sun from "../../assets/images/sun.svg";
import moon from "../../assets/images/moon.svg";

export default function Switch({ theme, switchTheme }) {
  return (
    <div className="theme-switch">
      <div className={`switch-container ${theme}`} onClick={switchTheme}>
        <img src={sun} className="switch-icon sun" alt="light mode" />
        <img src={moon} className="switch-icon moon" alt="dark mode" />
      </div>
    </div>
  );
};
