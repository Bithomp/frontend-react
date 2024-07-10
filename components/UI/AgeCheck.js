import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next";

export default function AgeCheck() {
  const { t } = useTranslation(['common', 'popups']);
  const [isShown, setIsShown] = useState(true)

  const confirmAgeClick = () => {
    localStorage.setItem("isOver18", true)
    setIsShown(false)
  }

  useEffect(() => {
    const content = document.querySelector('.content-text');
    content && (content.style.zIndex = isShown ? 'auto' : '1');
  }, [isShown])

  return <>
    <div className={`age-check${isShown ? ' is-visible' : ''}`}>
      <div className="age-check__header">
        <h3>18+</h3>
        <p className="age-check__subtitle">{t("popup.age-verification.subtitle")}</p>
      </div>
      <p className="age-check__text">{t("popup.age-verification.text")}</p>
      <br />
      <div className="age-check__btns">
        <button className="age-check__btn" onClick={confirmAgeClick}>{t("popup.age-verification.button-true")}</button>
        <button className="age-check__btn" onClick={() => setIsShown(false)}>{t("popup.age-verification.button-false")}</button>
      </div>
    </div>
    <div className="age-check-overlay"></div>
  </>
}