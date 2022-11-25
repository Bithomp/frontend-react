import './styles.scss';

export default function Tabs({ tabList, tab, setTab }) {

  const Changed = (e) => {
    setTab(e.currentTarget.value);
  }

  return <div className='tabs'>
    <div className='tabs-list'>
      {tabList.map((tabItem) => (
        <input
          key={tabItem.value}
          type="radio"
          name="gender"
          value={tabItem.value}
          checked={tabItem.value === tab}
          onChange={Changed}
          label={tabItem.label}
          id={tabItem.value}
        />
      ))}
    </div>
  </div>
};
