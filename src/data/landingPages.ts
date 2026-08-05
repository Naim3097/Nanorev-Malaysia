// ── Landing page engine: data layer ─────────────────────────────
// A landing page is a JSON document: an ordered list of typed sections.
// makePage() assembles shared sections (announce/trust/guarantee/FAQ/…)
// around per-product sales copy, so each product definition is pure copy.
// The backend will serve these documents later.
//
// Price & specs are read live from the product catalogue at render time —
// never frozen into the page — so a price change updates every page.

import type {
  AffiliateLinkSeed, AnnounceProps, BenefitsProps, CtaProps, FaqItem, GuaranteeProps,
  HeroProps, IconItem, LandingPageSeed, NavEntry, PacksProps, PackQuantity, PainsProps,
  PaymentGateway, Quote, Seo, StepsProps, TrustProps, WorkshopSeed,
} from '@/types'
import { productById } from './products'

// What each product page declares. Everything else — the announcement bar,
// trust strip, guarantee cards, base FAQ, pack copy — is shared and added by
// makePage(), so a product definition stays pure sales copy.
interface PageDef {
  id: string
  name: string
  productId: string
  seo: Seo
  hero: Pick<HeroProps, 'flag' | 'headline' | 'sub' | 'bullets'>
  pains: PainsProps
  benefits: Omit<BenefitsProps, 'eyebrow'>
  steps: Omit<StepsProps, 'eyebrow'>
  packs: PackQuantity[]
  quotes: Quote[]
  specsNote: string
  application: string
  faq: FaqItem[]
  cta: CtaProps
  /** Omitted = the simulated gateway. Only set this where real money is wanted. */
  paymentGateway?: PaymentGateway
}

export const workshops: WorkshopSeed[] = [
  { id: 'speedworks', name: 'Speedworks Auto', city: 'Klang', whatsapp: '60123456789' },
  { id: 'onegear', name: 'OneGear Motorsport', city: 'Shah Alam', whatsapp: '60198765432' },
]

const WA_DEFAULT = '60123456789' // TODO: real business number

// ── Shared blocks ────────────────────────────────────────────────
const ANNOUNCE: AnnounceProps = { text: 'Penghantaran PERCUMA untuk pesanan melebihi RM150 — ke seluruh Malaysia 🇲🇾' }

const HERO_META: IconItem[] = [
  { icon: 'truck', text: 'Hantar hari sama' },
  { icon: 'lock', text: 'FPX · Kad · e-Wallet' },
  { icon: 'star', text: 'Dipercayai bengkel panel' },
]

const TRUST: TrustProps = {
  items: [
    { icon: 'shield', text: 'Pengedar sah NanoRev' },
    { icon: 'badge', text: 'Produk original & bermeterai' },
    { icon: 'truck', text: 'Hantar hari sama sebelum 3 petang' },
    { icon: 'lock', text: 'Bayaran selamat & disulitkan' },
  ],
}

const GUARANTEE: GuaranteeProps = {
  eyebrow: 'Jaminan kami',
  title: 'Beli Dengan Yakin',
  items: [
    {
      icon: 'shield',
      title: '100% Original',
      text: 'Terus daripada Nano Revolution Autolube Sdn Bhd — pengedar sah. Setiap botol bermeterai kilang dengan nombor batch.',
    },
    {
      icon: 'truck',
      title: 'Hantar Hari Sama',
      text: 'Pesanan sebelum 3 petang keluar hari yang sama dari pusat pengedaran Shah Alam.',
    },
    {
      icon: 'lock',
      title: 'Bayaran Selamat',
      text: 'FPX, kad kredit/debit, e-wallet dan DuitNow QR — semua transaksi disulitkan sepenuhnya.',
    },
  ],
}

const BASE_FAQ: FaqItem[] = [
  {
    q: 'Berapa lama penghantaran?',
    a: 'Pesanan sebelum 3 petang dihantar pada hari yang sama dari Shah Alam. Lembah Klang biasanya tiba keesokan hari bekerja; Sabah & Sarawak dalam 2–4 hari bekerja.',
  },
  {
    q: 'Macam mana saya tahu ini produk original?',
    a: 'Anda membeli terus daripada Nano Revolution Autolube Sdn Bhd, pengedar sah NanoRev. Setiap botol bermeterai kilang dan mempunyai nombor batch.',
  },
  {
    q: 'Apakah kaedah pembayaran yang diterima?',
    a: "FPX (semua bank utama), kad kredit/debit, e-wallet (Touch 'n Go, GrabPay, Boost, ShopeePay) dan DuitNow QR.",
  },
  {
    q: 'Ada harga khas untuk bengkel atau pembelian pukal?',
    a: 'Ada. Harga dealer disediakan untuk pembelian pukal — pilih akaun Trade/Bengkel semasa checkout, atau WhatsApp kami untuk sebut harga.',
  },
]

const PACK_TEXT: Pick<PacksProps, 'unitLabel' | 'freeShip' | 'paidShip' | 'ctaPrefix'> = {
  unitLabel: 'unit',
  freeShip: 'Penghantaran PERCUMA',
  paidShip: 'Caj penghantaran dikira semasa checkout',
  ctaPrefix: 'Checkout',
}

