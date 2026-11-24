"use client"

import { useEffect, useState } from "react"
import { SKILLS, describeLevel, describeRank, loadSkills, totalXp, type SkillXp } from "@/lib/profile"

export function Profile({ name }: { name: string }) {
  const pseudo = name.trim() || "Student"
  const [skills, setSkills] = useState<SkillXp>(() => loadSkills(pseudo))
  useEffect(() => {
    setSkills(loadSkills(pseudo))
  }, [pseudo])
  const level = describeLevel(totalXp(skills))
  const initial = pseudo.slice(0, 1).toUpperCase()

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(ellipse_at_50%_0%,#3a241c_0%,#1a100c_55%,#120c09_100%)] text-[#f6efe2]">
      <article className="mx-auto flex min-h-full max-w-md flex-col px-4 py-5 sm:px-6 sm:py-7">
        <p className="text-center text-[10px] tracking-[0.42em] text-[#e7d7b8]/70 uppercase">Student badge</p>
        <section className="relative mt-3 overflow-hidden rounded-[28px] border border-[#e7d7b8]/35 bg-[#2a1c14]/80 px-5 pt-6 pb-5 shadow-[inset_0_0_0_1px_rgba(231,215,184,0.12),0_20px_50px_rgba(0,0,0,0.35)]">
          <div aria-hidden className="pointer-events-none absolute inset-3 rounded-[22px] border border-[#e7d7b8]/15" />
          <div className="relative flex items-start gap-4">
            <div className="grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center rounded-full border border-[#e7d7b8]/50 bg-[radial-gradient(circle_at_40%_35%,#6d4a2e,#2a1c14_70%)] shadow-[0_0_0_4px_rgba(42,28,20,0.8)]">
              <span className="font-serif text-4xl leading-none text-[#f3ead7]">{initial}</span>
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-[10px] tracking-[0.28em] text-[#e7d7b8]/65 uppercase">Pseudo</p>
              <h2 className="truncate font-serif text-3xl leading-tight">{pseudo}</h2>
              <p className="mt-1 text-sm text-[#e7d7b8]/80">{level.title}</p>
            </div>
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-[#e7d7b8]/60 bg-[#1a100c] text-center">
              <span>
                <span className="block text-[9px] tracking-[0.22em] text-[#e7d7b8]/70 uppercase">Lv</span>
                <span className="font-serif text-2xl leading-none">{level.level}</span>
              </span>
            </div>
          </div>

          <div className="relative mt-5">
            <div className="flex items-baseline justify-between text-[11px] tracking-wide text-[#e7d7b8]/75">
              <span>Experience</span>
              <span>
                {level.into} / {level.need} XP
              </span>
            </div>
            <Meter value={level.into} max={level.need} color="#e7d7b8" label={`Level ${level.level}, ${level.into} of ${level.need} experience`} />
          </div>

          <ul className="relative mt-5 space-y-3.5">
            {SKILLS.map((skill) => {
              const rank = describeRank(skills[skill.id])
              return (
                <li key={skill.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm">{skill.label}</p>
                    <p className="text-[11px] text-[#e7d7b8]/70">
                      {rank.title} · {rank.xp} XP
                    </p>
                  </div>
                  <Meter value={rank.into} max={rank.need} color={skill.color} label={`${skill.label}, ${rank.title}, ${rank.into} of ${rank.need} toward the next rank`} />
                </li>
              )
            })}
          </ul>
        </section>
        <p className="mt-4 text-center text-[11px] tracking-wide text-[#e7d7b8]/45">Camilia University</p>
      </article>
    </div>
  )
}

function Meter({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const width = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/45" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
    </div>
  )
}
