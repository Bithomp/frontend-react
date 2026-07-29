const PLATFORM_HOSTS = {
  twitter: ['x.com', 'twitter.com'],
  instagram: ['instagram.com'],
  facebook: ['facebook.com'],
  youtube: ['youtube.com'],
  linkedin: ['linkedin.com'],
  reddit: ['reddit.com'],
  medium: ['medium.com'],
  telegram: ['t.me', 'telegram.me']
}

const PLATFORM_ORIGINS = {
  twitter: 'https://x.com',
  instagram: 'https://www.instagram.com',
  facebook: 'https://www.facebook.com',
  youtube: 'https://www.youtube.com',
  linkedin: 'https://www.linkedin.com',
  reddit: 'https://www.reddit.com',
  medium: 'https://medium.com',
  telegram: 'https://t.me'
}

const cleanPath = (value) =>
  String(value || '')
    .trim()
    .split(/[?#]/)[0]
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/{2,}/g, '/')

const pathFromPlatformUrl = (platform, value) => {
  const input = String(value || '').trim()
  if (!input) return ''
  if (platform === 'facebook' && /^profile\.php\?id=[a-z0-9._-]+$/i.test(input)) return input

  const urlInput = /^(?:https?:)?\/\//i.test(input)
    ? input.startsWith('//')
      ? `https:${input}`
      : input
    : /^(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}\//i.test(input)
      ? `https://${input}`
      : ''

  if (!urlInput) return cleanPath(input)

  try {
    const url = new URL(urlInput)
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    const allowedHosts = PLATFORM_HOSTS[platform] || []
    if (!allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
      return ''
    }
    if (platform === 'facebook' && url.pathname.replace(/^\/+/, '') === 'profile.php' && url.searchParams.get('id')) {
      return `profile.php?id=${url.searchParams.get('id')}`
    }
    return cleanPath(url.pathname)
  } catch {
    return cleanPath(input)
  }
}

const firstPathSegment = (path) => path.split('/')[0].replace(/^@/, '')

export const normalizeSocialAccount = (platform, value) => {
  const path = pathFromPlatformUrl(platform, value)
  if (!path) return ''

  if (['twitter', 'instagram', 'telegram'].includes(platform)) {
    return firstPathSegment(path)
  }

  if (platform === 'youtube') {
    const [type, identifier] = path.split('/')
    if (['channel', 'c', 'user'].includes(type) && identifier) return `${type}/${identifier}`
    return `@${firstPathSegment(path)}`
  }

  if (platform === 'reddit') {
    const [type, identifier] = path.split('/')
    if (['user', 'u', 'r'].includes(type) && identifier) {
      return `${type === 'u' ? 'user' : type}/${identifier}`
    }
    return `user/${firstPathSegment(path)}`
  }

  if (platform === 'linkedin') {
    const [type, identifier] = path.split('/')
    if (['company', 'in', 'school', 'showcase'].includes(type) && identifier) return `${type}/${identifier}`
    return `company/${firstPathSegment(path)}`
  }

  return path
}

export const socialAccountUrl = (platform, value) => {
  const origin = PLATFORM_ORIGINS[platform]
  const storedValue = cleanPath(value)
  if (platform === 'youtube' && storedValue && !storedValue.includes('/') && !storedValue.startsWith('@')) {
    return `${origin}/${storedValue}`
  }
  const account = normalizeSocialAccount(platform, value)
  return origin && account ? `${origin}/${account}` : ''
}
