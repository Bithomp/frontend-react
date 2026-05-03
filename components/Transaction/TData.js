import { useTranslation } from 'next-i18next'

import { TData as BaseTData } from '../Table'

const MISSING_TRANSLATION = '__missing_translation__'

const translateText = (t, section, value) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed || trimmed === '&nbsp;') return value

  const translated = t(`${section}.${trimmed}`, { defaultValue: MISSING_TRANSLATION })
  if (translated && translated !== MISSING_TRANSLATION) return translated

  if (section !== 'values') {
    const translatedValue = t(`values.${trimmed}`, { defaultValue: MISSING_TRANSLATION })
    if (translatedValue && translatedValue !== MISSING_TRANSLATION) return translatedValue
  }

  return value
}

export const TData = ({ tooltip, children, ...props }) => {
  const { t } = useTranslation('transaction')
  const translatedTooltip = translateText(t, 'tooltips', tooltip)
  const translatedChildren = translateText(t, 'labels', children)

  return (
    <BaseTData tooltip={translatedTooltip} {...props}>
      {translatedChildren}
    </BaseTData>
  )
}

export const TransactionValue = ({ value }) => {
  const { t } = useTranslation('transaction')

  return translateText(t, 'values', value)
}
