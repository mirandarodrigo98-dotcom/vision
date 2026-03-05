import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface CompetenceInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string // YYYY-MM
  onValueChange: (value: string) => void
}

export function CompetenceInput({ value, onValueChange, className, ...props }: CompetenceInputProps) {
  // Convert YYYY-MM to MM/YYYY for display
  const formatDisplay = (val: string) => {
    if (!val) return ""
    const [year, month] = val.split('-')
    if (!year || !month) return ""
    return `${month}/${year}`
  }

  const [displayValue, setDisplayValue] = React.useState(formatDisplay(value))

  // Update internal state when external value changes
  React.useEffect(() => {
    setDisplayValue(formatDisplay(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Handle backspace or deletions gracefully
    // If user deleted char, we rely on the input's new value but re-apply mask logic
    
    let inputRaw = e.target.value.replace(/\D/g, "")
    
    // Limit to 6 digits (MMYYYY)
    if (inputRaw.length > 6) inputRaw = inputRaw.substring(0, 6)

    // Apply mask: MM/YYYY
    let formatted = inputRaw
    if (inputRaw.length > 2) {
      formatted = inputRaw.substring(0, 2) + "/" + inputRaw.substring(2)
    }

    setDisplayValue(formatted)

    // Check if complete (6 digits -> MMYYYY)
    if (inputRaw.length === 6) {
      const monthStr = inputRaw.substring(0, 2)
      const yearStr = inputRaw.substring(2)
      const m = parseInt(monthStr, 10)
      const y = parseInt(yearStr, 10)
      
      if (m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
        // Parent expects YYYY-MM
        onValueChange(`${yearStr}-${monthStr}`)
      } else {
        // Invalid date components (e.g. month 13), parent gets empty
        onValueChange("") 
      }
    } else {
      // Incomplete input, parent gets empty
      onValueChange("")
    }
  }

  return (
    <Input
      type="text"
      placeholder="MM/AAAA"
      value={displayValue}
      onChange={handleChange}
      maxLength={7} // MM/YYYY is 7 chars
      className={cn("font-mono", className)}
      {...props}
    />
  )
}
