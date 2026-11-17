"use client"

import { useState } from "react"
import { Check, ShoppingBag } from "lucide-react"
import { GarmentArt, type GarmentKind } from "@/components/experience/browser/garment-art"
import { CartDrawer, money, Stars, useCart, type PageProps, type Product } from "@/components/experience/browser/shop"
import { BOTTOMS, SHOES, TOPS, UNDERWEAR, type Item, type Sex } from "@/lib/avatar"
import { addToCart } from "@/lib/web"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  { id: "tops", name: "Tops" },
  { id: "pants", name: "Pants" },
  { id: "shoes", name: "Shoes" },
  { id: "underwear", name: "Underwear" },
] as const

type CategoryId = (typeof CATEGORIES)[number]["id"]

const GENDERS: { id: Sex; slug: string; name: string }[] = [
  { id: "woman", slug: "women", name: "Women" },
  { id: "man", slug: "men", name: "Men" },
]

const PRICES: Record<string, number> = {
  tee: 19.9,
  longsleeve: 29.9,
  knit: 49.9,
  jeans: 59.9,
  chinos: 49.9,
  shorts: 34.9,
  skirt: 44.9,
  sneakers: 79.9,
  boots: 119,
  boxers: 14.9,
  set: 29.9,
}

const BLURBS: Record<string, string> = {
  tee: "Soft organic cotton jersey with a relaxed fit.",
  longsleeve: "Midweight cotton with ribbed cuffs, easy to layer.",
  knit: "Chunky knit in a wool blend, warm without the itch.",
  jeans: "Straight leg denim with a little stretch.",
  chinos: "Tailored through the leg in a smooth cotton twill.",
  shorts: "Knee-length shorts with an elastic back waist.",
  skirt: "Fluid midi skirt that moves when you walk.",
  sneakers: "Clean low-top sneakers with a cushioned sole.",
  boots: "Leather ankle boots with a sturdy rubber sole.",
  boxers: "Pack of two in breathable stretch cotton.",
  set: "Matching soft-cup top and briefs in stretch cotton.",
}

type ShopItem = Product & { sex: Sex; kind: GarmentKind; color: string; sole?: string }

function rating(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 997
  return { rating: 4 + (hash % 9) / 10, reviews: 40 + ((hash * 7) % 900) }
}

function build(sex: Sex, category: CategoryId, items: Item[]): ShopItem[] {
  return items.map((item) => {
    const kind = (item.kind === "set" ? (sex === "man" ? "boxers" : "set") : item.kind) as GarmentKind
    const id = `${sex === "man" ? "men" : "women"}-${item.id}`
    return {
      id,
      name: item.label,
      sex,
      kind,
      color: item.color,
      sole: item.sole,
      price: PRICES[kind],
      category,
      blurb: BLURBS[kind],
      ...rating(id),
      art: <GarmentArt kind={kind} color={item.color} sole={item.sole} />,
    }
  })
}

const PRODUCTS: ShopItem[] = GENDERS.flatMap(({ id: sex }) => [
  ...build(sex, "tops", TOPS[sex]),
  ...build(sex, "pants", BOTTOMS[sex]),
  ...build(sex, "shoes", SHOES[sex]),
  ...build(sex, "underwear", UNDERWEAR[sex]),
])

const INK = "#1f1c19"

export function ThreadlineLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5 14 C9 6 15 18 19 10" fill="none" stroke="#c4553c" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className="font-serif text-[22px] leading-none tracking-[0.04em]">Threadline</span>
    </span>
  )
}

