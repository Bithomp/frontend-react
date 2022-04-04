import sun from "../assets/images/sun.svg";
import moon from "../assets/images/moon.svg";

function Switch({ theme, switchTheme }) {
  return (
    <div className="switch">
      <div className={`switch-container ${theme}`} onClick={switchTheme}>
        <div className="switcher"></div>
        <img src={sun} className="switch-icon" alt="light mode" />
        <img src={moon} className="switch-icon" alt="dark mode" />
        <div class="credits">
          <div>Sun Icon made by
            <a href="https://www.flaticon.com/authors/smashicons" title="Smashicons">Smashicons</a>
            from
            <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a>
            is licensed by
            <a
              href="http://creativecommons.org/licenses/by/3.0/"
              title="Creative Commons BY 3.0"
            >CC 3.0 BY</a>
          </div>
          <div>Moon Icon made by
            <a
              href="https://www.flaticon.com/authors/vectors-market"
              title="Vectors Market">Vectors Market</a>
            from
            <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a>
            is licensed by
            <a
              href="http://creativecommons.org/licenses/by/3.0/"
              title="Creative Commons BY 3.0"
            >CC 3.0 BY</a>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Switch;
