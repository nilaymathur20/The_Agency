import { useEffect, useRef } from 'react';
export function useFocusTrap(enabled = true) {
    const ref = useRef(null);
    useEffect(() => {
        if (!enabled || !ref.current)
            return;
        const selectors = ['button', 'a', 'input', 'select', 'textarea', '[tabindex]'];
        const getFocusables = () => Array.from(ref.current.querySelectorAll(selectors.join(', ')));
        const handleKeyDown = (event) => {
            if (event.key !== 'Tab')
                return;
            const focusables = getFocusables();
            if (focusables.length === 0)
                return;
            const activeEl = document.activeElement;
            const firstEl = focusables[0];
            const lastEl = focusables[focusables.length - 1];
            if (event.shiftKey && activeEl === firstEl) {
                event.preventDefault();
                lastEl.focus();
            }
            else if (!event.shiftKey && activeEl === lastEl) {
                event.preventDefault();
                firstEl.focus();
            }
        };
        ref.current.addEventListener('keydown', handleKeyDown);
        getFocusables()[0]?.focus();
        return () => { ref.current?.removeEventListener('keydown', handleKeyDown); };
    }, [enabled]);
    return ref;
}
