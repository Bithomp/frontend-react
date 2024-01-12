import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import SearchBlock from "../../components/Layout/SearchBlock";
import SEO from "../../components/SEO";

export async function getServerSideProps(context) {
  return {
    props: {
      ...(await serverSideTranslations(context.locale, ["common"])),
    },
  };
}

const Container = ({ children }) => {
  return (
    <div className="content-center short-top">
      {children}
    </div>
  );
};

const TransactionSearch = () => {
  const { t } = useTranslation();

  return (
    <>
      <SEO
        page="Transaction Seacrh"
        title="Tranasction Search"
        description="Transaction details"
        // image={{ file: avatarSrc(txData) }}
      />
      <SearchBlock
        searchPlaceholderText={t("explorer.enter-address")}
        tab="explorer"
      />
      <Container>
        <h1 className='center'>Transaction Search</h1>
      </Container>
    </>
  );
};

export default TransactionSearch;
