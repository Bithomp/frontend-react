import { useTranslation } from 'react-i18next';

import '../assets/styles/screens/home.css';

function Home() {
  const { t } = useTranslation();

  const searchPlaceholderText = window.innerWidth > 500 ? t("home.search-placeholder") : t("home.search-placeholder-short");

  return (
    <>
      <div className="home-search">
        <input className="search-input" placeholder={searchPlaceholderText} />
      </div>
      <div className="home-sponsored">
      </div>
      <div className="home-converter">
      </div>
    </>
  );
}

export default Home;
