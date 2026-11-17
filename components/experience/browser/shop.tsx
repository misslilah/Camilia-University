"use client"

import { useEffect, type ReactNode } from "react"
import { Minus, Plus, Star, Trash2, X } from "lucide-react"
import { cartCount, setCartQty, useWeb, type SiteId } from "@/lib/web"
import { cn } from "@/lib/utils"

export type Product = {
  id: string
  name: string
  price: number
  rating: number
  reviews: number
  category: string
  blurb: string
  art: ReactNode
}

export type PageProps = { path: string; navigate: (url: string) => void }

export function money(value: number, currency: "$" | "€") {
  const amount = value.toFixed(2)
  return currency === "$" ? `$${amount}` : `${amount.replace(".", ",")} €`
}

export function Stars({ rating, reviews, className }: { rating: number; reviews?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-label={`Rated ${rating} out of 5`}>
      <span className="inline-flex">
        {[0, 1, 2, 3, 4].map((index) => {
          const fill = Math.max(0, Math.min(1, rating - index))
          return (
            <span key={index} className="relative h-3.5 w-3.5">
              <Star className="absolute inset-0 h-3.5 w-3.5 text-[#e3a43c]/35" strokeWidth={1.6} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className="h-3.5 w-3.5 fill-[#f0a92e] text-[#e3a43c]" strokeWidth={1.6} />
              </span>
            </span>
          )
        })}
      </span>
      {reviews !== undefined && <span className="text-[11px] opacity-70">{reviews.toLocaleString("en-US")}</span>}
    </span>
  )
}

export function useCart(site: SiteId) {
  const web = useWeb()
  return { lines: web.carts[site] ?? {}, count: cartCount(web, site) }
}

export function CartDrawer({
  site,
  open,
  onClose,
  products,
  currency,
  accent,
  title,
}: {
  site: SiteId
  open: boolean
  onClose: () => void
  products: Product[]
  currency: "$" | "€"
  accent: string
  title: string
}) {
  const { lines } = useCart(site)
  const items = Object.entries(lines)
    .map(([id, qty]) => ({ product: products.find((item) => item.id === id), qty }))
    .filter((line): line is { product: Product; qty: number } => Boolean(line.product))
  const total = items.reduce((sum, line) => sum + line.product.price * line.qty, 0)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [open, onClose])

  return (
    <div className={cn("absolute inset-0 z-40", open ? "" : "pointer-events-none")} aria-hidden={!open} inert={!open}>
      <div
        className={cn("absolute inset-0 bg-black/35 transition-opacity duration-200", open ? "opacity-100" : "opacity-0")}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label={title}
        className={cn(
          "absolute top-0 right-0 bottom-0 flex w-full max-w-[340px] flex-col bg-white text-[#1b1f27] shadow-[-12px_0_40px_rgba(0,0,0,0.25)] transition-transform duration-250 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-black/10 px-4">
          <p className="text-[15px] font-semibold">{title}</p>
          <button type="button" aria-label="Close cart" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-black/5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-black/55">Your cart is empty.</p>
          ) : (
            <ul className="divide-y divide-black/8">
              {items.map(({ product, qty }) => (
                <li key={product.id} className="flex gap-3 px-4 py-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-[#f3f1ec]">{product.art}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{product.name}</p>
                    <p className="text-[13px] font-semibold">{money(product.price * qty, currency)}</p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`One less ${product.name}`}
                        onClick={() => setCartQty(site, product.id, qty - 1)}
                        className="grid h-6 w-6 place-items-center rounded border border-black/15 hover:bg-black/5"
                      >
                        {qty === 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      </button>
                      <span className="w-6 text-center text-[13px] tabular-nums">{qty}</span>
                      <button
                        type="button"
                        aria-label={`One more ${product.name}`}
                        onClick={() => setCartQty(site, product.id, qty + 1)}
                        className="grid h-6 w-6 place-items-center rounded border border-black/15 hover:bg-black/5"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="shrink-0 space-y-2.5 border-t border-black/10 p-4">
          <div className="flex items-baseline justify-between text-sm">
            <span>Subtotal</span>
            <span className="text-base font-semibold">{money(total, currency)}</span>
          </div>
          <button
            type="button"
            disabled
            className="h-10 w-full cursor-not-allowed rounded-full text-sm font-semibold opacity-60"
            style={{ background: accent }}
          >
            Checkout
          </button>
          <p className="text-center text-[11px] text-black/55">Checkout is coming soon.</p>
        </div>
      </aside>
    </div>
  )
}
