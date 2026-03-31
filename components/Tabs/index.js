export default function Tabs({ tabList = [], tab, setTab, name = 'radio', style = {} }) {
  return (
    <div className="tabs" style={style}>
      <div className="tabs-scroll">
        <div className="tabs-list" role="tablist" aria-label={name}>
          {tabList.map((tabItem) => (
            <button
              type="button"
              key={tabItem.value}
              className={tabItem.value === tab ? 'tab-item is-active' : 'tab-item'}
              onClick={() => setTab(tabItem.value)}
              role="tab"
              aria-selected={tabItem.value === tab}
              aria-current={tabItem.value === tab ? 'page' : undefined}
            >
              <span>{tabItem.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
