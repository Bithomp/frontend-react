import { useCallback, useEffect, useState } from "react";

const arrowTop = "/images/arrow-top.svg"

export default function ButtonScrollTop({footer}) {

    const [buttonState, setButtonState] = useState({ isShown: false, isFixedButton: false });

    const handleScroll = useCallback(() => {
        const scrollPosition = window.pageYOffset + window.innerHeight;
        const isShown = window.pageYOffset !== 0;
        const isFixedButton = scrollPosition > footer.current.offsetTop;

        setButtonState({ isShown, isFixedButton });
    }, [footer]);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const scrollTop = useCallback(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    return (
        <button className={'button-arrow-scroll' + (buttonState.isShown ? ' is-shown' : '') + (buttonState.isFixedButton ? ' is-fixed' : '')} onClick={scrollTop}>
            <img src={arrowTop} className="arrow-top" alt="arrow to scroll top" />
        </button>
    )
}