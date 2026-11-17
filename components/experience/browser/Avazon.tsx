"use client"

import { useState } from "react"
import { Check, ChevronRight, Search, ShoppingCart, Truck } from "lucide-react"
import { FurnitureArt, type FurnitureKind } from "@/components/experience/browser/furniture-art"
import { CartDrawer, money, Stars, useCart, type PageProps, type Product } from "@/components/experience/browser/shop"
import { addToCart } from "@/lib/web"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  { id: "beds", name: "Beds" },
  { id: "desks", name: "Desks" },
  { id: "chairs", name: "Chairs" },
  { id: "storage", name: "Wardrobes & storage" },
  { id: "lighting", name: "Lighting" },
  { id: "decor", name: "Decor" },
]

type Row = [id: string, name: string, kind: FurnitureKind, color: string, price: number, rating: number, reviews: number, blurb: string]

const ROWS: Record<string, Row[]> = {
  beds: [
    ["oak-platform-bed", "Oak platform bed, double", "bed", "#b58a5e", 329, 4.6, 2841, "Low solid-oak frame with a slatted base and a padded headboard."],
    ["navy-upholstered-bed", "Upholstered bed, navy", "bed", "#34456b", 449, 4.4, 1132, "Soft velvet-look upholstery and a tall channel-stitched headboard."],
    ["pine-bunk-bed", "Pine bunk bed with ladder", "bunk", "#d2b48a", 279, 4.3, 864, "Two single berths, a fixed ladder and safety rails on the top bunk."],
    ["linen-daybed", "Linen daybed with cushions", "daybed", "#9aa48d", 389, 4.5, 512, "A sofa by day and a single bed at night, with three loose cushions."],
  ],
  desks: [
    ["walnut-writing-desk", "Walnut writing desk", "desk", "#7a5235", 189, 4.7, 3920, "Compact desk with a side drawer, sized for a laptop and a lamp."],
    ["white-study-desk", "White study desk", "desk", "#e8e6e1", 129, 4.4, 6210, "Clean matte top and a cable cut-out at the back."],
    ["electric-standing-desk", "Electric standing desk", "standing-desk", "#c9a679", 399, 4.6, 2287, "Dual-motor frame with four height presets, from 72 to 120 cm."],
    ["corner-desk-l", "L-shaped corner desk", "corner-desk", "#4b4d52", 219, 4.2, 980, "Wraps around a corner to fit two monitors and a printer."],
  ],
  chairs: [
    ["mesh-office-chair", "Ergonomic mesh office chair", "office-chair", "#2f3542", 249, 4.5, 8733, "Breathable mesh back, lumbar support and 4D armrests."],
    ["task-chair-blue", "Task chair, ocean blue", "office-chair", "#3c6fb0", 119, 4.1, 2405, "Light, height-adjustable chair for desks and study corners."],
    ["reading-armchair", "Reading armchair, mustard", "armchair", "#d1a03b", 299, 4.7, 1487, "Deep seat, wide arms and solid beech legs."],
    ["bar-stool-oak", "Oak bar stool", "stool", "#b58a5e", 69, 4.3, 655, "Counter-height stool with a footrest ring."],
  ],
  storage: [
    ["two-door-wardrobe", "Two-door wardrobe, oak", "wardrobe", "#b98f5f", 359, 4.4, 2190, "Hanging rail, a top shelf and soft-close doors."],
    ["white-wardrobe", "Wardrobe with mirror door, white", "wardrobe", "#ecebe6", 289, 4.2, 1361, "Slim wardrobe with a full-length mirror on one door."],
    ["tall-bookcase", "Tall bookcase, five shelves", "bookcase", "#d7c3a0", 149, 4.6, 4022, "Adjustable shelves and wall anchoring included."],
    ["three-drawer-dresser", "Three-drawer dresser", "dresser", "#8d6a4c", 199, 4.5, 1875, "Smooth runners and a top wide enough for a mirror."],
  ],
  lighting: [
    ["arc-floor-lamp", "Floor lamp with linen shade", "floor-lamp", "#efe6d2", 89, 4.5, 3017, "Warm, diffused light for reading corners."],
    ["architect-desk-lamp", "Architect desk lamp", "desk-lamp", "#2b5aa8", 45, 4.6, 5530, "Spring-balanced arm that stays where you point it."],
    ["brass-pendant", "Dome pendant, brass", "pendant", "#c49a45", 79, 4.3, 742, "Ceiling pendant with a satin brass finish."],
    ["black-desk-lamp", "Desk lamp, matte black", "desk-lamp", "#24262b", 39, 4.4, 2876, "Compact lamp with a weighted base."],
  ],
  decor: [
    ["monstera-planter", "Faux monstera in a planter", "plant", "#d9d3c6", 35, 4.4, 2111, "Lifelike leaves that never need watering."],
    ["arched-mirror", "Arched wall mirror", "mirror", "#c8a25a", 119, 4.7, 1693, "Slim metal frame, 50 × 120 cm."],
    ["wool-rug", "Wool rug, terracotta", "rug", "#c0694a", 159, 4.5, 908, "Hand-tufted rug, 160 × 230 cm."],
    ["framed-print", "Framed landscape print", "frame", "#2d2f35", 29, 4.6, 1320, "A4 print in a black frame with a white mount."],
    ["wall-clock", "Silent wall clock", "clock", "#3d5a80", 25, 4.3, 2466, "Sweep movement, so no ticking at night."],
  ],
}

