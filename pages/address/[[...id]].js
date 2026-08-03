export async function getServerSideProps({ params }) {
  const segments = Array.isArray(params?.id) ? params.id : []
  const destination = segments.length
    ? `/account/${segments.map(encodeURIComponent).join('/')}`
    : '/account'

  return {
    redirect: {
      destination,
      permanent: true
    }
  }
}

export default function LegacyAddressRedirect() {
  return null
}
