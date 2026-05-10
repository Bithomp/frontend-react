export default function RadioOptions({ tabList, tab, setTab, name = 'radio', style = {}, getLogo, className = '' }) {
  const Changed = (e) => {
    setTab(e.currentTarget.value)
  }

  return (
    <div
      className={`radio-options${tabList.length > 3 ? ' radio-options--large' : ''}${getLogo ? ' radio-options--with-logos' : ''}${className ? ' ' + className : ''}`}
      style={style}
    >
      {tabList.map((tabItem) => {
        const inputId = `${name}-${String(tabItem.value).replace(/\s+/g, '-')}`
        return (
          <div className="radio-input" key={tabItem.value}>
            <input
              id={inputId}
              type="radio"
              name={name}
              value={tabItem.value}
              checked={tabItem.value === tab}
              onChange={Changed}
            />
            <label htmlFor={inputId}>
              {getLogo && (
                <span className="radio-logo-badge" aria-hidden="true">
                  <img
                    src={getLogo(tabItem.value)}
                    alt=""
                    onError={(e) => {
                      e.target.parentElement.style.display = 'none'
                    }}
                  />
                </span>
              )}
              {tabItem.label}
            </label>
          </div>
        )
      })}
    </div>
  )
}