function makePage(def: PageDef): LandingPageSeed {
  const p = productById(def.productId)
  if (!p) throw new Error(`landingPages: unknown productId "${def.productId}" on page "${def.id}"`)
  return {
    id: def.id,
    name: def.name,
    productId: def.productId,
    lang: 'ms',
    whatsapp: WA_DEFAULT,
    waText: `Hai NanoRev! Saya berminat dengan ${p.name} (${p.volume}). Boleh bantu saya?`,
    buyLabel: 'Beli Sekarang',
    paymentGateway: def.paymentGateway ?? 'mock',
    seo: def.seo,
    sections: [
      { type: 'announce', props: ANNOUNCE },
      {
        type: 'hero',
        props: { ...def.hero, priceNote: 'SST dikira semasa checkout', waLabel: 'Tanya di WhatsApp', meta: HERO_META },
      },
      { type: 'trust', props: TRUST },
      { type: 'pains', props: def.pains },
      { type: 'benefits', props: { eyebrow: 'Penyelesaiannya', ...def.benefits } },
      { type: 'steps', props: { eyebrow: 'Mudah sahaja', ...def.steps } },
      {
        type: 'packs',
        props: {
          eyebrow: 'Pilih pakej anda',
          title: 'Beli Lebih, Jimat Lebih',
          sub: 'Pesanan melebihi RM150 layak mendapat penghantaran PERCUMA ke seluruh Malaysia.',
          quantities: def.packs,
          ...PACK_TEXT,
        },
      },
      {
        type: 'testimonials',
        props: { eyebrow: 'Bukti sebenar', title: 'Mereka Dah Cuba. Ini Kata Mereka.', quotes: def.quotes },
      },
      { type: 'guarantee', props: GUARANTEE },
      {
        type: 'specs',
        props: {
          eyebrow: 'Data teknikal',
          title: 'Spesifikasi',
          note: def.specsNote,
          rows: [
            ['Produk', p.name],
            ['Isipadu', p.volume],
            ['Jenis', p.base],
            ['Fungsi', p.spec],
            ['Aplikasi', def.application],
          ],
        },
      },
      { type: 'faq', props: { eyebrow: 'Soalan lazim', title: 'Sebelum Anda Membeli', items: [...def.faq, ...BASE_FAQ] } },
      { type: 'cta', props: def.cta },
    ],
  }
}

