'use client';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    return (
        <div className="bg-white text-black rounded-md">
            <textarea
                className="w-full h-[200px] p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder || 'Escreva aqui...'}
            />
            <p className="text-xs text-gray-400 mt-1 px-1">Editor de texto simples (Modo de Compatibilidade).</p>
        </div>
    );
}