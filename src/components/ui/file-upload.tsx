import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, X, FileText } from "lucide-react";

interface FileUploadProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: File | null;
  onChange?: (file: File | null) => void;
  defaultFileName?: string; // For when we have an existing file in edit mode
  label?: string;
}

export const FileUpload = React.forwardRef<HTMLInputElement, FileUploadProps>(
  ({ className, onChange, value, defaultFileName, label = "Selecionar arquivo", ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = React.useState<string | null>(defaultFileName || null);

    // Sync internal state if value prop changes
    React.useEffect(() => {
      if (value) {
        setFileName(value.name);
      } else if (defaultFileName && !value) {
         setFileName(defaultFileName);
      } else {
        setFileName(null);
      }
    }, [value, defaultFileName]);

    const handleClick = () => {
      inputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      if (file) {
        setFileName(file.name);
        if (onChange) onChange(file);
      }
    };

    const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      setFileName(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      if (onChange) onChange(null);
    };

    // Merge refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <input
          {...props}
          type="file"
          ref={inputRef}
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClick}
            className="cursor-pointer"
          >
            <Upload className="mr-2 h-4 w-4" />
            {label}
          </Button>
          <span className="text-sm text-muted-foreground flex-1 truncate">
            {fileName ? (
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-gray-700">{fileName}</span>
                </div>
            ) : (
                "Nenhum arquivo selecionado"
            )}
          </span>
           {fileName && !defaultFileName && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleRemove}
              title="Remover arquivo"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";
