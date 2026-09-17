import React, { useMemo, useState } from 'react';
import './FileTree.css';

interface FileTreeProps {
  files: string[];
  onSelect: (path: string) => void;
  selected?: string;
}

type Node = { name: string; path: string; children: Node[]; isFile: boolean; };

function buildTree(files: string[]): Node {
  const root: Node = { name: 'workspace', path: '', children: [], isFile: false };
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

function TreeNode({ node, onSelect, selected, depth=0 }: { node: Node; onSelect: (p:string)=>void; selected?: string; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  if (node.name === 'workspace') {
    return <div className="filetree">{node.children.map(child => <TreeNode key={child.path} node={child} onSelect={onSelect} selected={selected} depth={depth+1} />)}</div>;
  }
  const isSelected = selected === node.path;
  if (node.isFile || node.children.length === 0) {
    return (
      <button className={`filetree__item ${isSelected?'filetree__item--selected':''} ${node.isFile?'':'filetree__item--dir'}`} onClick={() => onSelect(node.path)} style={{ paddingLeft: 12 + depth*12 }}>
        <span className="filetree__icon">{node.isFile ? '📄' : '📁'}</span>
        <span className="filetree__name">{node.name}</span>
      </button>
    );
  }
  return (
    <div>
      <button className="filetree__item filetree__item--dir" onClick={() => setOpen(v=>!v)} style={{ paddingLeft: 12 + depth*12 }}>
        <span className="filetree__arrow">{open?'▾':'▸'}</span>
        <span className="filetree__icon">{open?'📂':'📁'}</span>
        <span className="filetree__name">{node.name}</span>
      </button>
      {open && <div>{node.children.map(child => <TreeNode key={child.path} node={child} onSelect={onSelect} selected={selected} depth={depth+1} />)}</div>}
    </div>
  );
}

export function FileTree({ files, onSelect, selected }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);
  if (files.length === 0) {
    return <div style={{ padding:12, color:'var(--text-tertiary)', fontSize:12 }}>No files yet — run the project to generate code.</div>;
  }
  return <div className="filetree__panel"><TreeNode node={tree} onSelect={onSelect} selected={selected} /></div>;
}
