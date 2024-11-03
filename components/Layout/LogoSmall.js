import Logo from '../../public/images/logo-small.svg'
import { xahauNetwork } from '../../utils'
import { useTheme } from './ThemeContext'

export default function LogoSmall({ width, height, color, dependOnTheme }) {
  const { theme } = useTheme()
  let fill = color || xahauNetwork ? '#ffcc53' : '#4ba8b6'
  if (dependOnTheme && theme === 'light' && xahauNetwork) {
    fill = '#0E233F'
  }
  return <Logo width={width} height={height} fill={fill} />
}
