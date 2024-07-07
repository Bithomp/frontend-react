import { useState } from "react";

export default function VerificationPopup() {
    const [isShown, setIsShown] = useState(true);

    return <>
        <div className={`verification-popup${isShown ? ' is-visible' : ''}`}>
            <div className="verification-popup__header">
                <h3>+18</h3>
                <p className="verification-popup__subtitle">ADULTS ONLY</p>
            </div>
            <p className="verification-popup__text">Please confirm that you’re over 18 or please, leave the website.</p>
            <div className="verification-popup__btns">
                <button className="verification-popup__btn">I am 18 or older</button>
                <button className="verification-popup__btn" onClick={() => setIsShown(!isShown)}>Close</button>
            </div>
        </div>
        <div className="verification-popup-overlay"></div>
    </>
};