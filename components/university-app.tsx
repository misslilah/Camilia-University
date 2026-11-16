"use client"

import dynamic from "next/dynamic"
import { BootScreen } from "@/components/boot-screen"

const Experience = dynamic(() => import("@/components/experience/Experience"), {
  ssr: false,
  loading: () => <BootScreen />,
})

export function UniversityApp() {
  return <Experience />
}
