// Shared domain types for the NanoRev storefront, admin and API.
//
// The landing-page engine treats a page as an ordered list of typed sections
// (see src/data/landingPages.ts). SectionPropsMap is the single declaration of
// what each section type carries; Section derives a discriminated union from
// it, so the renderer in src/landing/sections.tsx is exhaustively type-checked
// and adding a section type surfaces every place that must handle it.

export type IconName =
  | 'badge' | 'drops' | 'flame' | 'gauge' | 'heat'
  | 'lock' | 'noise' | 'shield' | 'star' | 'truck' | 'zap'

export type ProductBadge = 'bestseller' | 'new' | 'pro' | 'bulk'

export interface Product {
  id: string
  name: string
  cat: string
  price: number
  grade: string
  tile: string
  volume: string
  base: string
  spec: string
  badge?: ProductBadge
  image?: string
  /** Present on products served by the store; absent in the static seed data. */
  stock?: number
  active?: boolean
}

/** A product as persisted by the store — stock and active are always set. */
export type StoredProduct = Product & { stock: number; active: boolean }

export interface Category {
  id: string
  name: string
  blurb: string
  tag: string
}

export interface Workshop {
  id: string
  name: string
  city: string
  whatsapp: string
  tier: string
  commissionRate: number
  active: boolean
}

/** Workshop fields authored by hand in the seed data; the rest are defaulted. */
export type WorkshopSeed = Pick<Workshop, 'id' | 'name' | 'city' | 'whatsapp'>

// ── Landing page sections ────────────────────────────────────────
export interface IconItem {
  icon: IconName
  text: string
}

export interface IconCard {
  icon: IconName
  title: string
  text: string
}

export interface AnnounceProps {
  text: string
}

export interface HeroProps {
  flag: string
  headline: string
  sub: string
  bullets: string[]
  priceNote: string
  waLabel: string
  meta: IconItem[]
}

export interface TrustProps {
  items: IconItem[]
}

export interface PainsProps {
  eyebrow: string
  title: string
  intro?: string
  items: IconCard[]
  outro?: string
}

export interface BenefitsProps {
  eyebrow: string
  title: string
  items: IconCard[]
}

export interface StepsProps {
  eyebrow: string
  title: string
  items: { title: string; text: string }[]
}

export interface PackQuantity {
  qty: number
  note?: string
  highlight?: boolean
}

export interface PacksProps {
  eyebrow: string
  title: string
  sub: string
  unitLabel: string
  quantities: PackQuantity[]
  freeShip: string
  paidShip: string
  ctaPrefix: string
}

export interface Quote {
  name: string
  role: string
  text: string
}

export interface TestimonialsProps {
  eyebrow: string
  title: string
  quotes: Quote[]
}

export interface GuaranteeProps {
  eyebrow: string
  title: string
  items: IconCard[]
}

export interface SpecsProps {
  eyebrow: string
  title: string
  note: string
  /** [label, value] tuples. Legacy pages instead carry `labels` + `application`. */
  rows?: [string, string][]
  labels?: Record<string, string>
  application?: string
}

export interface FaqItem {
  q: string
  a: string
}

export interface FaqProps {
  eyebrow: string
  title: string
  items: FaqItem[]
}

export interface CtaProps {
  title: string
  text: string
}

export interface SectionPropsMap {
  announce: AnnounceProps
  hero: HeroProps
  trust: TrustProps
  pains: PainsProps
  benefits: BenefitsProps
  steps: StepsProps
  packs: PacksProps
  testimonials: TestimonialsProps
  guarantee: GuaranteeProps
  specs: SpecsProps
  faq: FaqProps
  cta: CtaProps
}

export type SectionType = keyof SectionPropsMap

/** Discriminated union: narrowing on `type` gives the exact props shape. */
export type Section = {
  [K in SectionType]: { type: K; props: SectionPropsMap[K] }
}[SectionType]

// ── Landing pages, links, orders ─────────────────────────────────
export interface Seo {
  title: string
  description: string
  keywords: string
}

/**
 * Which gateway a page's buyers pay through. Absent or 'mock' means the
 * simulated gateway in src/utils/payment.ts — the safe default, so switching a
 * page to real money is always a deliberate act.
 */
export type PaymentGateway = 'mock' | 'leanx'

export interface LandingPage {
  id: string
  name: string
  productId: string
  lang: string
  whatsapp: string
  waText: string
  buyLabel: string
  seo: Seo
  sections: Section[]
  status: 'draft' | 'published'
  paymentGateway?: PaymentGateway
  updatedAt: string
}

