import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../../styles/components/dialog.module.css';

export default function Dialog({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    size = 'medium',
    showCloseButton = true 
}) {
    const dialogRef = useRef(null);
    const [portalTarget, setPortalTarget] = useState(null);

    // Set up portal target after component mounts (client-side only)
    useEffect(() => {
        setPortalTarget(document.body);
    }, []);

    // Handle escape key to close dialog
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll when dialog is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    // Handle click outside to close dialog
    const handleBackdropClick = (event) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    if (!isOpen || !portalTarget) return null;

    const dialogContent = (
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div 
                ref={dialogRef}
                className={`${styles.dialog} ${styles[size]}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? "dialog-title" : undefined}
            >
                <div className={styles.header}>
                    {title && (
                        <h2 id="dialog-title" className={styles.title}>
                            {title}
                        </h2>
                    )}
                    {showCloseButton && (
                        <button
                            type="button"
                            className={styles.closeButton}
                            onClick={onClose}
                            aria-label="Close dialog"
                        >
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    )}
                </div>
                <div className={styles.content}>
                    {children}
                </div>
            </div>
        </div>
    );

    // Use portal to render dialog at document root level
    return createPortal(dialogContent, portalTarget);
}
