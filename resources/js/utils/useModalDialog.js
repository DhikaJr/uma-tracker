import { useLayoutEffect, useRef } from 'react';

const dialogs = [];
const focusableSelector = 'button, a[href], input, select, textarea, [tabindex], [contenteditable="true"]';

function focusableElements(dialog) {
    return [...dialog.querySelectorAll(focusableSelector)].filter(element =>
        element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0
        && !element.closest('[inert], [aria-hidden="true"]') && getComputedStyle(element).visibility === 'visible'
    );
}

export function useModalDialog(open, onClose, trigger = null) {
    const dialogRef = useRef(null);
    const closeRef = useRef(onClose);
    useLayoutEffect(() => {
        closeRef.current = onClose;
    }, [onClose]);

    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (!open || !dialog) return;

        const previousFocus = trigger ?? document.activeElement;
        dialogs.push(dialog);
        (focusableElements(dialog)[0] ?? dialog).focus();

        const handleKey = (event) => {
            if (dialogs.at(-1) !== dialog || !['Escape', 'Tab'].includes(event.key)) return;
            event.stopImmediatePropagation();
            if (event.key === 'Escape') {
                event.preventDefault();
                if (!event.repeat) closeRef.current?.();
                return;
            }

            const elements = focusableElements(dialog);
            const index = elements.indexOf(document.activeElement);
            if (elements.length === 0 || index === -1 || (event.shiftKey ? index === 0 : index === elements.length - 1)) {
                event.preventDefault();
                ((event.shiftKey ? elements.at(-1) : elements[0]) ?? dialog).focus();
            }
        };
        window.addEventListener('keydown', handleKey, true);

        return () => {
            const wasTop = dialogs.at(-1) === dialog;
            dialogs.splice(dialogs.indexOf(dialog), 1);
            window.removeEventListener('keydown', handleKey, true);
            if (wasTop && previousFocus?.isConnected) previousFocus.focus();
        };
    }, [open, trigger]);

    return dialogRef;
}
