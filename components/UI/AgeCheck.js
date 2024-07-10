import { useState } from "react"

export default function AgeCheck() {
  const [isShown, setIsShown] = useState(true)

  const confirmAgeClick = () => {
    localStorage.setItem("isOver18", true)
    setIsShown(false)
  }

  return <>
    <div className={`age-check${isShown ? ' is-visible' : ''}`}>
      <div className="age-check__header">
        <h3>18+</h3>
        <p className="age-check__subtitle">Explicit content</p>
      </div>
      <p className="age-check__text">
        This will enable explicit and sensitive content. You must be of the legal age to view this.
      </p>
      <br />
      <div className="age-check__btns">
        <button className="age-check__btn" onClick={confirmAgeClick}>Yes, I'm over 18</button>
        <button className="age-check__btn" onClick={() => setIsShown(false)}>No, I'm not</button>
      </div>
    </div>
    <div className="age-check-overlay"></div>
  </>
}