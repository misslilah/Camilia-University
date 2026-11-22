import assert from "node:assert/strict"
import test from "node:test"
import { arrangeLibrary, entitledTo, isCampaignCreator, membershipNotice, sameId, tierById, tierChoices, tierLabel, tierOptionLabel, tooLargeMessage, viewAsTier, type LibraryItem } from "./patreon-access.ts"

const studio = { id: "studio", title: "Studio", amountCents: 800 }
const listeners = { id: "listeners", title: "Listeners", amountCents: 300 }

test("an entitled tier title can open that file", () => {
  assert.equal(entitledTo({ tierTitle: "Studio", tierCents: null }, [studio]), true)
})

test("a higher amount opens a lower tier", () => {
  assert.equal(entitledTo({ tierTitle: "Listeners", tierCents: 300 }, [studio]), true)
})

test("a lower amount does not open a higher tier", () => {
  assert.equal(entitledTo({ tierTitle: "Studio", tierCents: 800 }, [listeners]), false)
})

test("a different title without an amount stays closed", () => {
  assert.equal(entitledTo({ tierTitle: "Studio", tierCents: null }, [listeners]), false)
})

test("tier titles stay in Patreon's wording", () => {
  assert.equal(tierLabel([listeners, studio]), "Listeners, Studio")
  assert.equal(tooLargeMessage("clip.mp4"), `"clip.mp4" is larger than 2 GB. Choose a smaller file.`)
})

test("the campaign owner is the creator even without a paid membership", () => {
  assert.equal(sameId("13709558", " 13709558 "), true)
  assert.equal(isCampaignCreator({ campaignId: "13709558", identityCampaignId: "13709558", ownsListedCampaign: false }), true)
  assert.equal(isCampaignCreator({ campaignId: "13709558", identityCampaignId: null, ownsListedCampaign: true }), true)
  assert.equal(isCampaignCreator({ campaignId: "13709558", identityCampaignId: null, ownsListedCampaign: false }), false)
})

test("a creator signed into the wrong campaign is told which one they own", () => {
  assert.match(membershipNotice({ admin: false, active: false, campaignId: "13709558", ownedIds: ["14481136"] }) ?? "", /14481136/)
  assert.equal(membershipNotice({ admin: true, active: false, campaignId: "14481136", ownedIds: ["14481136"] }), null)
  assert.match(membershipNotice({ admin: false, active: false, campaignId: "14481136", ownedIds: [] }) ?? "", /No active membership/)
})

test("a tier preview locks files above that amount", () => {
  const file: LibraryItem = {
    id: "clip",
    kind: "video",
    name: "Clip",
    size: 10,
    mime: "video/mp4",
    addedAt: 2,
    duration: null,
    tierTitle: "Studio",
    tierCents: 800,
    sample: false,
    locked: false,
    url: "/api/patreon/media/clip",
  }
  assert.equal(viewAsTier(file, listeners).locked, true)
  assert.equal(viewAsTier(file, listeners).url, null)
  assert.equal(viewAsTier(file, studio).locked, false)
  const lower: LibraryItem = { ...file, id: "note", name: "Note", addedAt: 1, tierTitle: "Listeners", tierCents: 300 }
  const arranged = arrangeLibrary([file, lower], "tier-up", null)
  assert.deepEqual(arranged.map((item) => item.name), ["Note", "Clip"])
  assert.deepEqual(arrangeLibrary([file, lower], "newest", "Studio").map((item) => item.id), ["clip"])
  assert.deepEqual(tierChoices([file, lower]).map((tier) => tier.title), ["Listeners", "Studio"])
})

test("an upload can only name a tier returned for the creator", () => {
  assert.equal(tierById([listeners, studio], "studio")?.title, "Studio")
  assert.equal(tierById([listeners, studio], "missing"), null)
  assert.equal(tierOptionLabel(studio), "Studio · 8.00")
})
