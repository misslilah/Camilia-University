"use client"

import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function CourseChrome({
  title,
  onBack,
  children,
  dark = false,
}: {
  title?: string
  onBack?: () => void
  children: ReactNode
  dark?: boolean
}) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col", dark ? "bg-[#140e0c] text-[#f6f0e6]" : "bg-[#f6f1e6] text-[#2a1c14]")}>
      {(onBack || title) && (
        <div className={cn("flex shrink-0 items-center gap-2 px-3 py-2", !dark && "border-b border-[#e7d3b0]")}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full",
                dark ? "text-[#f6f0e6] hover:bg-white/10" : "text-[#6d2c3a] hover:bg-[#6d2c3a]/10",
              )}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          {title && <p className="truncate font-serif text-lg">{title}</p>}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  )
}

export function CourseStatus({
  title,
  detail,
  action,
  tone = "status",
}: {
  title: string
  detail?: string
  action?: ReactNode
  tone?: "status" | "alert"
}) {
  return (
    <div className="grid h-full place-items-center bg-[#f6f1e6] px-6 py-8 text-center text-[#2a1c14]">
      <div className="max-w-sm">
        <p role={tone} className="font-serif text-3xl leading-tight">
          {title}
        </p>
        {detail && <p className="mt-3 text-sm leading-relaxed text-[#4a3424]">{detail}</p>}
        {action && <div className="mt-5 flex flex-col items-center gap-2">{action}</div>}
      </div>
    </div>
  )
}

export function courseButton(kind: "solid" | "ghost" = "solid") {
  return kind === "solid"
    ? "inline-flex h-11 items-center justify-center rounded-full bg-[#6d2c3a] px-5 text-sm text-[#f6f1e6] hover:bg-[#582430] disabled:opacity-50"
    : "inline-flex h-11 items-center justify-center rounded-full px-4 text-sm text-[#8a6238] underline-offset-2 hover:underline disabled:opacity-50"
}
