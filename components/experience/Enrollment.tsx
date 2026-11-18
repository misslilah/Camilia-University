"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"

export type Student = { name: string; email: string }

export function Enrollment({
  configured,
  onClose,
  onEnrolled,
}: {
  configured: boolean
  onClose: () => void
  onEnrolled: (student: Student) => void
}) {
  const [mode, setMode] = useState<"enroll" | "signin">("enroll")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    if (!configured) {
      const student = { name: name.trim(), email: email.trim().toLowerCase() }
      if (student.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email) || password.length < 8) {
        setError("Enter your name, a valid email, and a password of at least 8 characters.")
        return
      }
      try {
        window.localStorage.setItem("camilia-student", JSON.stringify(student))
      } catch {
        // The visit can continue even if this browser blocks storage.
      }
      onEnrolled(student)
      return
    }
    setPending(true)
    try {
      const response = await fetch(mode === "enroll" ? "/api/academy/signup" : "/api/academy/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const body = (await response.json().catch(() => ({}))) as { error?: string; student?: Student }
      if (!response.ok || !body.student) {
        setError(body.error || "The academy could not open that record.")
        return
      }
      onEnrolled(body.student)
    } catch {
      setError("The academy could not be reached.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center bg-[#140f0c]/55 px-4 py-8 sm:items-center">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl bg-[#1c1410]/95 p-6 text-[#f6f0e6] shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-8"
      >
        <p className="text-[11px] tracking-[0.42em] text-[#f3ead7]/60">CAMILIA UNIVERSITY</p>
        <h2 className="mt-2 font-serif text-3xl">{mode === "enroll" ? "Enroll at the academy" : "Sign in"}</h2>
        <p className="mt-2 text-sm text-[#f6f0e6]/75">
          Your student record keeps your character, on this computer and the next.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          {mode === "enroll" && (
            <label className="flex flex-col gap-1 text-xs tracking-wide text-[#f3ead7]/70">
              Full name
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                className="h-11 rounded-xl bg-[#f3ead7] px-3 text-sm text-[#2a1c14] outline-none"
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs tracking-wide text-[#f3ead7]/70">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="h-11 rounded-xl bg-[#f3ead7] px-3 text-sm text-[#2a1c14] outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs tracking-wide text-[#f3ead7]/70">
            Password
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "enroll" ? "new-password" : "current-password"}
              className="h-11 rounded-xl bg-[#f3ead7] px-3 text-sm text-[#2a1c14] outline-none"
            />
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-[#f0b4a4]">{error}</p>}
        {!configured && (
          <p className="mt-3 text-xs text-[#f6f0e6]/60">
            Saved in this browser until Supabase is connected. Then the same form opens a real student record.
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending} className="h-11 rounded-full bg-[#f3ead7] px-6 text-[#2a1c14] hover:bg-[#fff8ee]">
            {pending ? "One moment" : mode === "enroll" ? "Enroll" : "Sign in"}
          </Button>
          <button
            type="button"
            className="text-sm text-[#f6f0e6]/75 underline underline-offset-2"
            onClick={() => {
              setMode(mode === "enroll" ? "signin" : "enroll")
              setError("")
            }}
          >
            {mode === "enroll" ? "Already enrolled? Sign in" : "New here? Enroll"}
          </button>
          <button type="button" className="ml-auto text-sm text-[#f6f0e6]/55" onClick={onClose}>
            Not now
          </button>
        </div>
      </form>
    </div>
  )
}
