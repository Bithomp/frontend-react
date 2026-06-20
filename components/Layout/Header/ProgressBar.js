export default function ProgressBar({ goneSeconds, maxSeconds, className = '' }) {
  const completed = Math.max(0, Math.min(100, parseInt((goneSeconds / maxSeconds) * 100)))
  const minutes = Math.floor(goneSeconds / 60)
  let seconds = goneSeconds - minutes * 60
  seconds = seconds < 10 ? `0${seconds}` : seconds

  return (
    <div className={`progress-bar${className ? ` ${className}` : ''}`}>
      <div className="progress-bar-fill" style={{ width: `${completed}%` }} />
      <span className="progress-bar-label">{`${minutes}:${seconds}`}</span>
    </div>
  )
}