const PRODUCTS: (Product & { kind: FurnitureKind; color: string })[] = CATEGORIES.flatMap((category) =>
  ROWS[category.id].map(([id, name, kind, color, price, rating, reviews, blurb]) => ({
    id,
    name,
    kind,
    color,
    price: price - 0.01,
    rating,
    reviews,
    blurb,
    category: category.id,
    art: <FurnitureArt kind={kind} color={color} />,
  })),
)

const NAVY = "#131a2a"
const ORANGE = "#f39a1f"

export function AvazonLogo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <svg viewBox="0 0 132 40" className={className} role="img" aria-label="avazon">
      <text
        x="4"
        y="24"
        fontFamily="ui-rounded, 'Nunito', 'Arial Rounded MT Bold', system-ui, sans-serif"
        fontSize="27"
        fontWeight="800"
        letterSpacing="-0.5"
        fill={dark ? NAVY : "#ffffff"}
      >
        avazon
      </text>
      <path d="M10 30 Q62 42 112 29" fill="none" stroke={ORANGE} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M105 26.5 L113.5 28.6 L108.6 35.4" fill="none" stroke={ORANGE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Avazon({ path, navigate }: PageProps) {
  const [section, id = ""] = path.split("/")
  const [cartOpen, setCartOpen] = useState(false)
  const { count } = useCart("avazon")
  const query = section === "s" ? decodeURIComponent(id) : ""

  let body
  if (section === "c" && CATEGORIES.some((category) => category.id === id)) {
    body = <Category key={id} id={id} navigate={navigate} />
  } else if (section === "p" && PRODUCTS.some((product) => product.id === id)) {
    body = <Detail key={id} id={id} navigate={navigate} onAdded={() => setCartOpen(true)} />
  } else if (section === "s") {
    body = <Results query={query} navigate={navigate} />
  } else {
    body = <Home navigate={navigate} />
  }

  return (
    <div className="@container relative min-h-full bg-[#eef0f3] font-sans text-[#141821]">
      <header style={{ background: NAVY }} className="text-white">
        <div className="flex items-center gap-3 px-3 py-2 @2xl:gap-5 @2xl:px-5">
          <button type="button" onClick={() => navigate("avazon.com")} className="shrink-0 rounded px-1 pt-1 hover:ring-1 hover:ring-white/60">
            <AvazonLogo className="h-8 w-[104px]" />
          </button>
          <Searchbar key={query} initial={query} onSearch={(q) => navigate(q ? `avazon.com/s/${encodeURIComponent(q)}` : "avazon.com")} />
          <button
            type="button"
            aria-label={`Cart, ${count} items`}
            onClick={() => setCartOpen(true)}
            className="relative flex shrink-0 items-end gap-1 rounded px-1.5 py-1 hover:ring-1 hover:ring-white/60"
          >
            <ShoppingCart className="h-7 w-7" strokeWidth={1.7} />
            <span
              className="absolute -top-0.5 left-[15px] min-w-5 rounded-full px-1 text-center text-[12px] leading-5 font-bold"
              style={{ color: ORANGE }}
            >
              {count}
            </span>
            <span className="hidden pb-0.5 text-[13px] font-semibold @xl:inline">Cart</span>
          </button>
        </div>
        <nav aria-label="Categories" className="flex gap-1 overflow-x-auto bg-[#232f45] px-2 text-[13px] [scrollbar-width:none] @2xl:px-4">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => navigate(`avazon.com/c/${category.id}`)}
              className={cn(
                "shrink-0 rounded-sm px-2.5 py-2 whitespace-nowrap hover:ring-1 hover:ring-white/60",
                section === "c" && id === category.id && "font-semibold text-[#ffc46b]",
              )}
            >
              {category.name}
            </button>
          ))}
        </nav>
      </header>
      {body}
      <footer className="mt-6 py-5 text-center text-[11px] text-white/70" style={{ background: "#232f45" }}>
        avazon is a fictional store on the Camilia desktop. Nothing here is for sale.
      </footer>
      <CartDrawer
        site="avazon"
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        products={PRODUCTS}
        currency="$"
        accent="#ffcf4a"
        title="Shopping cart"
      />
    </div>
  )
}