export function Threadline({ path, navigate }: PageProps) {
  const [slug = "", categoryId = "", itemId = ""] = path.split("/")
  const gender = GENDERS.find((item) => item.slug === slug) ?? null
  const category = CATEGORIES.find((item) => item.id === categoryId) ?? null
  const product = gender && category ? PRODUCTS.find((item) => item.id === itemId && item.sex === gender.id) : undefined
  const [cartOpen, setCartOpen] = useState(false)
  const { count } = useCart("threadline")

  const url = (sex: (typeof GENDERS)[number] | null, cat: string | null) =>
    ["threadline.com", sex?.slug ?? (cat ? "women" : ""), cat ?? ""].filter(Boolean).join("/")

  let body
  if (product) {
    body = <Detail key={product.id} product={product} onCart={() => setCartOpen(true)} navigate={navigate} />
  } else if (gender) {
    const items = PRODUCTS.filter((item) => item.sex === gender.id && (!category || item.category === category.id))
    body = (
      <main className="px-4 pt-4 @2xl:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-black/50 uppercase">{gender.name}</p>
            <h1 className="font-serif text-[28px] leading-tight">{category ? category.name : "New in"}</h1>
          </div>
          <div role="group" aria-label="Shop for" className="flex rounded-full border border-black/15 p-0.5 text-[12px]">
            {GENDERS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === gender.id}
                onClick={() => navigate(url(item, category?.id ?? null))}
                className={cn("h-8 rounded-full px-4", item.id === gender.id ? "bg-[#1f1c19] text-white" : "hover:bg-black/5")}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 @xl:grid-cols-3 @4xl:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="group flex flex-col">
              <button
                type="button"
                aria-label={item.name}
                onClick={() => navigate(`${url(gender, item.category)}/${item.id}`)}
                className="flex flex-col text-left"
              >
                <div className="aspect-[4/5] overflow-hidden bg-[#efece6] transition-transform group-hover:scale-[1.01]">{item.art}</div>
                <p className="mt-2 text-[13px]">{item.name}</p>
                <p className="text-[13px] text-black/60">{money(item.price, "€")}</p>
              </button>
              <button
                type="button"
                onClick={() => addToCart("threadline", item.id)}
                className="mt-2 h-8 border border-[#1f1c19] text-[11px] tracking-[0.12em] uppercase hover:bg-[#1f1c19] hover:text-white"
              >
                Add to bag
              </button>
            </div>
          ))}
        </div>
      </main>
    )
  } else {
    body = (
      <main className="px-4 pt-4 @2xl:px-8">
        <section className="grid gap-3 @xl:grid-cols-2">
          {GENDERS.map((item, index) => {
            const hero = PRODUCTS.find((p) => p.sex === item.id && p.category === (index === 0 ? "tops" : "pants"))
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(url(item, null))}
                className="group relative aspect-[5/4] overflow-hidden text-left"
                style={{ background: index === 0 ? "#e9dfd3" : "#dfe3e6" }}
              >
                <div className="absolute inset-y-0 right-0 w-1/2">
                  {hero && <GarmentArt kind={hero.kind} color={hero.color} backdrop={index === 0 ? "#e9dfd3" : "#dfe3e6"} />}
                </div>
                <div className="absolute bottom-5 left-5">
                  <p className="font-serif text-[30px] leading-none">{item.name}</p>
                  <p className="mt-2 text-[11px] tracking-[0.2em] uppercase underline-offset-4 group-hover:underline">Shop now</p>
                </div>
              </button>
            )
          })}
        </section>
        <section className="mt-6">
          <h2 className="mb-3 font-serif text-[22px]">Shop by category</h2>
          <div className="grid grid-cols-2 gap-3 @xl:grid-cols-4">
            {CATEGORIES.map((cat) => {
              const sample = PRODUCTS.find((p) => p.sex === "woman" && p.category === cat.id)
              return (
                <button key={cat.id} type="button" onClick={() => navigate(url(GENDERS[0], cat.id))} className="text-left">
                  <div className="aspect-square overflow-hidden">{sample?.art}</div>
                  <p className="mt-2 text-[12px] tracking-[0.14em] uppercase">{cat.name}</p>
                </button>
              )
            })}
          </div>
        </section>
      </main>
    )
  }

  return (
    <div className="@container relative min-h-full bg-[#faf8f4] font-sans" style={{ color: INK }}>
      <header className="sticky top-0 z-10 border-b border-black/10 bg-[#faf8f4]/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-3 px-4 @2xl:px-8">
          <button type="button" onClick={() => navigate("threadline.com")} aria-label="Threadline home">
            <ThreadlineLogo />
          </button>
          <button
            type="button"
            aria-label={`Bag, ${count} items`}
            onClick={() => setCartOpen(true)}
            className="relative flex h-9 items-center gap-1.5 rounded-full px-2 text-[12px] tracking-[0.12em] uppercase hover:bg-black/5"
          >
            <ShoppingBag className="h-5 w-5" strokeWidth={1.6} />
            <span className="hidden @md:inline">Bag</span>
            {count > 0 && (
              <span className="absolute -top-0.5 left-5 grid h-4 min-w-4 place-items-center rounded-full bg-[#c4553c] px-1 text-[10px] font-semibold tracking-normal text-white">
                {count}
              </span>
            )}
          </button>
        </div>
        <nav aria-label="Categories" className="flex gap-1 overflow-x-auto px-3 pb-2 text-[12px] tracking-[0.12em] uppercase [scrollbar-width:none] @2xl:px-7">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(url(gender, cat.id))}
              className={cn(
                "shrink-0 border-b-2 px-2 py-1.5",
                category?.id === cat.id ? "border-[#1f1c19]" : "border-transparent text-black/60 hover:text-black",
              )}
            >
              {cat.name}
            </button>
          ))}
        </nav>
      </header>
      {body}
      <footer className="mt-8 border-t border-black/10 py-5 text-center text-[11px] text-black/50">
        Threadline is a fictional shop on the Camilia desktop. Nothing here is for sale.
      </footer>
      <CartDrawer
        site="threadline"
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        products={PRODUCTS}
        currency="€"
        accent="#1f1c19"
        title="Your bag"
      />
    </div>
  )
}

