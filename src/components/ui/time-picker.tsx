"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  className?: string
}

export function TimePicker({ value, onChange, disabled, className }: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedHour, setSelectedHour] = React.useState<string>("")
  const [selectedMinute, setSelectedMinute] = React.useState<string>("")

  // Initialize from value
  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(":")
      setSelectedHour(h)
      setSelectedMinute(m)
    } else {
        setSelectedHour("")
        setSelectedMinute("")
    }
  }, [value])

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))

  const handleTimeChange = (type: "hour" | "minute", val: string) => {
    let newH = selectedHour
    let newM = selectedMinute

    if (type === "hour") {
        newH = val
        setSelectedHour(val)
        if (!newM) {
            newM = "00"
            setSelectedMinute("00")
        }
    } else {
        newM = val
        setSelectedMinute(val)
        if (!newH) {
            newH = "00"
            setSelectedHour("00")
        }
    }
    
    // Update local state immediately for UI responsiveness
    if (type === "hour") setSelectedHour(val);
    else setSelectedMinute(val);

    if (onChange) {
        onChange(`${newH || "00"}:${newM || "00"}`)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal px-2",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || "--:--"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <div className="flex h-64">
           <div className="flex-1 overflow-y-auto border-r">
             <div className="p-1">
               <div className="text-xs font-medium text-center text-muted-foreground mb-1 sticky top-0 bg-white dark:bg-slate-950 py-1">Horas</div>
               {hours.map((h) => (
                 <Button
                   key={h}
                   variant={selectedHour === h ? "default" : "ghost"}
                   className="w-full justify-center h-8 text-sm mb-1"
                   onClick={() => handleTimeChange("hour", h)}
                 >
                   {h}
                 </Button>
               ))}
             </div>
           </div>
           <div className="flex-1 overflow-y-auto">
             <div className="p-1">
                <div className="text-xs font-medium text-center text-muted-foreground mb-1 sticky top-0 bg-white dark:bg-slate-950 py-1">Min</div>
               {minutes.map((m) => (
                 <Button
                   key={m}
                   variant={selectedMinute === m ? "default" : "ghost"}
                   className="w-full justify-center h-8 text-sm mb-1"
                   onClick={() => handleTimeChange("minute", m)}
                 >
                   {m}
                 </Button>
               ))}
             </div>
           </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
