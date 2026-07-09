// Section registry for the landing page builder — the equivalent of
// Nexova's element library + per-type property forms, but schema-driven:
// each section type declares its editable fields once, and a generic form
// engine (fields.jsx) renders the properties panel from that declaration.
//
// Field kinds: text · textarea · number · checkbox · select · strings
// (array of strings) · items (array of objects, with itemFields) · pairs
// (array of [label, value] tuples — used by the specs table).

// icon keys available to section configs (see ICONS in landing/sections.jsx)
export const ICON_OPTIONS = [
  'badge', 'drops', 'flame', 'gauge', 'heat', 'lock', 'noise', 'shield', 'star', 'truck', 'zap',
]

const icon = (key = 'icon', label = 'Ikon') => ({ key, label, kind: 'select', options: ICON_OPTIONS })

export const SECTION_DEFS = {
  announce: {
    label: 'Announcement Bar',
    description: 'Strip merah di atas — tawaran / penghantaran percuma',
    fields: [{ key: 'text', label: 'Teks', kind: 'textarea' }],
    defaultProps: { text: 'Penghantaran PERCUMA untuk pesanan melebihi RM150 — ke seluruh Malaysia 🇲🇾' },
  },
  hero: {
    label: 'Hero',
    description: 'Tajuk utama, harga, butang beli & WhatsApp',
    fields: [
      { key: 'flag', label: 'Flag (atas tajuk)', kind: 'text' },
      { key: 'headline', label: 'Tajuk utama (H1)', kind: 'textarea' },
      { key: 'sub', label: 'Subtajuk', kind: 'textarea' },
      { key: 'bullets', label: 'Senarai kelebihan', kind: 'strings' },
      { key: 'priceNote', label: 'Nota harga', kind: 'text' },
      { key: 'waLabel', label: 'Label butang WhatsApp', kind: 'text' },
      {
        key: 'meta', label: 'Meta bar (bawah butang)', kind: 'items',
        itemFields: [icon(), { key: 'text', label: 'Teks', kind: 'text' }],
      },
    ],
    defaultProps: {
      flag: 'Produk Terlaris',
      headline: 'Tajuk Jualan Anda Di Sini',
      sub: 'Terangkan masalah yang produk ini selesaikan dan kenapa ia mudah.',
      bullets: ['Kelebihan pertama', 'Kelebihan kedua', 'Kelebihan ketiga'],
      priceNote: 'SST dikira semasa checkout',
      waLabel: 'Tanya di WhatsApp',
      meta: [
        { icon: 'truck', text: 'Hantar hari sama' },
        { icon: 'lock', text: 'FPX · Kad · e-Wallet' },
      ],
    },
  },
  trust: {
    label: 'Trust Strip',
    description: 'Jalur gelap dengan jaminan ringkas',
    fields: [{
      key: 'items', label: 'Item', kind: 'items',
      itemFields: [icon(), { key: 'text', label: 'Teks', kind: 'text' }],
    }],
    defaultProps: {
      items: [
        { icon: 'shield', text: 'Pengedar sah NanoRev' },
        { icon: 'truck', text: 'Hantar hari sama sebelum 3 petang' },
      ],
    },
  },
  pains: {
    label: 'Masalah (Pains)',
    description: 'Soalan masalah pelanggan + "jalan keluar"',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
      { key: 'title', label: 'Tajuk', kind: 'text' },
      { key: 'intro', label: 'Pengenalan', kind: 'textarea' },
      {
        key: 'items', label: 'Masalah', kind: 'items',
        itemFields: [icon(), { key: 'title', label: 'Tajuk', kind: 'text' }, { key: 'text', label: 'Teks', kind: 'textarea' }],
      },
      { key: 'outro', label: 'Penutup (jalan keluar)', kind: 'textarea' },
    ],
    defaultProps: {
      eyebrow: 'Periksa dulu',
      title: 'Kereta Anda Ada Tanda-Tanda Ini?',
      intro: '',
      items: [{ icon: 'noise', title: 'Masalah pertama', text: 'Terangkan masalah yang pelanggan rasa setiap hari.' }],
      outro: 'Ada jalan keluar yang mudah — tanpa kos ribuan.',
    },
  },
  benefits: {
    label: 'Kelebihan (Benefits)',
    description: 'Penyelesaian — 3 kad kelebihan',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
      { key: 'title', label: 'Tajuk', kind: 'text' },
      {
        key: 'items', label: 'Kelebihan', kind: 'items',
        itemFields: [icon(), { key: 'title', label: 'Tajuk', kind: 'text' }, { key: 'text', label: 'Teks', kind: 'textarea' }],
      },
    ],
    defaultProps: {
      eyebrow: 'Penyelesaiannya',
      title: 'Kenapa Produk Ini Berbeza',
      items: [{ icon: 'zap', title: 'Kelebihan', text: 'Terangkan hasilnya untuk pemandu.' }],
    },
  },
  steps: {
    label: 'Cara Guna (Steps)',
    description: 'Langkah 1-2-3 — buktikan ia mudah',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
      { key: 'title', label: 'Tajuk', kind: 'text' },
      {
        key: 'items', label: 'Langkah', kind: 'items',
        itemFields: [{ key: 'title', label: 'Tajuk', kind: 'text' }, { key: 'text', label: 'Teks', kind: 'textarea' }],
      },
    ],
    defaultProps: {
      eyebrow: 'Mudah sahaja',
      title: 'Cara Guna — Semudah 1, 2, 3',
      items: [
        { title: 'Langkah pertama', text: 'Terangkan langkah.' },
        { title: 'Langkah kedua', text: 'Terangkan langkah.' },
        { title: 'Pandu seperti biasa', text: 'Hasilnya datang sendiri.' },
      ],
    },
  },
  packs: {
    label: 'Pakej (Packs)',
    description: 'Pilihan kuantiti 1/2/4 dengan jimat penghantaran',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
      { key: 'title', label: 'Tajuk', kind: 'text' },
      { key: 'sub', label: 'Subtajuk', kind: 'textarea' },
      { key: 'unitLabel', label: 'Label unit', kind: 'text' },
      {
        key: 'quantities', label: 'Pakej', kind: 'items',
        itemFields: [
          { key: 'qty', label: 'Kuantiti', kind: 'number' },
          { key: 'note', label: 'Nota (cth: Paling popular)', kind: 'text' },
          { key: 'highlight', label: 'Tunjuk tag merah', kind: 'checkbox' },
        ],
      },
      { key: 'freeShip', label: 'Teks penghantaran percuma', kind: 'text' },
      { key: 'paidShip', label: 'Teks penghantaran berbayar', kind: 'text' },
      { key: 'ctaPrefix', label: 'Prefix butang checkout', kind: 'text' },
    ],
    defaultProps: {
      eyebrow: 'Pilih pakej anda',
      title: 'Beli Lebih, Jimat Lebih',
      sub: 'Pesanan melebihi RM150 layak mendapat penghantaran PERCUMA.',
      unitLabel: 'unit',
      quantities: [
        { qty: 1, note: 'Cuba dulu' },
        { qty: 2, note: 'Paling popular', highlight: true },
        { qty: 4, note: 'Pakej bengkel', highlight: true },
      ],
      freeShip: 'Penghantaran PERCUMA',
      paidShip: 'Caj penghantaran dikira semasa checkout',
      ctaPrefix: 'Checkout',
    },
  },
  testimonials: {
    label: 'Testimoni',
    description: 'Kata pelanggan / bengkel',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
      { key: 'title', label: 'Tajuk', kind: 'text' },
      {
        key: 'quotes', label: 'Testimoni', kind: 'items',
        itemFields: [
          { key: 'name', label: 'Nama', kind: 'text' },
          { key: 'role', label: 'Peranan · Lokasi', kind: 'text' },
          { key: 'text', label: 'Kata-kata', kind: 'textarea' },
        ],
      },
    ],
    defaultProps: {
      eyebrow: 'Bukti sebenar',
      title: 'Mereka Dah Cuba. Ini Kata Mereka.',
      quotes: [{ name: 'Nama', role: 'Peranan · Bandar', text: 'Testimoni pelanggan di sini.' }],
    },
  },
  guarantee: {
    label: 'Jaminan',
    description: '3 kad jaminan (original, penghantaran, bayaran)',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
      { key: 'title', label: 'Tajuk', kind: 'text' },
      {
        key: 'items', label: 'Jaminan', kind: 'items',
        itemFields: [icon(), { key: 'title', label: 'Tajuk', kind: 'text' }, { key: 'text', label: 'Teks', kind: 'textarea' }],
      },
    ],
    defaultProps: {
      eyebrow: 'Jaminan kami',
      title: 'Beli Dengan Yakin',
      items: [{ icon: 'shield', title: '100% Original', text: 'Terus daripada pengedar sah.' }],
    },
  },
  specs: {
    label: 'Spesifikasi',
    description: 'Jadual data teknikal',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
      { key: 'title', label: 'Tajuk', kind: 'text' },
      { key: 'note', label: 'Nota', kind: 'textarea' },
      { key: 'rows', label: 'Baris spesifikasi', kind: 'pairs' },
    ],
    defaultProps: {
      eyebrow: 'Data teknikal',
      title: 'Spesifikasi',
      note: 'Rujuk manual kenderaan anda.',
      rows: [['Produk', 'Nama produk'], ['Isipadu', '200ml']],
    },
  },
  faq: {
    label: 'Soalan Lazim (FAQ)',
    description: 'Soalan & jawapan — bagus untuk SEO/AI',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
      { key: 'title', label: 'Tajuk', kind: 'text' },
      {
        key: 'items', label: 'Soalan', kind: 'items',
        itemFields: [
          { key: 'q', label: 'Soalan', kind: 'text' },
          { key: 'a', label: 'Jawapan', kind: 'textarea' },
        ],
      },
    ],
    defaultProps: {
      eyebrow: 'Soalan lazim',
      title: 'Sebelum Anda Membeli',
      items: [{ q: 'Soalan pelanggan?', a: 'Jawapan yang jujur dan membantu.' }],
    },
  },
  cta: {
    label: 'CTA Akhir',
    description: 'Banner gelap penutup dengan butang beli',
    fields: [
      { key: 'title', label: 'Tajuk', kind: 'text' },
      { key: 'text', label: 'Teks', kind: 'textarea' },
    ],
    defaultProps: {
      title: 'Sedia Untuk Mencuba?',
      text: 'Dihantar hari yang sama · Bayaran selamat · Stok pengedar sah.',
    },
  },
}

export const SECTION_TYPES = Object.keys(SECTION_DEFS)
