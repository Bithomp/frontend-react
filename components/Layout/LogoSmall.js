import Logo from '../../public/images/logo-small.svg'
import { server, xahauNetwork } from '../../utils'
import { useTheme } from './ThemeContext'

export default function LogoSmall({ width, height, color, dependOnTheme }) {
  const { theme } = useTheme()

  if (server.includes('bithomp')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" id="A" viewBox="0 0 52 52" fill="#63a6b9" width={width} height={height}>
        <style jsx>
          {`
            #A #E {
              animation: shine-move 1.5s 1.5s ease-in-out both;
            }
            @keyframes shine-move {
              from {
                transform: translateX(-50px);
              }
              to {
                transform: translateX(50px);
              }
            }
          `}
        </style>
        <defs>
          <filter id="B" x="-20%" y="-20%" width="140%" height="140%" primitiveUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="3 3" x="0%" y="0%" width="100%" height="100%" in="SourceGraphic" />
          </filter>
          <mask id="D" x="0" y="-9.03" width="45" height="69.77" maskUnits="userSpaceOnUse">
            <path
              id="D"
              d="M.5 13.5l15.6-8.9 15.7 9v3.9L16.2 8.6.5 17.5zM4 22.7l12.2-6.9 15.6 8.9v-4l-15.5-8.9L.5 20.7v17.8l3.5 2zm37-11.2l-.1 17.8-15.6 8.9 3.5 2 15.7-9V13.5zm-6.3.4v13.8L19 34.6l3.6 2.1 15.6-8.9V9.9L22.5 1 19 3zM26 49l-15.6-8.9V22.2l-3.5 2v17.9L22.5 51zm2.8-5.6l-12.2-6.9.1-17.8-3.6 2v17.7l15.6 9 15.7-8.9v-4z"
              fill="#fff"
            />
          </mask>
        </defs>
        <path
          d="M.5 13.5l15.6-8.9 15.7 9v3.9L16.2 8.6.5 17.5zM4 22.7l12.2-6.9 15.6 8.9v-4l-15.5-8.9L.5 20.7v17.8l3.5 2zm37-11.2l-.1 17.8-15.6 8.9 3.5 2 15.7-9V13.5zm-6.3.4v13.8L19 34.6l3.6 2.1 15.6-8.9V9.9L22.5 1 19 3zM26 49l-15.6-8.9V22.2l-3.5 2v17.9L22.5 51zm2.8-5.6l-12.2-6.9.1-17.8-3.6 2v17.7l15.6 9 15.7-8.9v-4z"
          fill="#63a6b9"
        />
      </svg>
    )
  }

  let fill = color || xahauNetwork ? '#ffcc53' : '#4ba8b6'
  if (dependOnTheme && theme === 'light' && xahauNetwork) {
    fill = '#0E233F'
  }
  return <Logo width={width} height={height} fill={fill} />
}
