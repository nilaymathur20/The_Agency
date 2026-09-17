import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import './FileTree.css';
function buildTree(files) {
    const root = { name: 'workspace', path: '', children: [], isFile: false };
    files.forEach(f => {
        const parts = f.split('/').filter(Boolean);
        let cur = root;
        let prefix = '';
        parts.forEach((part, idx) => {
            prefix = prefix ? `${prefix}/${part}` : part;
            let child = cur.children.find(c => c.name === part);
            if (!child) {
                child = { name: part, path: prefix, children: [], isFile: idx === parts.length - 1 && part.includes('.') };
                cur.children.push(child);
            }
            cur = child;
        });
    });
    return root;
}
function TreeNode({ node, onSelect, selected, depth = 0 }) {
    const [open, setOpen] = useState(depth < 2);
    if (node.name === 'workspace') {
        return _jsx("div", { className: "filetree", children: node.children.map(child => _jsx(TreeNode, { node: child, onSelect: onSelect, selected: selected, depth: depth + 1 }, child.path)) });
    }
    const isSelected = selected === node.path;
    if (node.isFile || node.children.length === 0) {
        return (_jsxs("button", { className: `filetree__item ${isSelected ? 'filetree__item--selected' : ''} ${node.isFile ? '' : 'filetree__item--dir'}`, onClick: () => onSelect(node.path), style: { paddingLeft: 12 + depth * 12 }, children: [_jsx("span", { className: "filetree__icon", children: node.isFile ? '📄' : '📁' }), _jsx("span", { className: "filetree__name", children: node.name })] }));
    }
    return (_jsxs("div", { children: [_jsxs("button", { className: "filetree__item filetree__item--dir", onClick: () => setOpen(v => !v), style: { paddingLeft: 12 + depth * 12 }, children: [_jsx("span", { className: "filetree__arrow", children: open ? '▾' : '▸' }), _jsx("span", { className: "filetree__icon", children: open ? '📂' : '📁' }), _jsx("span", { className: "filetree__name", children: node.name })] }), open && _jsx("div", { children: node.children.map(child => _jsx(TreeNode, { node: child, onSelect: onSelect, selected: selected, depth: depth + 1 }, child.path)) })] }));
}
export function FileTree({ files, onSelect, selected }) {
    const tree = useMemo(() => buildTree(files), [files]);
    if (files.length === 0) {
        return _jsx("div", { style: { padding: 12, color: 'var(--text-tertiary)', fontSize: 12 }, children: "No files yet \u2014 run the project to generate code." });
    }
    return _jsx("div", { className: "filetree__panel", children: _jsx(TreeNode, { node: tree, onSelect: onSelect, selected: selected }) });
}
