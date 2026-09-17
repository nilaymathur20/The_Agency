export function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
export function throttle(fn, limit) {
    let inThrottle = false;
    return (...args) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}
export function measure(label, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    // @ts-ignore
    const isDev = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') || import.meta.env?.DEV;
    if (isDev) {
        console.log(`[perf] ${label}: ${(end - start).toFixed(2)}ms`);
    }
    return result;
}