function Searchbar({ initial, onSearch }: { initial: string; onSearch: (query: string) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <form
      role="search"
      className="flex h-10 min-w-0 flex-1 overflow-hidden rounded-md bg-white focus-within:ring-3 focus-within:ring-[#f39a1f]"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch(value.trim())
      }}
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search avazon"
        aria-label="Search avazon"
        className="min-w-0 flex-1 px-3 text-[14px] text-[#141821] outline-none placeholder:text-black/45"
      />
      <button type="submit" aria-label="Search" className="grid w-11 shrink-0 place-items-center bg-[#f5b04a] text-[#141821] hover:bg-[#f39a1f]">
        <Search className="h-5 w-5" />
      </button>
    </form>
  )
}

function Card({ product, navigate }: { product: Product; navigate: PageProps["navigate"] }) {
  return (
    <div className="flex flex-col rounded-[10px] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <button
        type="button"
        onClick={() => navigate(`avazon.com/p/${product.id}`)}
        className="flex flex-1 flex-col text-left"
        aria-label={product.name}
      >
        <div className="aspect-[4/3] overflow-hidden rounded-md">{product.art}</div>
        <p className="mt-2 line-clamp-2 text-[13px] leading-snug hover:text-[#b4590c]">{product.name}</p>
        <Stars rating={product.rating} reviews={product.reviews} className="mt-1 text-[#2862a8]" />
        <p className="mt-1 text-[17px] font-semibold">{money(product.price, "$")}</p>
      </button>
      <button
        type="button"
        onClick={() => addToCart("avazon", product.id)}
        className="mt-2 h-8 rounded-full bg-[#ffd451] text-[12px] font-medium hover:bg-[#f7c531]"
      >
        Add to cart
      </button>
    </div>
  )
}

function Grid({ products, navigate }: { products: Product[]; navigate: PageProps["navigate"] }) {
  return (
    <div className="grid grid-cols-2 gap-3 @xl:grid-cols-3 @4xl:grid-cols-4">
      {products.map((product) => (
        <Card key={product.id} product={product} navigate={navigate} />
      ))}
    </div>
  )
}

function Home({ navigate }: { navigate: PageProps["navigate"] }) {
  return (
    <main className="space-y-5 px-3 pt-4 @2xl:px-5">
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#1e3a5f] via-[#2b5c86] to-[#3f8aa5] px-5 py-6 text-white @2xl:px-8 @2xl:py-8">
        <p className="text-[12px] font-semibold tracking-[0.2em] text-[#ffc46b] uppercase">Back to campus</p>
        <h1 className="mt-1 max-w-[440px] text-2xl leading-tight font-bold @2xl:text-3xl">Set up your room for the new term</h1>
        <p className="mt-2 max-w-[400px] text-[13px] text-white/80">Beds, desks and lamps that fit a student room, delivered in two days.</p>
        <button
          type="button"
          onClick={() => navigate("avazon.com/c/desks")}
          className="mt-4 h-9 rounded-full bg-[#ffd451] px-5 text-[13px] font-semibold text-[#141821] hover:bg-[#f7c531]"
        >
          Shop desks
        </button>
        <div className="pointer-events-none absolute top-3 right-4 hidden h-36 w-48 overflow-hidden rounded-[10px] opacity-95 @2xl:block">
          <FurnitureArt kind="desk-lamp" color="#ffd451" />
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-[17px] font-bold">Shop by category</h2>
        <div className="grid grid-cols-2 gap-3 @xl:grid-cols-3">
          {CATEGORIES.map((category) => {
            const sample = PRODUCTS.find((product) => product.category === category.id)
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => navigate(`avazon.com/c/${category.id}`)}
                className="rounded-[10px] bg-white p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-md"
              >
                <p className="mb-2 text-[14px] font-semibold">{category.name}</p>
                <div className="aspect-[4/3] overflow-hidden rounded-md">{sample?.art}</div>
                <p className="mt-2 text-[12px] text-[#2862a8]">Shop now</p>
              </button>
            )
          })}
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-[17px] font-bold">Popular with students</h2>
        <Grid products={PRODUCTS.filter((product) => product.rating >= 4.6).slice(0, 8)} navigate={navigate} />
      </section>
    </main>
  )
}