/** A page as authored in the static seed data — status/updatedAt are added on seed. */
export type LandingPageSeed = Omit<LandingPage, 'status' | 'updatedAt'>

export interface AffiliateLink {
  slug: string
  pageId: string
  workshopId: string | null
  active: boolean
  clicks: number
  createdAt: string
}

/** Link fields authored by hand in the seed data. */
export interface AffiliateLinkSeed {
  slug: string
  pageId: string
  workshopId?: string
}

export interface NavEntry {
  slug: string
  label: string
}

export type CheckoutMode = 'delivery' | 'pickup'

export interface Totals {
  subtotal: number
  delivery: number
  sst: number
  total: number
}

export interface CheckoutDetails {
  mode: CheckoutMode
  locationId: string
  account: 'personal' | 'trade'
  name: string
  company: string
  phone: string
  email: string
  address: string
  unit: string
  postcode: string
  note: string
}

export interface OrderLine {
  id: string
  name: string
  volume: string
  price: number
  qty: number
}

/** Payment state recorded on an order. For LeanX this is written twice: at bill
 *  creation (pending, with the bill_no) and again by the verified webhook. */
export interface PaymentRecord {
  gateway: PaymentGateway
  /** LeanX `bill_no` — their id for the bill, echoed in the webhook. */
  billNo?: string
  /** Gateway-reported status, already mapped to our vocabulary. */
  status?: OrderStatus
  method?: string
  receiptId?: string
  paidAt?: string
  /** Full webhook payload, kept for audit and support. */
  raw?: Record<string, unknown>
}

export interface PaymentResult {
  status: string
  ref: string
  gateway: string
  method?: string
  amount: number
  paidAt: string
  receiptId: string
}

/**
 * `pending` exists only for redirect gateways: the order is written before the
 * buyer leaves for the hosted payment page, and nothing is fulfilled until a
 * signature-verified webhook moves it to `paid`. The mock gateway writes `paid`
 * directly, so it never passes through `pending`.
 */
export type OrderStatus =
  | 'pending' | 'paid' | 'packing' | 'dispatched' | 'completed' | 'cancelled' | 'failed'

export interface Order {
  ref: string
  createdAt: string
  status: OrderStatus
  customer: CheckoutDetails
  items: OrderLine[]
  totals: Totals
  payment: PaymentResult | PaymentRecord | null
  linkSlug: string | null
  workshopId: string | null
  commission: number
  oversold?: boolean
  /**
   * Unguessable token minted with a redirect-gateway order. Order refs are
   * derived from a timestamp and so are guessable; the receipt route requires
   * this token before returning any customer detail.
   */
  accessToken?: string
  /** Set once the webhook has credited stock and commission — the guard that
   *  makes redelivery a no-op even if the status was changed by hand since. */
  fulfilledAt?: string
}

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'void'

export interface Commission {
  id: string
  orderRef: string
  workshopId: string
  amount: number
  status: CommissionStatus
  createdAt: string
}

/** Cart lines are products plus a quantity. */
export type CartItem = Product & { qty: number }

export interface Location {
  id: string
  name: string
  address: string
  hours: string
  role: string
  eta: string
}

/**
 * What the buyer sees after paying. Richer than the persisted Order: it keeps
 * the full cart lines and the resolved payment/location labels for the on-screen
 * receipt, none of which the backend needs to store.
 */
export interface Receipt {
  ref: string
  receiptId: string
  items: CartItem[]
  totals: Totals
  details: CheckoutDetails
  method?: string
  methodDetail?: string
  location?: Location
  paidAt: string
}

/**
 * Attribution stamped into localStorage when a shopper lands on /l/<slug>.
 * The order endpoint only reads `slug` and `ts`; the rest is kept for analytics.
 */
export interface Attribution {
  slug: string
  ts: number
  pageId?: string
  workshopId?: string | null
  productId?: string
}

// ── Store shape ──────────────────────────────────────────────────
export interface StoreData {
  products: StoredProduct[]
  categories: Category[]
  workshops: Workshop[]
  pages: LandingPage[]
  links: AffiliateLink[]
  orders: Order[]
  commissions: Commission[]
}

/** What GET /api/landing/[slug] returns. */
export interface ResolvedLanding {
  page: LandingPage
  workshop: Workshop | null
  product: StoredProduct
  canonicalSlug: string
}
