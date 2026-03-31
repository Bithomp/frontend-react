import { useEffect, useRef } from 'react'

export default function Tabs({ tabList = [], tab, setTab, name = 'radio', style = {} }) {
  const tabsRef = useRef(null)

  useEffect(() => {
    const activeTab = tabsRef.current?.querySelector('[aria-selected="true"]')
    activeTab?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [tab])

  return (
    <div className="tabs" style={style}>
      <div className="tabs-scroll">
        <div className="tabs-list" role="tablist" aria-label={name} ref={tabsRef}>
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
