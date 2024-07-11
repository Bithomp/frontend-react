import { useTranslation } from "react-i18next"

export default function AgeCheck({ setShowAgeCheck }) {
  const { t } = useTranslation()

  const confirmAgeClick = () => {
    localStorage.setItem("isOver18", true)
    setShowAgeCheck(false)
  }

  return <div className="age-check">
    <div className="age-check__header">
      <h3>18+</h3>
      <p className="age-check__subtitle">
        {t("age-check.subtitle", { ns: "popups" })}
      </p>
    </div>
    <p className="age-check__text">
      {t("age-check.text", { ns: "popups" })}
    </p>
    <br />
    <div className="age-check__btns">
      <button className="age-check__btn" onClick={confirmAgeClick}>
        {t("age-check.button-true", { ns: "popups" })}
      </button>
      <button className="age-check__btn" onClick={() => setShowAgeCheck(false)}>
        {t("age-check.button-false", { ns: "popups" })}
      </button>
    </div>
  </div>
}