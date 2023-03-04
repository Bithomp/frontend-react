export default function ProgressBar({ goneSeconds, maxSeconds }) {

  let completed = parseInt((goneSeconds / maxSeconds) * 100);
  let minutes = Math.floor(goneSeconds / 60);
  let seconds = goneSeconds - minutes * 60;
  seconds = seconds < 10 ? "0" + seconds : seconds;

  const containerStyles = {
    height: 22,
    width: '60%',
    backgroundColor: "#e0e0de",
    borderRadius: 50,
    margin: 10,
    textAlign: 'center',
    display: "inline-block"
  }

  const fillerStyles = {
    height: '100%',
    width: `${completed}%`,
    backgroundColor: "#008ffb",
    borderRadius: 'inherit',
    textAlign: 'center'
  }

  const labelStyles = {
    padding: 5,
    color: 'white',
    fontWeight: 'bold'
  }

  return (
    <div style={containerStyles}>
      <div style={fillerStyles}>
        <span style={labelStyles}>{`${minutes}:${seconds}`}</span>
      </div>
    </div>
  );
};