export default function RadioOptions({ tabList, tab, setTab, name = "radio", style = {} }) {

    const Changed = (e) => {
      setTab(e.currentTarget.value);
    }

    return <div className='radio-options' style={style}>
        {tabList.map((tabItem) => (
            <div className='radio-input' key={tabItem.value}>
                <input
                    type="radio"
                    name={name}
                    value={tabItem.value}
                    checked={tabItem.value === tab}
                    onChange={Changed}
                    id={tabItem.value}
                />
                <label htmlFor={tabItem.value}>{tabItem.label}</label>
            </div>
        ))}
    </div>
};