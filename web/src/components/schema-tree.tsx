'use client';

import { useState } from 'react';
import type { JsonSchema } from '@/lib/catalog';

interface SchemaTreeProps {
  schema?: JsonSchema;
  label?: string;
}

function Node({ node, name, depth }: { node: JsonSchema; name?: string; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren =
    (node.properties && Object.keys(node.properties).length > 0) ||
    (node.items && (node.items.properties || node.items.type));

  const header = (
    <div className="flex items-center gap-2 font-mono text-xs">
      {hasChildren ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-white/40 hover:text-white"
        >
          {open ? '[-]' : '[+]'}
        </button>
      ) : (
        <span className="text-white/20">&nbsp;&nbsp;&nbsp;</span>
      )}
      {name && <span className="text-white/80">{name}</span>}
      <span className="text-[10px] uppercase tracking-wider text-white/30">
        {node.type ?? 'any'}
      </span>
      {node.description && (
        <span className="truncate text-[10px] text-white/40">{node.description}</span>
      )}
    </div>
  );

  if (!hasChildren || !open) return header;

  return (
    <div>
      {header}
      <div className="ml-6 border-l border-white/10 pl-3 mt-1 space-y-1">
        {node.properties &&
          Object.entries(node.properties).map(([k, child]) => (
            <Node key={k} node={child} name={k} depth={depth + 1} />
          ))}
        {node.items && <Node node={node.items} name="[]" depth={depth + 1} />}
      </div>
    </div>
  );
}

export function SchemaTree({ schema, label = 'Response' }: SchemaTreeProps) {
  if (!schema) {
    return (
      <p className="font-mono text-xs text-white/40">No output schema declared.</p>
    );
  }
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-white/40">
        {label}
      </p>
      <Node node={schema} depth={0} />
    </div>
  );
}