function Detail({ product, onCart, navigate }: { product: ShopItem; onCart: () => void; navigate: PageProps["navigate"] }) {
  const [added, setAdded] = useState(false)
  const gender = GENDERS.find((item) => item.id === product.sex)!
  const category = CATEGORIES.find((item) => item.id === product.category)!
  return (
    <main className="px-4 pt-4 @2xl:px-8">
      <button
        type="button"
        onClick={() => navigate(`threadline.com/${gender.slug}/${category.id}`)}
        className="mb-3 text-[11px] tracking-[0.16em] text-black/55 uppercase hover:text-black"
      >
        {gender.name} / {category.name}
      </button>
      <div className="grid gap-5 @2xl:grid-cols-2 @2xl:gap-8">
        <div className="aspect-[4/5] overflow-hidden">{product.art}</div>
        <div className="@2xl:pt-6">
          <h1 className="font-serif text-[30px] leading-tight">{product.name}</h1>
          <p className="mt-1 text-[15px]">{money(product.price, "€")}</p>
          <Stars rating={product.rating} reviews={product.reviews} className="mt-2" />
          <p className="mt-4 max-w-[360px] text-[13px] leading-relaxed text-black/70">{product.blurb}</p>
          <button
            type="button"
            onClick={() => {
              addToCart("threadline", product.id)
              setAdded(true)
            }}
            className="mt-5 flex h-11 w-full max-w-[320px] items-center justify-center gap-2 bg-[#1f1c19] text-[12px] tracking-[0.16em] text-white uppercase hover:bg-black"
          >
            {added && <Check className="h-4 w-4" />}
            {added ? "Added to bag" : "Add to bag"}
          </button>
          <button
            type="button"
            onClick={onCart}
            className="mt-2 h-11 w-full max-w-[320px] border border-[#1f1c19] text-[12px] tracking-[0.16em] uppercase hover:bg-black/5"
          >
            View bag
          </button>
          <p className="mt-4 text-[12px] text-black/55">The same piece hangs in your wardrobe at Camilia.</p>
        </div>
      </div>
    </main>
  )
}