function Crumbs({ items, navigate }: { items: { label: string; url?: string }[]; navigate: PageProps["navigate"] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[12px] text-black/60">
      {items.map((item, index) => (
        <span key={item.label} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-3 w-3" />}
          {item.url ? (
            <button type="button" onClick={() => navigate(item.url!)} className="hover:text-[#b4590c] hover:underline">
              {item.label}
            </button>
          ) : (
            <span className="text-black/80">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

function Category({ id, navigate }: { id: string; navigate: PageProps["navigate"] }) {
  const [sort, setSort] = useState<"featured" | "low" | "high" | "rating">("featured")
  const category = CATEGORIES.find((item) => item.id === id)!
  const products = PRODUCTS.filter((product) => product.category === id).sort((a, b) =>
    sort === "low" ? a.price - b.price : sort === "high" ? b.price - a.price : sort === "rating" ? b.rating - a.rating : 0,
  )
  return (
    <main className="px-3 pt-3 @2xl:px-5">
      <Crumbs items={[{ label: "Home", url: "avazon.com" }, { label: "Furniture" }, { label: category.name }]} navigate={navigate} />
      <div className="mt-2 mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{category.name}</h1>
          <p className="text-[12px] text-black/60">{products.length} results</p>
        </div>
        <label className="flex items-center gap-2 text-[12px]">
          Sort by
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="h-8 rounded-md border border-black/15 bg-white px-2 text-[12px]"
          >
            <option value="featured">Featured</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
            <option value="rating">Customer rating</option>
          </select>
        </label>
      </div>
      <Grid products={products} navigate={navigate} />
    </main>
  )
}

function Results({ query, navigate }: { query: string; navigate: PageProps["navigate"] }) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const matches = (text: string) => words.every((word) => text.toLowerCase().includes(word))
  const label = (product: Product) => `${product.name} ${CATEGORIES.find((c) => c.id === product.category)?.name}`
  const products = [
    ...PRODUCTS.filter((product) => matches(label(product))),
    ...PRODUCTS.filter((product) => !matches(label(product)) && matches(`${label(product)} ${product.blurb}`)),
  ]
  return (
    <main className="px-3 pt-3 @2xl:px-5">
      <p className="mb-3 text-[13px]">
        {products.length} {products.length === 1 ? "result" : "results"} for <span className="font-semibold text-[#b4590c]">&ldquo;{query}&rdquo;</span>
      </p>
      {products.length > 0 ? (
        <Grid products={products} navigate={navigate} />
      ) : (
        <p className="rounded-[10px] bg-white px-4 py-10 text-center text-sm text-black/60">No furniture matches that search. Try “desk” or “lamp”.</p>
      )}
    </main>
  )
}

function Detail({ id, navigate, onAdded }: { id: string; navigate: PageProps["navigate"]; onAdded: () => void }) {
  const product = PRODUCTS.find((item) => item.id === id)!
  const category = CATEGORIES.find((item) => item.id === product.category)!
  const [added, setAdded] = useState(false)
  const related = PRODUCTS.filter((item) => item.category === product.category && item.id !== product.id)
  return (
    <main className="px-3 pt-3 @2xl:px-5">
      <Crumbs
        items={[{ label: "Home", url: "avazon.com" }, { label: category.name, url: `avazon.com/c/${category.id}` }, { label: product.name }]}
        navigate={navigate}
      />
      <div className="mt-3 grid gap-4 rounded-xl bg-white p-4 @2xl:grid-cols-[1.1fr_1fr] @2xl:gap-6">
        <div className="aspect-[4/3] overflow-hidden rounded-[10px]">{product.art}</div>
        <div>
          <h1 className="text-xl leading-snug font-semibold">{product.name}</h1>
          <Stars rating={product.rating} reviews={product.reviews} className="mt-1 text-[#2862a8]" />
          <p className="mt-3 text-[26px] font-semibold">{money(product.price, "$")}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-black/75">{product.blurb}</p>
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-[#1d7a3a]">
            <Truck className="h-4 w-4" /> Free delivery to Camilia University in 2 days
          </p>
          <p className="mt-1 text-[13px] font-medium text-[#1d7a3a]">In stock</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                addToCart("avazon", product.id)
                setAdded(true)
              }}
              className="flex h-10 items-center gap-1.5 rounded-full bg-[#ffd451] px-6 text-[13px] font-semibold hover:bg-[#f7c531]"
            >
              {added && <Check className="h-4 w-4" />}
              {added ? "Added to cart" : "Add to cart"}
            </button>
            <button type="button" onClick={onAdded} className="h-10 rounded-full border border-black/15 px-5 text-[13px] hover:bg-black/5">
              View cart
            </button>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-[16px] font-bold">More in {category.name}</h2>
          <Grid products={related} navigate={navigate} />
        </section>
      )}
    </main>
  )
}
