export default function robots(req, res) {
  res.setHeader("Content-Type", "text/plain")
  if (process.env.NEXT_PUBLIC_NETWORK_NAME === "mainnet") {
    res.send('User-agent: *\nDisallow: /api/\nDisallow: /go/')
  } else {
    res.send('User-agent: *\nAllow: /$\nDisallow: /\nDisallow: /go/')
  }
}