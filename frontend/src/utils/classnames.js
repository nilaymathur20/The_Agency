export function classnames(...classes) {
    return classes.filter(Boolean).join(' ');
}
export function cn(...classes) {
    return classnames(...classes);
}