// ── Product pages ────────────────────────────────────────────────
export const landingPages: LandingPageSeed[] = [
  // 1 ▸ Premium Nano Synthetic — rawatan minyak enjin
  makePage({
    id: 'lp-pns',
    name: 'Premium Nano Synthetic (BM)',
    productId: 'pns-01',
    seo: {
      title: 'Premium Nano Synthetic — Rawatan Minyak Enjin (Oil Treatment) | NanoRev Malaysia',
      description:
        'Enjin bising, pickup lemah? Rawatan nano 100ml kembalikan prestasi tanpa overhaul — enjin senyap, pecutan ringan. Teknologi Jerman. Hantar hari sama, seluruh Malaysia.',
      keywords:
        'rawatan minyak enjin, engine oil treatment Malaysia, aditif minyak hitam, enjin bising, enjin bergetar, kereta lama bunyi enjin, oil additive, elak overhaul enjin, nano treatment, NanoRev',
    },
    hero: {
      flag: 'Produk Terlaris · Teknologi Jerman · 100ml',
      headline: 'Enjin Bunyi Kasar? Kembalikan Rasa "Macam Baru" — Tanpa Overhaul',
      sub: 'Premium Nano Synthetic ialah rawatan minyak enjin berteknologi nano. Satu botol 100ml dituang bersama minyak enjin — geseran turun, bunyi enjin senyap, pickup kembali ringan. Untuk kereta yang dah mula "berumur", inilah jalan keluar paling mudah.',
      bullets: [
        'Salutan nano melindungi komponen dalaman & memanjangkan hayat enjin',
        'Serasi dengan semua minyak enjin — mineral, semi & fully synthetic',
        'Cukup satu botol setiap kali tukar minyak — tuang dan pandu',
      ],
    },
    pains: {
      eyebrow: 'Periksa dulu',
      title: 'Kereta Makin Berumur, Masalah Makin Terasa?',
      intro: 'Bukan salah anda — semua enjin akan haus. Tetapi anda boleh perlahankannya.',
      items: [
        {
          icon: 'noise',
          title: 'Enjin makin bising & bergetar',
          text: 'Kehausan pada komponen dalaman menyebabkan bunyi kasar — paling ketara waktu pagi dan dalam kesesakan.',
        },
        {
          icon: 'gauge',
          title: 'Pickup dah tak macam dulu',
          text: 'Geseran yang meningkat "mencuri" kuasa enjin. Pecutan makin lembap walaupun servis ikut jadual.',
        },
        {
          icon: 'flame',
          title: 'Risau kos baiki enjin',
          text: 'Overhaul enjin boleh mencecah ribuan ringgit. Ramai bertangguh — dan kerosakan menjadi lebih teruk.',
        },
      ],
      outro: 'Berita baiknya: anda tidak semestinya perlu overhaul. Kadangkala enjin cuma perlukan rawatan yang betul.',
    },
    benefits: {
      title: 'Satu Botol Kecil, Perubahan Besar',
      items: [
        {
          icon: 'zap',
          title: 'Geseran turun serta-merta',
          text: 'Zarah nano menyalut permukaan logam. Enjin berputar lebih ringan — anda rasa bezanya pada pecutan pertama.',
        },
        {
          icon: 'shield',
          title: 'Perlindungan berterusan',
          text: 'Salutan kekal aktif sehingga pertukaran minyak berikutnya — perlindungan tambahan pada setiap kilometer.',
        },
        {
          icon: 'heat',
          title: 'Sesuai cuaca panas Malaysia',
          text: 'Formula stabil pada suhu tinggi — untuk trafik sesak, perjalanan jauh dan cuaca 35°C.',
        },
      ],
    },
    steps: {
      title: 'Cara Guna — Semudah 1, 2, 3',
      items: [
        { title: 'Tukar minyak seperti biasa', text: 'Paling berkesan dituang bersama minyak enjin yang baru.' },
        { title: 'Tuang satu botol penuh', text: 'Terus ke dalam lubang minyak enjin. Satu botol 100ml untuk 3–5 liter minyak.' },
        { title: 'Pandu seperti biasa', text: 'Salutan nano terbentuk semasa anda memandu. Rasa bezanya dalam beberapa kilometer pertama.' },
      ],
    },
    packs: [
      { qty: 1, note: 'Cuba dulu' },
      { qty: 2, note: 'Paling popular', highlight: true },
      { qty: 3, note: 'Stok 3 servis', highlight: true },
    ],
    quotes: [
      {
        name: 'Azman',
        role: 'Pemandu Myvi 12 tahun · Kajang',
        text: 'Kereta saya dah 180,000 km. Lepas guna, bunyi enjin waktu pagi jauh berkurang. Isteri pun perasan bezanya.',
      },
      {
        name: 'Mr. Tan',
        role: 'Pemilik bengkel · Puchong',
        text: 'Kami syorkan pada pelanggan yang komplen enjin bising. Kebanyakannya datang balik untuk beli lagi.',
      },
      {
        name: 'Syafiq',
        role: 'Pemandu e-hailing · Subang',
        text: 'Kereta jalan 300 km sehari. Dengan rawatan ni enjin rasa ringan, bil minyak pun tak naik mendadak.',
      },
    ],
    specsNote: 'Serasi dengan semua jenis minyak enjin — petrol dan diesel.',
    application: 'Semua enjin petrol & diesel',
    faq: [
      {
        q: 'Adakah ia serasi dengan minyak enjin saya?',
        a: 'Ya. Premium Nano Synthetic serasi dengan minyak mineral, semi-synthetic dan fully synthetic — untuk enjin petrol mahupun diesel.',
      },
      {
        q: 'Berapa kerap perlu guna?',
        a: 'Satu botol setiap kali tukar minyak enjin (setiap 5,000–10,000 km) untuk perlindungan berterusan.',
      },
    ],
    cta: {
      title: 'Enjin Anda Masih Boleh Diselamatkan',
      text: 'Rawatan nano teknologi Jerman — tuang dan pandu.',
    },
  }),

  // 2 ▸ Nano Engine Flush — cuci enjin sebelum tukar minyak
  makePage({
    id: 'lp-flush',
    name: 'Nano Engine Flush (BM)',
    productId: 'cc-04',
    seo: {
      title: 'Nano Engine Flush — Cuci Enjin & Buang Sludge Dalam 10 Minit | NanoRev Malaysia',
      description:
        'Minyak hitam cepat kotor? Buang sludge & kotoran enjin dalam 10 minit setiap kali tukar minyak. Formula bio-tech, selamat untuk semua enjin. Hantar pantas seluruh Malaysia.',
      keywords:
        'engine flush Malaysia, cuci enjin, buang sludge enjin, enap cemar, minyak hitam cepat hitam, engine flush murah, guna engine flush masa servis, cuci dalaman enjin, NanoRev',
    },
    hero: {
      flag: 'Formula Bio-Tech · 10 Minit · 200ml',
      headline: 'Minyak Baru, Tapi Enjin Masih Kotor? Cuci Dalam 10 Minit.',
      sub: 'Setiap kali tukar minyak tanpa flush, sebahagian minyak lama dan kotoran kekal di dalam enjin. Nano Engine Flush membuangnya dalam 10 minit — supaya minyak baru anda bekerja dalam enjin yang bersih.',
      bullets: [
        'Larutkan enap cemar & deposit dalam 10 minit idle',
        'Formula bio-tech — selamat untuk seal dan komponen dalaman',
        'Guna setiap kali tukar minyak untuk hasil maksimum',
      ],
    },
    pains: {
      eyebrow: 'Periksa dulu',
      title: 'Servis Dah Buat, Tapi Tak Rasa Beza?',
      intro: 'Masalahnya mungkin bukan minyak baru — tetapi kotoran lama yang tak pernah dibuang.',
      items: [
        {
          icon: 'drops',
          title: 'Minyak baru cepat hitam',
          text: 'Kotoran lama larut ke dalam minyak baru dalam beberapa hari. Minyak mahal anda "kotor" sebelum sempat bekerja.',
        },
        {
          icon: 'gauge',
          title: 'Enjin masih berat selepas servis',
          text: 'Enap cemar menyekat saluran minyak — minyak baru tidak sampai sepenuhnya ke bahagian kritikal.',
        },
        {
          icon: 'flame',
          title: 'Bau & asap luar biasa',
          text: 'Deposit terbakar pada komponen panas menghasilkan bau dan asap — tanda enjin perlu dicuci.',
        },
      ],
      outro: 'Jalan keluarnya mudah: cuci enjin 10 minit setiap kali tukar minyak — tanpa buka apa-apa.',
    },
    benefits: {
      title: 'Enjin Bersih, Semuanya Jadi Lebih Baik',
      items: [
        {
          icon: 'drops',
          title: 'Buang kotoran hingga ke lubuk',
          text: 'Melarutkan sludge dan deposit di tempat yang minyak biasa tidak mampu cuci.',
        },
        {
          icon: 'zap',
          title: 'Minyak baru bekerja 100%',
          text: 'Dalam enjin bersih, minyak baru melindungi sepenuhnya — enjin lebih senyap dan lebih sejuk.',
        },
        {
          icon: 'shield',
          title: 'Selamat untuk semua enjin',
          text: 'Formula bio-tech tidak merosakkan seal, gasket atau komponen getah.',
        },
      ],
    },
    steps: {
      title: 'Guna Semasa Tukar Minyak',
      items: [
        { title: 'Tuang ke minyak lama', text: 'Sebelum membuang minyak lama, tuang satu botol penuh ke dalam enjin.' },
        { title: 'Idle 10–15 minit', text: 'Hidupkan enjin tanpa memandu. Biarkan formula bekerja melarutkan kotoran.' },
        { title: 'Buang & tukar baru', text: 'Buang minyak lama bersama kotoran, pasang filter baru, isi minyak baru. Siap.' },
      ],
    },
    packs: [
      { qty: 1, note: 'Cuba dulu' },
      { qty: 3, note: 'Paling popular', highlight: true },
      { qty: 6, note: 'Pakej bengkel', highlight: true },
    ],
    quotes: [
      {
        name: 'Rahim',
        role: 'Pemilik Proton Wira · Klang',
        text: 'Kereta lama 20 tahun. Lepas flush, minyak baru tahan lebih lama sebelum jadi hitam. Memang nampak beza.',
      },
      {
        name: 'Ah Chong',
        role: 'Foreman · Kepong',
        text: 'Prosedur standard bengkel saya untuk kereta yang jarang servis. Pelanggan puas hati.',
      },
      {
        name: 'Zul',
        role: 'Pemandu lori hantaran · Shah Alam',
        text: 'Guna setiap kali servis. Enjin rasa lebih sejuk, tak berat macam dulu.',
      },
    ],
    specsNote: 'Gunakan sebelum setiap pertukaran minyak enjin.',
    application: 'Semua enjin petrol & diesel',
    faq: [
      {
        q: 'Selamat ke untuk enjin lama?',
        a: 'Ya — formula bio-tech lembut pada seal dan gasket. Untuk enjin sangat lama yang jarang diservis, mulakan dengan idle 10 minit sahaja.',
      },
      {
        q: 'Perlu guna setiap kali tukar minyak?',
        a: 'Disyorkan, terutama jika anda kerap memandu dalam kesesakan. Sekurang-kurangnya setiap 2 kali pertukaran minyak.',
      },
    ],
    cta: {
      title: 'Minyak Baru Layak Dapat Enjin Bersih',
      text: '10 minit sebelum tukar minyak — perbezaan yang anda boleh dengar.',
    },
  }),

  // 3 ▸ Premium Racing Booster — kuasa & pecutan
  makePage({
    id: 'lp-boost',
    name: 'Premium Racing Booster (BM)',
    productId: 'prb-01',
    seo: {
      title: 'Premium Racing Booster — Tambah Power & Pickup Kereta | NanoRev Malaysia',
      description:
        'Pickup lemah bila memotong atau mendaki? Satu botol untuk satu tangki — pecutan lebih padu serta-merta. Selamat untuk kereta harian. Hantar hari sama, seluruh Malaysia.',
      keywords:
        'racing booster, octane booster Malaysia, tambah power kereta, pickup lemah, kereta tak berkuasa, pecutan lembap, minyak tambah pecutan, performance booster, balik kampung, NanoRev',
    },
    hero: {
      flag: 'Prestasi Tinggi · Satu Botol Satu Tangki · 200ml',
      headline: 'Nak Memotong Pun Kena Fikir Dua Kali? Kembalikan Kuasa Itu.',
      sub: 'Premium Racing Booster meningkatkan pembakaran dan respons enjin — pecutan lebih yakin di lebuh raya, lebih bertenaga ketika mendaki. Dirumus untuk pemandu yang mahukan lebih daripada keretanya.',
      bullets: [
        'Respons pedal lebih pantas — rasa bezanya pada pecutan pertama',
        'Sesuai untuk lebuh raya, jalan mendaki & muatan berat',
        'Selamat untuk enjin standard — bukan untuk kereta lumba sahaja',
      ],
    },
    pains: {
      eyebrow: 'Periksa dulu',
      title: 'Kuasa Enjin Makin Hilang?',
      intro: 'Enjin yang berusia kehilangan sedikit kuasa setiap tahun — perlahan-lahan, sehingga anda terbiasa dengannya.',
      items: [
        {
          icon: 'gauge',
          title: 'Memotong rasa berbahaya',
          text: 'Pecutan lembap bermakna masa memotong lebih panjang — dan risiko lebih tinggi di jalan raya.',
        },
        {
          icon: 'flame',
          title: 'Mendaki bukit rasa seksa',
          text: 'Genting, Cameron, muatan penuh — enjin meraung tetapi kereta seakan tidak bergerak.',
        },
        {
          icon: 'noise',
          title: 'RPM tinggi, kereta tak laju',
          text: 'Enjin meraung tetapi pecutan rendah — tanda pembakaran tidak cekap.',
        },
      ],
      outro: 'Sebelum terfikir untuk tukar kereta, cuba satu botol dulu. Ramai yang terkejut dengan bezanya.',
    },
    benefits: {
      title: 'Tenaga Yang Anda Boleh Rasa',
      items: [
        {
          icon: 'zap',
          title: 'Pembakaran lebih padu',
          text: 'Meningkatkan kecekapan pembakaran — lebih kuasa daripada setiap titis minyak.',
        },
        {
          icon: 'gauge',
          title: 'Respons segera',
          text: 'Pedal lebih sensitif, pecutan lebih yakin — untuk memotong dan memecut masuk lebuh raya.',
        },
        {
          icon: 'shield',
          title: 'Selamat untuk enjin harian',
          text: 'Formula seimbang — tidak menjejaskan enjin, sesuai untuk penggunaan berkala.',
        },
      ],
    },
    steps: {
      title: 'Satu Botol, Satu Tangki',
      items: [
        { title: 'Isi minyak penuh', text: 'Berkesan paling baik dengan tangki penuh (35–60 liter).' },
        { title: 'Tuang satu botol', text: 'Terus ke dalam tangki minyak petrol. Tidak perlu sukatan.' },
        { title: 'Pandu & rasa bezanya', text: 'Pecutan lebih padu sepanjang satu tangki. Ulang bila-bila anda perlukan kuasa tambahan.' },
      ],
    },
    packs: [
      { qty: 1, note: 'Cuba dulu' },
      { qty: 2, note: 'Untuk 2 tangki', highlight: true },
      { qty: 4, note: 'Stok berbaloi', highlight: true },
    ],
    quotes: [
      {
        name: 'Hafiz',
        role: 'Peminat kereta · Johor Bahru',
        text: 'Guna sebelum balik kampung. Bawa keluarga penuh satu kereta, naik bukit tak mengah macam dulu.',
      },
      {
        name: 'Daniel',
        role: 'Pemandu MPV · Puchong',
        text: 'MPV berat memang lembap. Dengan booster ni pickup lebih yakin bila nak memotong lori.',
      },
      {
        name: 'Mat',
        role: 'Mekanik · Seremban',
        text: 'Untuk pelanggan yang komplen hilang power, ini antara cara paling murah untuk cuba dulu.',
      },
    ],
    specsNote: 'Satu botol untuk satu tangki penuh (35–60 liter).',
    application: 'Enjin petrol',
    faq: [
      {
        q: 'Kereta standard boleh guna ke?',
        a: 'Boleh. Ia dirumus untuk enjin harian — bukan untuk kereta lumba sahaja. Ikut dos: satu botol untuk satu tangki penuh.',
      },
      {
        q: 'Berapa kerap boleh guna?',
        a: 'Setiap kali anda mahukan prestasi tambahan — perjalanan jauh, jalan mendaki, muatan berat — atau secara berkala setiap 3,000 km.',
      },
    ],
    cta: {
      title: 'Kuasa Tambahan, Bila Anda Perlukannya',
      text: 'Satu botol dalam but kereta — sedia untuk perjalanan penting.',
    },
  }),

  // 4 ▸ Nano Fuel Injector — jimat minyak
  makePage({
    id: 'lp-injector',
    name: 'Nano Fuel Injector (BM)',
    productId: 'cc-06',
    seo: {
      title: 'Nano Fuel Injector Cleaner — Jimat Petrol, Pickup Kembali | NanoRev Malaysia',
      description:
        'Kereta boros petrol & idle bergetar? Cuci >90% karbon injector tanpa buka enjin — tuang ke tangki dan pandu. Selamat untuk turbo & GDI. Hantar seluruh Malaysia.',
      keywords:
        'fuel injector cleaner Malaysia, cuci injector, kereta boros minyak, jimat petrol, idle kasar, injector tersumbat, kereta tersekat-sekat, injector cleaner murah, turbo GDI, NanoRev',
    },
    hero: {
      flag: 'Teknologi Jerman · >90% Karbon Dibersihkan · 200ml',
      headline: 'Kereta Makin Boros Minyak? Puncanya Mungkin Injector Kotor.',
      sub: 'Injector tersumbat membazirkan minyak pada setiap kilometer. Nano Fuel Injector membersihkan >90% deposit karbon — tanpa buka enjin, tanpa ke bengkel. Tuang ke tangki, isi minyak, pandu.',
      bullets: [
        'Terbukti membersihkan >90% deposit karbon pada injector',
        'Selamat untuk enjin turbo & GDI',
        'Jauh lebih jimat berbanding servis injector di bengkel',
      ],
    },
    pains: {
      eyebrow: 'Periksa dulu',
      title: 'Perasan Tak Perubahan Ini?',
      intro: 'Injector kotor berlaku perlahan-lahan — kebanyakan pemandu hanya sedar apabila bil minyak naik.',
      items: [
        {
          icon: 'drops',
          title: 'Minyak makin boros',
          text: 'Semburan bahan api tidak sekata membazirkan minyak — anda isi lebih kerap untuk jarak yang sama.',
        },
        {
          icon: 'noise',
          title: 'Idle bergetar & tak stabil',
          text: 'Enjin "menggigil" ketika berhenti di lampu isyarat — tanda pembakaran tidak seimbang.',
        },
        {
          icon: 'gauge',
          title: 'Pickup tersekat-sekat',
          text: 'Pecutan tidak lancar kerana injector tidak menyembur dengan sempurna.',
        },
      ],
      outro: 'Servis injector di bengkel boleh mencecah RM200+. Cuba jalan yang mudah dulu — tuang dan pandu.',
    },
    benefits: {
      title: 'Bersih Semula, Jimat Semula',
      items: [
        {
          icon: 'drops',
          title: 'Cuci >90% karbon',
          text: 'Formula Jerman melarutkan deposit pada injector dan ruang pembakaran.',
        },
        {
          icon: 'zap',
          title: 'Pembakaran kembali cekap',
          text: 'Semburan sekata bermaksud tenaga maksimum daripada setiap liter minyak.',
        },
        {
          icon: 'shield',
          title: 'Selamat untuk semua enjin petrol',
          text: 'Termasuk turbo dan GDI. Tidak menjejaskan sensor atau catalytic converter.',
        },
      ],
    },
    steps: {
      title: 'Tuang, Isi, Pandu',
      items: [
        { title: 'Tunggu tangki hampir kosong', text: 'Kepekatan formula paling berkesan pada tangki yang rendah.' },
        { title: 'Tuang satu botol, isi penuh', text: 'Tuang dulu, kemudian isi minyak seperti biasa.' },
        { title: 'Pandu seperti biasa', text: 'Pembersihan berlaku semasa memandu. Ulang setiap 5,000 km.' },
      ],
    },
    packs: [
      { qty: 1, note: 'Cuba dulu' },
      { qty: 4, note: 'Paling popular', highlight: true },
      { qty: 10, note: 'Pakej bengkel', highlight: true },
    ],
    quotes: [
      {
        name: 'Faridah',
        role: 'Pengguna Axia · Shah Alam',
        text: 'Dulu isi RM50 tahan 4 hari, sekarang boleh sampai 6 hari. Untuk harga macam ni memang berbaloi.',
      },
      {
        name: 'Kumar',
        role: 'Pemandu Grab · Petaling Jaya',
        text: 'Idle dulu bergetar teruk. Lepas 2 kali guna, dah stabil. Minyak pun jimat sikit.',
      },
      {
        name: 'Boon',
        role: 'Pemilik kedai aksesori · Melaka',
        text: 'Produk paling senang jual — murah, senang guna, pelanggan rasa hasilnya.',
      },
    ],
    specsNote: 'Guna setiap 5,000 km untuk penjimatan berterusan.',
    application: 'Enjin petrol (termasuk turbo & GDI)',
    faq: [
      {
        q: 'Kereta diesel boleh guna ke?',
        a: 'Formula ini untuk enjin petrol. Untuk diesel, hubungi kami di WhatsApp — kami syorkan produk yang sesuai.',
      },
      {
        q: 'Bila boleh nampak hasilnya?',
        a: 'Kebanyakan pengguna perasan idle lebih stabil dalam 50–100 km pertama, dan penjimatan minyak selepas satu tangki penuh.',
      },
    ],
    cta: {
      title: 'Bayar Sikit Hari Ini, Jimat Ratusan Setahun',
      text: 'Satu botol setiap 5,000 km — enjin bersih, poket selamat.',
    },
  }),

  // 5 ▸ Nano Transmission Protector — lindungi gearbox
  makePage({
    id: 'lp-trans',
    name: 'Nano Transmission Protector (BM)',
    productId: 'ntp-01',
    // First page on the real gateway. Every other page stays on the mock until
    // this one is proven in production.
    paymentGateway: 'leanx',
    seo: {
      title: 'Nano Transmission Protector — Gearbox Jerk & Gear Sentak | NanoRev Malaysia',
      description:
        'Gear sentak atau lambat respons? Lindungi gearbox sebelum rosak — anjakan lancar untuk auto, manual & CVT. Jauh lebih jimat daripada kos baiki ribuan ringgit.',
      keywords:
        'gearbox jerk Malaysia, gear sentak, aditif gearbox, ATF treatment, transmission protector, gearbox CVT bunyi, kos repair gearbox, gearbox lambat respond, auto manual CVT, NanoRev',
    },
    hero: {
      flag: 'Automatik · Manual · CVT · 200ml',
      headline: 'Gear Sentak Bila Tukar? Jangan Tunggu Sampai Gearbox Rosak.',
      sub: 'Kos membaiki gearbox boleh mencecah RM3,000 hingga RM8,000. Nano Transmission Protector melindungi transmisi anda sebelum sampai ke tahap itu — anjakan lebih lancar, getaran berkurang, gearbox lebih tahan lama.',
      bullets: [
        'Serasi dengan gearbox automatik, manual & CVT',
        'Anjakan gear lebih lancar — kurang sentakan D ke R',
        'Perlindungan & rawatan dalam satu botol 200ml',
      ],
    },
    pains: {
      eyebrow: 'Periksa dulu',
      title: 'Tanda-Tanda Awal Gearbox Bermasalah',
      intro: 'Gearbox jarang rosak mengejut — ia memberi amaran dahulu. Ini amarannya:',
      items: [
        {
          icon: 'gauge',
          title: 'Gear sentak bila tukar',
          text: 'Sentakan ketika D ke R atau semasa memecut — tanda geseran berlebihan dalam transmisi.',
        },
        {
          icon: 'noise',
          title: 'Bunyi mengaum ketika memandu',
          text: 'Bunyi dari transmisi yang makin kuat mengikut kelajuan — komponen dalaman semakin haus.',
        },
        {
          icon: 'flame',
          title: 'Respons gear lambat',
          text: 'Kereta "berfikir" dahulu sebelum bergerak selepas masuk gear — tekanan hidraulik tidak konsisten.',
        },
      ],
      outro: 'Kos baiki gearbox: beribu ringgit. Kos perlindungan awal: satu botol. Pilihan di tangan anda.',
    },
    benefits: {
      title: 'Lindungi Sebelum Terlambat',
      items: [
        {
          icon: 'shield',
          title: 'Salutan pelindung nano',
          text: 'Mengurangkan geseran dan haus pada gear, clutch pack dan bearing.',
        },
        {
          icon: 'zap',
          title: 'Anjakan lebih lancar',
          text: 'Tukar gear lebih halus, kurang sentakan — pemanduan lebih selesa untuk seisi keluarga.',
        },
        {
          icon: 'heat',
          title: 'Stabil pada suhu tinggi',
          text: 'Kekal berkesan dalam kesesakan dan perjalanan jauh — transmisi kekal terlindung.',
        },
      ],
    },
    steps: {
      title: 'Cara Guna',
      items: [
        { title: 'Panaskan kereta', text: 'Pandu 5–10 minit supaya minyak transmisi mencapai suhu operasi.' },
        { title: 'Tuang ke dalam transmisi', text: 'Melalui lubang dipstick ATF. Satu botol untuk satu transmisi.' },
        { title: 'Pandu & rasa bezanya', text: 'Berkesan sepenuhnya dalam 100–200 km. Ulang setiap kali servis ATF.' },
      ],
    },
    packs: [
      { qty: 1, note: 'Cuba dulu' },
      { qty: 2, note: 'Paling popular', highlight: true },
      { qty: 4, note: 'Pakej bengkel', highlight: true },
    ],
    quotes: [
      {
        name: 'Salleh',
        role: 'Pemandu Vios 2012 · Ipoh',
        text: 'Gear D ke R dulu sentak kuat. Lepas guna, dah jauh lebih lembut. Patut cuba dari dulu.',
      },
      {
        name: 'Jason',
        role: 'Pemilik Honda CVT · Cheras',
        text: 'CVT saya berbunyi mengaum sedikit. Lepas rawatan ni senyap balik. Berbaloi daripada tukar gearbox.',
      },
      {
        name: 'Roslan',
        role: 'Bengkel transmisi · Sungai Buloh',
        text: 'Untuk kes ringan, kami cuba protector ni dulu sebelum cadangkan overhaul. Selalunya menjadi.',
      },
    ],
    specsNote: 'Untuk kes kerosakan teruk, WhatsApp kami dahulu untuk nasihat percuma.',
    application: 'Gearbox automatik, manual & CVT',
    faq: [
      {
        q: 'CVT pun boleh guna ke?',
        a: 'Ya — serasi dengan gearbox automatik konvensional, manual dan CVT.',
      },
      {
        q: 'Gearbox saya dah teruk sentak — masih boleh diselamatkan?',
        a: 'Untuk kes ringan hingga sederhana, ramai pengguna melihat perubahan besar. Jika kerosakan teruk (gear slip sepenuhnya), rawatan mungkin tidak mencukupi — WhatsApp kami dulu, kami beri nasihat jujur.',
      },
    ],
    cta: {
      title: 'Lindungi Hari Ini, Elak Bil Ribuan Kemudian',
      text: 'Perlindungan transmisi paling mudah — tuang dan pandu.',
    },
  }),

  // Legacy ▸ NanoRev Synth 5W-40 (engine oil) — keeps old /l/5w40 links alive
  makePage({
    id: 'lp-5w40',
    name: 'NanoRev Synth 5W-40 (BM)',
    productId: 'eo-03',
    seo: {
      title: 'Minyak Enjin 5W-40 Fully Synthetic — NanoRev Synth 4L | NanoRev Malaysia',
      description:
        'Minyak enjin fully synthetic 5W-40 dengan teknologi nano untuk cuaca panas Malaysia. API SN, 4 liter. Penghantaran hari sama dari Shah Alam.',
      keywords: 'minyak enjin 5W-40, minyak hitam fully synthetic, minyak enjin Malaysia, NanoRev',
    },
    hero: {
      flag: 'Produk Terlaris · Fully Synthetic · API SN',
      headline: 'Enjin Lebih Senyap, Pickup Lebih Ringan — Sekali Tukar, Terus Rasa Beza',
      sub: 'NanoRev Synth 5W-40 ialah minyak enjin fully synthetic dengan teknologi nano — dirumus khas untuk cuaca panas dan trafik sesak di Malaysia. Dipercayai bengkel panel dan pemandu di seluruh negara.',
      bullets: [
        'Kurangkan haus enjin ketika cold start — masa paling kritikal untuk enjin anda',
        'Menepati spesifikasi API SN — selamat untuk enjin moden, tidak menjejaskan waranti',
        'Pek 4 liter — pesanan sebelum 3 petang dihantar hari yang sama dari Shah Alam',
      ],
    },
    pains: {
      eyebrow: 'Periksa dulu',
      title: 'Kereta Anda Ada Tanda-Tanda Ini?',
      intro: 'Kebanyakan pemandu tidak sedar minyak enjin mereka sudah rosak — sehinggalah kerosakan berlaku.',
      items: [
        {
          icon: 'noise',
          title: 'Enjin bunyi kasar waktu pagi',
          text: 'Minyak berkualiti rendah gagal melindungi enjin ketika cold start. Di sinilah sehingga 75% kehausan enjin berlaku.',
        },
        {
          icon: 'gauge',
          title: 'Pickup berat bila memotong',
          text: 'Geseran berlebihan dalam enjin "mencuri" kuasa. Anda tekan minyak, tetapi pecutan lambat menyambut.',
        },
        {
          icon: 'flame',
          title: 'Cepat panas dalam kesesakan',
          text: 'Trafik sesak dan cuaca 35°C memerah minyak enjin setiap hari. Minyak yang tidak stabil akan pecah dan membentuk enap cemar.',
        },
      ],
      outro: 'Jika mana-mana satu bunyi macam kereta anda — sudah tiba masanya beralih kepada minyak yang betul.',
    },
    benefits: {
      title: 'Teknologi Nano Yang Melindungi Setiap Perjalanan',
      items: [
        {
          icon: 'zap',
          title: 'Teknologi geseran nano',
          text: 'Zarah bersaiz nano menyalut permukaan logam dan mengurangkan geseran — enjin lebih senyap, pecutan lebih responsif.',
        },
        {
          icon: 'heat',
          title: 'Dibina untuk cuaca Malaysia',
          text: 'Kekal stabil dari kesesakan bandar hingga perjalanan jauh balik kampung. Tidak pecah, tidak membentuk enap cemar.',
        },
        {
          icon: 'drops',
          title: 'Enjin bersih, hayat lebih panjang',
          text: 'Formula detergen termaju mengekalkan kebersihan enjin supaya prestasi kekal sekata hingga servis seterusnya.',
        },
      ],
    },
    steps: {
      title: 'Semudah Servis Biasa',
      items: [
        { title: 'Padankan gred', text: 'Pastikan manual kenderaan anda menyatakan 5W-40 (atau WhatsApp kami untuk semak percuma).' },
        { title: 'Tukar seperti biasa', text: 'Di bengkel pilihan anda atau DIY — sama seperti pertukaran minyak biasa.' },
        { title: 'Rasa bezanya', text: 'Enjin lebih senyap dan pickup lebih ringan dari pemanduan pertama.' },
      ],
    },
    packs: [
      { qty: 1, note: 'Cuba dulu' },
      { qty: 2, note: 'Paling popular', highlight: true },
      { qty: 4, note: 'Pakej bengkel', highlight: true },
    ],
    quotes: [
      {
        name: 'Ah Seng',
        role: 'Pemilik bengkel · Klang',
        text: 'Bengkel saya guna NanoRev untuk semua servis sejak dua tahun lepas. Pelanggan datang balik cakap enjin lebih halus. Tak pernah ada komplen.',
      },
      {
        name: 'Faizal',
        role: 'Pemandu e-hailing · Shah Alam',
        text: 'Saya pandu 4,000 km sebulan. Dengan NanoRev, enjin kekal senyap sampai servis seterusnya. Berbaloi sangat untuk fully synthetic.',
      },
      {
        name: 'Kumar',
        role: 'Penyelia fleet lori · Pulau Pinang',
        text: 'Kualiti konsisten setiap tong. Penghantaran cepat dan harga dealer masuk akal untuk lori kami. Memang disyorkan.',
      },
    ],
    specsNote: 'Sentiasa rujuk manual kenderaan anda untuk gred kelikatan yang disyorkan.',
    application: 'Kereta persendirian & SUV',
    faq: [
      {
        q: 'Adakah minyak ini sesuai untuk kereta saya?',
        a: 'Rujuk manual kenderaan anda untuk gred kelikatan yang disyorkan. Jika gred sepadan (5W-40), minyak ini sesuai. Tidak pasti? WhatsApp kami model kereta anda — kami sahkan secara percuma.',
      },
    ],
    cta: {
      title: 'Enjin Anda Berhak Dapat Yang Terbaik',
      text: 'Dihantar hari yang sama · Bayaran selamat · Stok pengedar sah.',
    },
  }),
]

