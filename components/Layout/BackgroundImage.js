import { renderToStaticMarkup } from 'react-dom/server'

import { devNet } from '../../utils'

function svgImage(network) {
  return (
    <svg viewBox="0 0 1280 1000" fill="#3fa3b5" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <path id="path-0" d="M 264.765 361.818 C 275.58 356.202 280.705 351.87 286.364 348.287 C 293.007 344.082 297.91 340.527 303.142 337.412 C 309.151 333.872 313.587 330.801 318.147 327.886 C 323.121 324.983 328.01 322.834 332.026 319.594 C 335.996 316.487 341.934 314.874 345.97 312.636 C 349.348 311.208 354.115 307.394 356.377 305.509 C 362.12 304.579 366.291 302.898 371.404 303.376 L 373.047 303.975 C 373.871 305.121 373.395 307.374 373.395 308.762" fill="none" />
      </defs>
      <path d="M103,202.7l129.7-73.1L364,203.5v32.6l-130.5-73.9L103,236V202.7zM132.4,425.9L103,409.2V261.5l131.3-73.1L364,262.2v32.6l-130.5-73.1l-101.1,57.2V425.9zM470,202.7v146.1l-131.3,74.7l-28.5-16.7l130.5-73.9V186L470,202.7zM257.1,116.1l29.4-16.7l131.3,73.9V321l-130.5,73.1l-30.2-16.7l130.5-73.9l0.8-114.4L257.1,116.1zM286.5,512.4l-130.5-73V291.6l29.4-16.7v146.9L315,495.7L286.5,512.4zM469.2,375.8v33.4l-130.5,73.9l-130.5-74.7V262.2l29.4-16.7v146.9l101.9,57.2L469.2,375.8zM810,412.8l129.7-73.1l131.3,73.9v32.6l-130.5-73.9L810,446.2V412.8zM839.4,636L810,619.3V471.6l131.3-73l129.7,73.8V505l-130.5-73.1l-101.1,57.2V636zM1177,412.8v146.1l-131.3,74.7l-28.5-16.7l130.5-73.9V396.2L1177,412.8zM964.1,326.3l29.4-16.7l131.3,73.9v147.7l-130.5,73.1l-30.2-16.7l130.5-73.9l0.8-114.4L964.1,326.3zM993.5,722.6L863,649.5V501.8l29.4-16.7V632l129.6,73.9L993.5,722.6zM1176.2,586v33.4l-130.5,73.9l-130.5-74.7V472.4l29.4-16.7v146.9l101.9,57.2L1176.2,586z" fillOpacity=".07" />
      <text fillOpacity="0.07" fontFamily="Arial, sans-serif" fontSize="39px" fontWeight="700" transform="matrix(0.995741, -0.551878, 0.602981, 1.087945, 112.795227, 886.728882)" x="751.169" y="274.211">{network}</text>
      <text fillOpacity="0.07" fontFamily="Arial, sans-serif" fontSize="39px" fontWeight="700" transform="matrix(0.995681, 0.551986, -0.603099, 1.08788, -508.582031, -246.406937)" x="751.169" y="274.211">{network}</text>
      <text fillOpacity="0.07" fontFamily="Arial, sans-serif" fontSize="39px" fontWeight="700" transform="matrix(0.000061, -1.138451, 1.243869, 0.000067, 894.281616, 1475.78772)" x="751.169" y="274.211">{network}</text>
      <text fillOpacity="0.07" fontFamily="Arial, sans-serif" fontSize="39px" fontWeight="700" transform="matrix(0.000061, -1.138451, 1.243869, 0.000067, 189.426941, 1263.691895)" x="751.169" y="274.211">{network}</text>
      <text fillOpacity="0.07" fontFamily="Arial, sans-serif" fontSize="39px" fontWeight="700" transform="matrix(0.995741, -0.551878, 0.602981, 1.087945, -590.14679, 678.383423)" x="751.169" y="274.211">{network}</text>
      <text fillOpacity="0.07" fontFamily="Arial, sans-serif" fontSize="39px" fontWeight="700" transform="matrix(0.995681, 0.551986, -0.603099, 1.08788, 201.599731, -39.169476)" x="751.169" y="274.211">{network}</text>
      <text fillOpacity="0.07" fontFamily="Arial, sans-serif" fontSize="39px" fontWeight="700" transform="matrix(0.995741, -0.551878, 0.602981, 1.087945, -116.065193, 507.650909)" x="751.169" y="274.211">{network}</text>
      <text fillOpacity="0.07" fontFamily="Arial, sans-serif" fontSize="39px" fontWeight="700" transform="matrix(0.995681, 0.551986, -0.603099, 1.08788, 419.582611, -423.543396)" x="751.169" y="274.211">{network}</text>
      <text fillOpacity="0.07" fontFamily="Arial, sans-serif" fontSize="39px" fontWeight="700" transform="matrix(0.000061, -1.138451, 1.243869, 0.000067, 443.501831, 1476.827271)" x="751.169" y="274.211">{network}</text>
      <text fillOpacity="0.07" fontFamily="Arial, sans-serif" fontSize="39px" fontWeight="700" transform="matrix(0.000061, -1.138451, 1.243869, 0.000067, -265.156128, 1267.685181)" x="751.169" y="274.211">{network}</text>
      <text fillOpacity="0.07" fontFamily="Arial, sans-serif" fontSize="39px" fontWeight="700" transform="matrix(0.995741, -0.551878, 0.602981, 1.087945, -829.592407, 303.541168)" x="751.169" y="274.211">{network}</text>
      <text fillOpacity="0.07" fontFamily="Arial, sans-serif" fontSize="39px" fontWeight="700" transform="matrix(0.995681, 0.551986, -0.603099, 1.08788, -289.70639, -632.31012)" x="751.169" y="274.211">{network}</text>
    </svg>
  )
}

let backgroundText = ''

if (devNet) {
  backgroundText = devNet.includes('testnet') ? 'testnet' : devNet
}

const svgString = encodeURIComponent(renderToStaticMarkup(svgImage(backgroundText.toUpperCase())))

export default function BackgroundImage() {
  return <div className="background" style={{ backgroundImage: `url("data:image/svg+xml,${svgString}")` }}></div>
}