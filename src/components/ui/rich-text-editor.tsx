'use client';

import { useState } from 'react';

interface RichTextEditorProps {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  initialValue?: string;
}

export default function RichTextEditor({
  name,
  value,
  onChange,
  placeholder,
  initialValue = '',
}: RichTextEditorProps) {
  const [internal, setInternal] = useState<string>(initialValue);
  const controlled = typeof value === 'string' && typeof onChange === 'function';
  const currentValue = controlled ? (value as string) : internal;

  const handleChange = (next: string) => {
    if (controlled) {
      (onChange as (v: string) => void)(next);
    } else {
      setInternal(next);
    }
  };

  return (
    <div className="bg-white text-black rounded-md">
      <textarea
        className="w-full h-[240px] p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        name={name}
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder || 'Escreva aqui...'}
      />
      <p className="text-xs text-gray-400 mt-1 px-1">
        Editor de texto simples (Modo de Compatibilidade).
      </p>
    </div>
  );
}
