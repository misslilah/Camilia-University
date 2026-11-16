"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CHAPTERS } from "@/lib/scene"

export function FlatCampus() {
  const [open, setOpen] = useState<string | null>(CHAPTERS[0].id)
  return (
    <div className="h-full overflow-y-auto bg-[#f3ead7] text-[#2a1c14]">
      <main className="mx-auto flex min-h-full max-w-3xl flex-col px-6 py-12 sm:px-10">
        <p className="text-[11px] tracking-[0.42em] text-[#6b4a32]">UNIVERSITÉ</p>
        <h1 className="mt-3 font-serif text-5xl sm:text-7xl">Camilia</h1>
        <p className="mt-2 font-serif text-2xl text-[#6b4a32]">University</p>
        <p className="mt-6 max-w-xl text-base leading-7 text-[#4a3428]">
          L’amphithéâtre ne peut pas s’afficher dans ce navigateur. Le tableau est donc ouvert ici :
          choisissez un chapitre.
        </p>
        <div className="mt-10 flex flex-col gap-3">
          {CHAPTERS.map((chapter) => {
            const expanded = open === chapter.id
            return (
              <section key={chapter.id} className="border-t border-[#2a1c14]/15 pt-3">
                <Button
                  variant="ghost"
                  className="h-auto w-full justify-start rounded-none px-0 py-2 text-left font-serif text-2xl text-[#2a1c14] hover:bg-transparent hover:text-[#6e2433]"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : chapter.id)}
                >
                  <span className="mr-4 text-sm tracking-[0.2em] text-[#6b4a32]">{chapter.numeral}</span>
                  {chapter.title}
                </Button>
                {expanded && (
                  <p className="max-w-xl pb-4 pl-12 text-sm leading-7 whitespace-pre-line text-[#4a3428]">
                    {chapter.body}
                  </p>
                )}
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}
