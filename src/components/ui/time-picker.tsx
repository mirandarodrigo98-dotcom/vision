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
  minTime?: string
}

export function TimePicker({ value, onChange, disabled, className, minTime }: TimePickerProps) {
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
        // Only reset if open is false or value explicitly cleared to avoid UI flicker during typing/selection if we were supporting text input
        // But here we rely on popover.
        // If value becomes undefined from parent, clear it.
        // Actually, let's keep it simple.
        if (!open) {
             setSelectedHour("")
             setSelectedMinute("")
        }
    }
  }, [value, open])

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))

  const [minH, minM] = React.useMemo(() => {
      if (!minTime) return [-1, -1];
      const [h, m] = minTime.split(':').map(Number);
      return [h, m];
  }, [minTime]);

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
        
        // Check if new time < minTime, if so adjust minute?
        // Actually, if user picks an hour that equals minHour, we need to ensure minute >= minMinute.
        // But the minutes list will update to disable invalid minutes.
        // However, if the currently selected minute is now invalid, we should probably reset it or clamp it?
        // For simplicity, let's just let the user pick a valid minute.
        // Or better: if newH == minH and newM < minM, set newM = minM formatted.
        
        if (minTime) {
             const hNum = parseInt(val);
             const mNum = parseInt(newM);
             if (hNum === minH && mNum < minM) {
                 newM = minM.toString().padStart(2, '0');
                 setSelectedMinute(newM);
             }
        }

    } else {
        newM = val
        setSelectedMinute(val)
        if (!newH) {
            // If selecting minute first, default to minHour if set, or 00
            newH = minTime && minH > 0 ? minH.toString().padStart(2, '0') : "00"
            setSelectedHour(newH)
        }
    }
    
    if (onChange) {
        onChange(`${newH || "00"}:${newM || "00"}`)
    }
  }

  const isHourDisabled = (h: string) => {
      if (!minTime) return false;
      return parseInt(h) < minH;
  }

  const isMinuteDisabled = (m: string) => {
      if (!minTime) return false;
      if (!selectedHour) return false; // If no hour selected, maybe everything is enabled or we assume 00? 
      // If hour not selected yet, usually we pick hour first.
      
      const hNum = parseInt(selectedHour);
      if (hNum > minH) return false;
      if (hNum < minH) return true; // Should not happen if hour is disabled
      
      // hNum == minH
      return parseInt(m) < minM;
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
                  disabled={isHourDisabled(h)}
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
                  disabled={isMinuteDisabled(m)}
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
