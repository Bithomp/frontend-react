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
    <>
      {children}
    </>
  );
};

const TransactionSearch = () => {
  return (
    <>
      <SEO
        page="Transaction search"
        title="Tranasction search"
        description="Transaction details"
      // image={{ file: avatarSrc(txData) }}
      />
      <SearchBlock tab="transaction" />
      <Container>
        <h1 className='center'>Transaction search</h1>
      </Container>
    </>
  );
};

export default TransactionSearch;
