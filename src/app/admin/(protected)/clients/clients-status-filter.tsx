'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter, useSearchParams } from "next/navigation"

export function ClientsStatusFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const status = searchParams.get("status") || "all"

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value === "all") {
      params.delete("status")
    } else {
      params.set("status", value)
    }
    router.replace(`?${params.toString()}`)
  }

  return (
    <Select value={status} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        <SelectItem value="active">Ativos</SelectItem>
        <SelectItem value="inactive">Inativos</SelectItem>
      </SelectContent>
    </Select>
  )
}
