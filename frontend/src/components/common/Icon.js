import { jsx as _jsx } from "react/jsx-runtime";
const paths = {
    check: 'M5 8l3 3 5-6',
    x: 'M4 4l8 8M12 4l-8 8',
    alert: 'M8 5v4 M8 11h.01 M12 3H4L2 7l6 8 6-8-2-4z',
    clock: 'M8 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10z M8 5v3l2 2',
    play: 'M6 4l8 5-8 5z',
    pause: 'M5 4h3v8H5z M11 4h3v8h-3z',
    plus: 'M8 4v8 M4 8h8',
    trash: 'M4 6h8 M5 6V4h6v2 M6 9v4 M10 9v4 M3 6h10l-1 8H4z',
    edit: 'M11 3l3 3-7 7H4v-3z',
    eye: 'M2 8s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z M8 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
    code: 'M6 8l-3 3 3 3 M10 8l3 3-3 3 M9 3l-2 10',
    database: 'M4 4h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M2 6h12 M2 10h12',
    file: 'M6 2h6l4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M12 2v4h4',
    users: 'M5 13a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1H5z M9 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
    activity: 'M2 8h3l2-4 3 8 2-4h4',
};
export function Icon({ name, size = 16, className, style }) {
    return (_jsx("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round", strokeLinejoin: "round", className: className, style: style, "aria-hidden": "true", children: _jsx("path", { d: paths[name] }) }));
}
