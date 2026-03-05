"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { addYears, format, parse, subYears } from "date-fns"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface MonthPickerProps {
  value?: string // Format: YYYY-MM
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function MonthPicker({
  value,
  onValueChange,
  placeholder = "Selecione o mês",
  className,
  disabled = false,
}: MonthPickerProps) {
  const [date, setDate] = React.useState<Date>(
    value ? parse(value, "yyyy-MM", new Date()) : new Date()
  )
  const [isOpen, setIsOpen] = React.useState(false)

  // Update internal date if value prop changes
  React.useEffect(() => {
    if (value) {
      setDate(parse(value, "yyyy-MM", new Date()))
    }
  }, [value])

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(date.getFullYear(), monthIndex, 1)
    setDate(newDate)
    onValueChange(format(newDate, "yyyy-MM"))
    setIsOpen(false)
  }

  const handleYearChange = (increment: number) => {
    setDate((prev) => (increment > 0 ? addYears(prev, increment) : subYears(prev, Math.abs(increment))))
  }

  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ]

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(parse(value, "yyyy-MM", new Date()), "MMMM 'de' yyyy", { locale: ptBR })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="flex flex-col space-y-4 p-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
              onClick={() => handleYearChange(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">{date.getFullYear()}</div>
            <Button
              variant="outline"
              className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
              onClick={() => handleYearChange(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {months.map((month, index) => (
              <Button
                key={month}
                variant={
                  value &&
                  parse(value, "yyyy-MM", new Date()).getMonth() === index &&
                  parse(value, "yyyy-MM", new Date()).getFullYear() === date.getFullYear()
                    ? "default"
                    : "ghost"
                }
                className={cn(
                  "h-9 w-full p-0 text-xs font-normal",
                  value &&
                    parse(value, "yyyy-MM", new Date()).getMonth() === index &&
                    parse(value, "yyyy-MM", new Date()).getFullYear() === date.getFullYear()
                    ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => handleMonthSelect(index)}
              >
                {month.substring(0, 3)}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