// ── Menu entries for the storefront (Navbar dropdown + Footer) ──
export const promoNav: NavEntry[] = [
  { slug: 'premium-nano-synthetic', label: 'Premium Nano Synthetic' },
  { slug: 'nano-engine-flush', label: 'Nano Engine Flush' },
  { slug: 'premium-racing-booster', label: 'Premium Racing Booster' },
  { slug: 'nano-fuel-injector', label: 'Nano Fuel Injector' },
  { slug: 'nano-transmission-protector', label: 'Nano Transmission Protector' },
]

// Affiliate links: slug → landing page (+ optional workshop co-brand).
export const affiliateLinks: AffiliateLinkSeed[] = [
  { slug: 'premium-nano-synthetic', pageId: 'lp-pns' },
  { slug: 'nano-engine-flush', pageId: 'lp-flush' },
  { slug: 'premium-racing-booster', pageId: 'lp-boost' },
  { slug: 'nano-fuel-injector', pageId: 'lp-injector' },
  { slug: 'nano-transmission-protector', pageId: 'lp-trans' },
  // workshop co-brand demos
  { slug: 'speedworks-premium-nano-synthetic', pageId: 'lp-pns', workshopId: 'speedworks' },
  { slug: 'onegear-premium-nano-synthetic', pageId: 'lp-pns', workshopId: 'onegear' },
  // legacy slugs — keep old shared URLs alive
  { slug: '5w40', pageId: 'lp-5w40' },
  { slug: 'speedworks-5w40', pageId: 'lp-5w40', workshopId: 'speedworks' },
  { slug: 'onegear-5w40', pageId: 'lp-5w40', workshopId: 'onegear' },
]

export function resolveLink(slug: string) {
  const link = affiliateLinks.find((l) => l.slug === slug)
  if (!link) return null
  const page = landingPages.find((p) => p.id === link.pageId)
  if (!page) return null
  const workshop = link.workshopId ? workshops.find((w) => w.id === link.workshopId) : null
  // canonical = the plain (non-workshop) slug for this page, for SEO dedupe
  const canonicalSlug = affiliateLinks.find((l) => l.pageId === link.pageId && !l.workshopId)?.slug || slug
  return { link, page, workshop, canonicalSlug }
}
