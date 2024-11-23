import MobileDetect from 'mobile-detect'
import { createContext, useContext } from 'react'
import { useWidth } from '.'

export const IsSsrMobileContext = createContext(false)

export const getIsSsrMobile = (context) => {
  const md = new MobileDetect(context.req.headers['user-agent'])
  return Boolean(md.mobile())
}

export const useIsMobile = () => {
  const isSsrMobile = useContext(IsSsrMobileContext)
  const windowWidth = useWidth()
  const isBrowserMobile = !!windowWidth && windowWidth < 992
  return isSsrMobile || isBrowserMobile
}
