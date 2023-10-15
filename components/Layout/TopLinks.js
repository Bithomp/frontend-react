import { useTranslation } from 'next-i18next'

export default function TopLinks() {
  const { t } = useTranslation();

  return (
    <div className="top-links">
      <span className='tooltip'>
        <a
          href="https://bithomp.com/go/top-buy"
          target="_blank"
          rel="noreferrer"
          className='top-link'
        >
          Buy XRP
        </a>
        {/* important to have it here right, otherwise brakes UI on mobiles */}
        <span className='tooltiptext right small'>
          {t("sponsored.sponsored")}
        </span>
      </span>

      <span style={{ padding: "0 10px" }}>|</span>

      <span className='tooltip'>
        <a
          href="https://bithomp.com/go/top-exchange"
          target="_blank"
          rel="noreferrer"
          className='top-link'
        >
          Exchange crypto
        </a>
        <span className='tooltiptext right small'>
          {t("sponsored.sponsored")}
        </span>
      </span>

      <span style={{ padding: "0 10px" }}>|</span>

      <span className='tooltip'>
        <a
          href="https://bithomp.com/go/top-play"
          target="_blank"
          rel="noreferrer"
          className='top-link'
        >
          XRP Play
        </a>
        {/* important to have it here left, otherwise brakes UI on mobiles */}
        <span className='tooltiptext left small'>
          {t("sponsored.sponsored")}
        </span>
      </span>
    </div>
  );
};