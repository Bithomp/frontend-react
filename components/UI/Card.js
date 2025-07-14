import PropTypes from 'prop-types'

import styles from '@/styles/components/card.module.css'

export default function Card({ 
    children, 
    className = '',
    as,
    href,
    ...rest
}) {
    const Component = as || (href ? 'a' : 'div');
    const isInteractive = !!(href || rest.onClick);

    // Prevent accidental form submissions when Card is rendered as a button.
    const type = Component === 'button' ? 'button' : undefined;

    return (
        <Component 
            className={`${styles.card} ${className}`.trim()}
            href={href}
            type={type}
            // An interactive card should be focusable.
            // Let developers override this if needed.
            tabIndex={isInteractive && rest.tabIndex === undefined ? 0 : rest.tabIndex}
            {...rest}
        >
            {children}
        </Component>
    )
}

Card.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    // The component to render as.
    // @default 'div' or 'a' if 'href' is present.
    as: PropTypes.elementType,

    // If provided, the card will render as an `<a>` tag.
    href: PropTypes.string,
}
