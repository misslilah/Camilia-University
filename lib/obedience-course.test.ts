import assert from "node:assert/strict"
import test from "node:test"
import { handTyped } from "./obedience.ts"
import {
  DEFAULT_SNIFF_SECONDS,
  PRAISE,
  clampSniff,
  courseAudioIds,
  courseAudioMime,
  courseEditorControl,
  courseEditorOpen,
  defaultCourse,
  floatingPraise,
  obedienceTrainingOffered,
  parseCourse,
  praiseClip,
  praiseCue,
  sniffBeats,
  sniffProgress,
} from "./obedience-course.ts"

test("the built-in lesson is playable before any upload", () => {
  const course = defaultCourse()
  assert.equal(course.sniffSeconds, DEFAULT_SNIFF_SECONDS)
  assert.equal(course.sniffSeconds, 4)
  assert.equal(course.lines.length, 3)
  assert.deepEqual(
    course.lines.map((line) => line.text),
    ["I listen, and I obey.", "I take my training seriously.", "I am an obedient student."],
  )
  assert.equal(course.lines.every((line) => line.audioId === null), true)
  assert.deepEqual(course.praise, [])
  assert.equal(course.track, null)
  assert.deepEqual(parseCourse(JSON.parse(JSON.stringify(course))), course)
})

test("the desktop course stays hidden until the amphitheater lesson is done", () => {
  assert.equal(obedienceTrainingOffered(false), false)
  assert.equal(obedienceTrainingOffered(true), true)
})

test("a saved course keeps the sniff time and drops anything that is not the lesson", () => {
  const audioId = "11111111-1111-4111-8111-111111111111"
  const parsed = parseCourse({
    sniffSeconds: 7.24,
    studentId: "someone-else",
    lines: [
      { id: "line-a", text: "  Hello there.  ", audioId, audioName: "  hello.mp3  " },
      { id: "line-a", text: "Duplicate", audioId: null },
      { id: "line-b", text: "   ", audioId: null },
      { id: "../secret", text: "No", audioId: null },
      { id: "line-c", text: "Second line", audioId: "not-a-uuid" },
    ],
    praise: [
      { id: "bad", name: "nope" },
      { id: audioId, name: "  You're doing soooo good  " },
    ],
  })
  assert.ok(parsed)
  assert.equal(parsed && "studentId" in parsed, false)
  assert.equal(parsed?.sniffSeconds, 7.2)
  assert.deepEqual(
    parsed?.lines.map((line) => line.text),
    ["Hello there.", "Second line"],
  )
  assert.equal(parsed?.lines[0]?.audioName, "hello.mp3")
  assert.equal(parsed?.lines[1]?.audioId, null)
  assert.deepEqual(parsed?.praise, [{ id: audioId, name: "You're doing soooo good" }])
  assert.equal(parsed?.track, null)
  assert.equal(parseCourse({ sniffSeconds: 4, lines: [] }), null)
  assert.equal(parseCourse(null), null)
  assert.equal(clampSniff(0), 1)
  assert.equal(clampSniff(999), 180)
})

test("praise grows with each finished line and a clip is only occasional", () => {
  assert.deepEqual(floatingPraise(0), [])
  assert.deepEqual(floatingPraise(1), ["GOOD GIRL"])
  assert.equal(floatingPraise(2)[1], "SUCH AN OBEDIENT STUDENT")
  assert.equal(floatingPraise(9).length, PRAISE.length)
  const hits = Array.from({ length: 20 }, (_, index) => praiseCue(index)).filter(Boolean)
  assert.equal(hits.length, 5)
  assert.equal(praiseCue(0), false)
  assert.equal(praiseCue(3), true)
  assert.equal(praiseClip(3, 0), null)
  assert.equal(praiseClip(2, 3), null)
  assert.equal(praiseClip(3, 2), 1)
})

test("the sniff bar uses the configured seconds and reduced motion skips the travel", () => {
  const full = sniffBeats(4, false)
  assert.deepEqual(
    full.map((beat) => beat.phase),
    ["uncap", "approach", "sniff", "praise", "dizzy", "write"],
  )
  assert.equal(full.find((beat) => beat.phase === "sniff")?.ms, 4000)
  const reduced = sniffBeats(6.5, true)
  assert.equal(reduced.some((beat) => beat.phase === "uncap" || beat.phase === "dizzy"), false)
  assert.equal(reduced.find((beat) => beat.phase === "sniff")?.ms, 6500)
  assert.equal(sniffProgress(2000, 4), 0.5)
  assert.equal(sniffProgress(9000, 4), 1)
})

test("dictation audio is a real audio file and the writing box still refuses a pasted line", () => {
  assert.equal(courseAudioMime("line.mp3", "audio/mpeg"), "audio/mpeg")
  assert.equal(courseAudioMime("line.mp3", ""), "audio/mpeg")
  assert.equal(courseAudioMime("line.txt", "text/plain"), "")
  assert.equal(courseAudioMime("notes.mp3", "text/plain"), "")
  const course = defaultCourse()
  course.lines[0] = { ...course.lines[0], audioId: "22222222-2222-4222-8222-222222222222", audioName: "one.mp3" }
  assert.deepEqual(courseAudioIds(course), ["22222222-2222-4222-8222-222222222222"])
  assert.equal(handTyped("", course.lines[1].text), "")
  assert.equal(handTyped("I", "It"), "It")
})

test("one track can ride along for the whole course", () => {
  const trackId = "33333333-3333-4333-8333-333333333333"
  const lineId = "22222222-2222-4222-8222-222222222222"
  const parsed = parseCourse({
    sniffSeconds: 4,
    lines: [{ id: "line-a", text: "I listen.", audioId: lineId, audioName: "line.mp3" }],
    track: { id: trackId, name: "  whole course.mp3  " },
  })
  assert.deepEqual(parsed?.track, { id: trackId, name: "whole course.mp3" })
  assert.deepEqual(parsed ? courseAudioIds(parsed) : [], [lineId, trackId])
  const dropped = parseCourse({
    sniffSeconds: 4,
    lines: [{ id: "line-a", text: "I listen.", audioId: null }],
    track: { id: "not-a-uuid", name: "nope" },
  })
  assert.equal(dropped?.track, null)
  const shared = parseCourse({
    sniffSeconds: 4,
    lines: [{ id: "line-a", text: "I listen.", audioId: trackId, audioName: "same.mp3" }],
    track: { id: trackId, name: "same.mp3" },
  })
  assert.deepEqual(shared ? courseAudioIds(shared) : [], [trackId])
})

test("edit course stays with the creator", () => {
  for (const view of ["list", "train", "edit"] as const) {
    assert.equal(courseEditorOpen(false, view), false)
  }
  assert.equal(courseEditorControl(false), false)
  assert.equal(courseEditorControl(true), true)
  assert.equal(courseEditorOpen(true, "list"), false)
  assert.equal(courseEditorOpen(true, "train"), false)
  assert.equal(courseEditorOpen(true, "edit"), true)
})
