'use client';

import { useMemo, useState } from 'react';
import type { JsonSchema } from '@/lib/catalog';

interface SchemaFormProps {
  schema?: JsonSchema;
}

function defaultForField(schema: JsonSchema): string {
  if (schema.example !== undefined) return String(schema.example);
  if (schema.enum && schema.enum.length > 0) return String(schema.enum[0]);
  return '';
}

export function SchemaForm({ schema }: SchemaFormProps) {
  const fields = useMemo(() => {
    if (!schema || !schema.properties) return [] as { key: string; schema: JsonSchema; required: boolean }[];
    const required = new Set(schema.required ?? []);
    return Object.entries(schema.properties).map(([key, fieldSchema]) => ({
      key,
      schema: fieldSchema,
      required: required.has(key),
    }));
  }, [schema]);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    fields.forEach((f) => {
      init[f.key] = defaultForField(f.schema);
    });
    return init;
  });

  if (!schema) {
    return (
      <p className="font-mono text-xs text-white/40">
        No input schema declared for this endpoint.
      </p>
    );
  }

  return (
    <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
      {fields.length === 0 && (
        <p className="font-mono text-xs text-white/40">This endpoint takes no parameters.</p>
      )}
      {fields.map(({ key, schema: field, required }) => {
        const id = `schema-field-${key}`;
        const value = values[key] ?? '';
        const setValue = (v: string) => setValues((p) => ({ ...p, [key]: v }));
        return (
          <div key={key}>
            <div className="flex items-baseline justify-between">
              <label htmlFor={id} className="font-mono text-xs text-white/70">
                {key}
                {required && <span className="ml-1 text-red-400">*</span>}
              </label>
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
                {field.type ?? 'any'}
              </span>
            </div>
            {field.description && (
              <p className="mt-1 font-mono text-[10px] text-white/40">{field.description}</p>
            )}
            {field.enum ? (
              <select
                id={id}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mt-1 w-full rounded border border-white/20 bg-white/5 px-2 py-1.5 font-mono text-xs text-white outline-none focus:border-white/40"
              >
                {field.enum.map((opt) => (
                  <option key={String(opt)} value={String(opt)} className="bg-black">
                    {String(opt)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                type={field.type === 'number' || field.type === 'integer' ? 'number' : 'text'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={field.example !== undefined ? String(field.example) : ''}
                className="mt-1 w-full rounded border border-white/20 bg-white/5 px-2 py-1.5 font-mono text-xs text-white placeholder-white/20 outline-none focus:border-white/40"
              />
            )}
          </div>
        );
      })}
    </form>
  );
}
