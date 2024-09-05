export default function Tabs({ tabList, tab, setTab, name = 'radio', style = {} }) {
  const Changed = (e) => {
    setTab(e.currentTarget.value)
  }

  return (
    <div className="tabs" style={style}>
      <div className="tabs-list">
        {tabList.map((tabItem) => (
          <input
            key={tabItem.value}
            type="radio"
            name={name}
            value={tabItem.value}
            checked={tabItem.value === tab}
            onChange={Changed}
            label={tabItem.label}
            id={tabItem.value}
          />
        ))}
      </div>
    </div>
  )
}
