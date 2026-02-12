"use client"

import * as React from "react"
import { format, isValid, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface DatePickerProps {
  date?: Date
  setDate: (date: Date | undefined) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function DatePicker({
  date,
  setDate,
  className,
  placeholder = "DD/MM/AAAA",
  disabled = false
}: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState("")
  const isTyping = React.useRef(false)

  React.useEffect(() => {
    if (isTyping.current) {
      isTyping.current = false
      return
    }

    if (date) {
      setInputValue(format(date, "dd/MM/yyyy"))
    } else {
      setInputValue("")
    }
  }, [date])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isTyping.current = true
    let value = e.target.value
    
    // Allow only digits and /
    value = value.replace(/[^0-9\/]/g, "")
    
    const nums = value.replace(/\D/g, "")
    
    // Simple masking logic
    // Only apply mask if we are adding characters (length increased)
    // Actually, checking if length increased is hard without prev state.
    // But we can check if the last char is not '/' or something.
    // Let's just blindly apply mask on numbers if it matches pattern.
    // But we must respect backspace.
    
    // Improved masking:
    // If user types '1', value is '1'.
    // If user types '2', value is '12'.
    // If user types '3', value is '12/3'.
    // If user deletes '/', value becomes '12'.
    
    // If value length < inputValue length, we assume deletion and trust the raw value (but still filtered for digits/slash).
    if (value.length < inputValue.length) {
        // Deletion
        setInputValue(value)
        // If we deleted, we might need to update date.
        if (value.length === 10) {
             // Unlikely to delete into a valid date unless we had extra chars
             const parsedDate = parse(value, "dd/MM/yyyy", new Date())
             if (isValid(parsedDate)) setDate(parsedDate)
             else setDate(undefined)
        } else {
             setDate(undefined)
        }
        return
    }

    // Addition
    if (nums.length <= 2) {
        value = nums
    } else if (nums.length <= 4) {
        value = `${nums.slice(0, 2)}/${nums.slice(2)}`
    } else {
        value = `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4, 8)}`
    }
    
    setInputValue(value)

    if (value.length === 10) {
      const parsedDate = parse(value, "dd/MM/yyyy", new Date())
      if (isValid(parsedDate)) {
        setDate(parsedDate)
      } else {
        setDate(undefined)
      }
    } else {
        setDate(undefined)
    }
  }

  const handleCalendarSelect = (newDate: Date | undefined) => {
    isTyping.current = false
    setDate(newDate)
    setIsPopoverOpen(false)
    if (newDate) {
        setInputValue(format(newDate, "dd/MM/yyyy"))
    } else {
        setInputValue("")
    }
  }
  
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)

  return (
    <div className={cn("relative w-full", className)}>
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="pr-10 w-full"
        disabled={disabled}
        maxLength={10}
      />
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent hover:text-foreground"
            disabled={disabled}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleCalendarSelect}
            initialFocus
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
