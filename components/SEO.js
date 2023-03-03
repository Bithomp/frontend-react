import { Helmet } from 'react-helmet-async';

const network = process.env.NEXT_PUBLIC_NETWORK_NAME ? process.env.NEXT_PUBLIC_NETWORK_NAME : "mainnet";

const Title = (title) => {
  if (network === 'mainnet') {
    return 'XRPL ' + title;
  } else {
    return 'XRPL ' + network.toUpperCase() + ": " + title;
  }
}

export default function SEO({ title, description, name, type }) {

  title = Title(title);
  description = Title(description);

  return (
    <Helmet>
      <title>{title}</title>
      {description && <meta name='description' content={description} />}

      { /* Facebook tags */}
      {type && <meta property="og:type" content={type} />}
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}

      { /* Twitter tags */}
      {name && <meta name="twitter:creator" content={name} />}
      {type && <meta name="twitter:card" content={type} />}
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
    </Helmet>
  )
}
