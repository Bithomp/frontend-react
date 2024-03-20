const arrowTop = "/images/arrow-top.svg"

export default function ButtonScrollTop() {

    const scrollTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return (
        <button className="button-arrow-scroll" onClick={scrollTop}>
            <img src={arrowTop} className="arrow-top" alt="arrow to scroll top" />
        </button>
    )
}