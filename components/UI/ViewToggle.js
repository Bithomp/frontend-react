import { MdGridView, MdOutlineFormatListBulleted } from 'react-icons/md'

export default function ViewTogggle({ viewList, activeView, setActiveView, name = 'radio' }) {
  const Changed = (e) => {
    setActiveView(e.currentTarget.value)
  }

  return (
    <div className="view-toggle">
      <div className="view-toggle__wrap">
        {viewList.map((view) => (
          <div className="view-toggle__button" key={view.value}>
            <input
              type="radio"
              name={name}
              value={view.value}
              checked={view.value === activeView}
              onChange={Changed}
              id={view.value}
            />
            <label htmlFor={view.value}>
              {view.value === 'tiles' ? <MdGridView /> : <MdOutlineFormatListBulleted />}
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}
