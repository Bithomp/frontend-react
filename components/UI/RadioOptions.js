export default function RadioOptions({ tabList, tab, setTab, name = 'radio', style = {}, getLogo }) {
  const Changed = (e) => {
    setTab(e.currentTarget.value)
  }

  return (
    <div className={`radio-options${tabList.length > 3 ? ' radio-options--large' : ''}`} style={style}>
      {tabList.map((tabItem) => (
        <div className="radio-input" key={tabItem.value}>
          <input
            type="radio"
            name={name}
            value={tabItem.value}
            checked={tabItem.value === tab}
            onChange={Changed}
            id={tabItem.value}
          />
          <label htmlFor={tabItem.value} style={getLogo ? { display: 'flex', alignItems: 'center', gap: 8 } : {}}>
            {getLogo && (
              <img
                src={getLogo(tabItem.value)}
                alt={tabItem.label + ' logo'}
                style={{ width: 24, height: 24, objectFit: 'contain', display: 'inline-block' }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
            )}
            {tabItem.label}
          </label>
        </div>
      ))}
    </div>
  )
}
