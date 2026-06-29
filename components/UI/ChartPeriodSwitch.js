import { useTranslation } from 'next-i18next'

import { CHART_PERIODS, DEFAULT_CHART_PERIOD, normalizeChartPeriod } from '../../utils/chartPeriods'

export default function ChartPeriodSwitch({ value = DEFAULT_CHART_PERIOD, periods = CHART_PERIODS, onChange, ariaLabel }) {
  const { t } = useTranslation('common')
  const displayPeriods = periods.filter(
    (period, index) => CHART_PERIODS.includes(period) && periods.indexOf(period) === index
  )
  const normalizedPeriods = displayPeriods.length ? displayPeriods : CHART_PERIODS
  const normalizedValue = normalizeChartPeriod(value)
  const activePeriod = normalizedPeriods.includes(normalizedValue) ? normalizedValue : normalizedPeriods[0]

  return (
    <div className="chart-period-switch" role="group" aria-label={ariaLabel || t('chart-period.aria-label')}>
      {normalizedPeriods.map((period) => (
        <button
          key={period}
          type="button"
          className={activePeriod === period ? 'active' : ''}
          onClick={() => onChange?.(period)}
          aria-pressed={activePeriod === period}
        >
          {t(`chart-period.${period}`)}
        </button>
      ))}
      <style jsx>{`
        .chart-period-switch {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          box-sizing: border-box;
          padding: 3px;
          border: 1px solid var(--chip-border);
          border-radius: 8px;
          background: var(--chip-bg);
          box-shadow: var(--chip-shadow);
        }

        button {
          min-width: 42px;
          height: 28px;
          padding: 0 9px;
          border: 0;
          border-radius: 6px;
          color: var(--text-secondary);
          background: transparent;
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
        }

        button:hover,
        button:focus-visible {
          color: var(--link-color);
          outline: none;
        }

        button.active {
          color: #fff;
          background: var(--accent-link);
        }

        @media only screen and (max-width: 520px) {
          .chart-period-switch {
            width: 100%;
            justify-content: stretch;
          }

          button {
            flex: 1 1 0;
            min-width: 0;
          }
        }
      `}</style>
    </div>
  )
}
