// Landing page templates — reusable section blueprints for the builder.
// Templates are PRODUCT-AGNOSTIC by design: copy uses {{tokens}} filled from
// the chosen product at creation time, prices are never written into copy
// (they render live from the catalogue), and the specs table is generated
// from the product record — so a template can never carry stale data.
//
// Tokens: {{product}} {{volume}} {{grade}} {{base}} {{spec}} {{category}}

const HERO_META = [
  { icon: 'truck', text: 'Hantar hari sama' },
  { icon: 'lock', text: 'FPX · Kad · e-Wallet' },
  { icon: 'star', text: 'Dipercayai bengkel panel' },
]

const ANNOUNCE = { text: 'Penghantaran PERCUMA untuk pesanan melebihi RM150 — ke seluruh Malaysia 🇲🇾' }

const TRUST = {
  items: [
    { icon: 'shield', text: 'Pengedar sah NanoRev' },
    { icon: 'badge', text: 'Produk original & bermeterai' },
    { icon: 'truck', text: 'Hantar hari sama sebelum 3 petang' },
    { icon: 'lock', text: 'Bayaran selamat & disulitkan' },
  ],
}

const GUARANTEE = {
  eyebrow: 'Jaminan kami',
  title: 'Beli Dengan Yakin',
  items: [
    { icon: 'shield', title: '100% Original', text: 'Terus daripada Nano Revolution Autolube Sdn Bhd — pengedar sah. Setiap botol bermeterai kilang dengan nombor batch.' },
    { icon: 'truck', title: 'Hantar Hari Sama', text: 'Pesanan sebelum 3 petang keluar hari yang sama dari pusat pengedaran Shah Alam.' },
    { icon: 'lock', title: 'Bayaran Selamat', text: 'FPX, kad kredit/debit, e-wallet dan DuitNow QR — semua transaksi disulitkan sepenuhnya.' },
  ],
}

const PACK_TEXT = {
  eyebrow: 'Pilih pakej anda',
  title: 'Beli Lebih, Jimat Lebih',
  sub: 'Pesanan melebihi RM150 layak mendapat penghantaran PERCUMA ke seluruh Malaysia.',
  unitLabel: 'unit',
  freeShip: 'Penghantaran PERCUMA',
  paidShip: 'Caj penghantaran dikira semasa checkout',
  ctaPrefix: 'Checkout',
}

const PACKS_124 = {
  ...PACK_TEXT,
  quantities: [
    { qty: 1, note: 'Cuba dulu' },
    { qty: 2, note: 'Paling popular', highlight: true },
    { qty: 4, note: 'Pakej bengkel', highlight: true },
  ],
}

const BASE_FAQ = [
  { q: 'Adakah {{product}} sesuai untuk kenderaan saya?', a: 'Rujuk maklumat produk di atas atau WhatsApp kami model kenderaan anda — kami sahkan secara percuma sebelum anda membeli.' },
  { q: 'Berapa lama penghantaran?', a: 'Pesanan sebelum 3 petang dihantar pada hari yang sama dari Shah Alam. Lembah Klang biasanya tiba keesokan hari bekerja; Sabah & Sarawak dalam 2–4 hari bekerja.' },
  { q: 'Macam mana saya tahu ini produk original?', a: 'Anda membeli terus daripada Nano Revolution Autolube Sdn Bhd, pengedar sah NanoRev. Setiap botol bermeterai kilang dan mempunyai nombor batch.' },
  { q: 'Apakah kaedah pembayaran yang diterima?', a: "FPX (semua bank utama), kad kredit/debit, e-wallet (Touch 'n Go, GrabPay, Boost, ShopeePay) dan DuitNow QR." },
]

const SPECS = {
  type: 'specs',
  props: { eyebrow: 'Data teknikal', title: 'Spesifikasi', note: 'Rujuk manual kenderaan anda, atau WhatsApp kami untuk pengesahan percuma.', rows: '@productSpecs' },
}

export const TEMPLATES = [
  {
    id: 'tpl-jualan-lengkap',
    name: 'Jualan Lengkap',
    description: 'Corong jualan penuh — masalah, penyelesaian, cara guna, pakej, bukti, jaminan, FAQ. Struktur yang sama seperti halaman produk sedia ada.',
    seo: {
      title: '{{product}} — {{category}} | NanoRev Malaysia',
      description: '{{product}} ({{volume}}) original daripada pengedar sah. Penghantaran hari sama dari Shah Alam ke seluruh Malaysia.',
      keywords: '{{product}}, {{category}}, NanoRev, Malaysia',
    },
    sections: [
      { type: 'announce', props: ANNOUNCE },
      {
        type: 'hero',
        props: {
          flag: '{{category}} · {{spec}}',
          headline: 'Kenali {{product}} — Penyelesaian Mudah Untuk Kenderaan Anda',
          sub: '{{product}} ({{volume}}, {{base}}) dirumus untuk cuaca panas dan trafik sesak di Malaysia. Terangkan di sini masalah utama yang ia selesaikan.',
          bullets: ['Kelebihan utama produk ini', 'Sesuai untuk kegunaan harian di Malaysia', '{{volume}} — pesanan sebelum 3 petang dihantar hari yang sama'],
          priceNote: 'SST dikira semasa checkout',
          waLabel: 'Tanya di WhatsApp',
          meta: HERO_META,
        },
      },
      { type: 'trust', props: TRUST },
      {
        type: 'pains',
        props: {
          eyebrow: 'Periksa dulu',
          title: 'Kenderaan Anda Ada Tanda-Tanda Ini?',
          intro: 'Kebanyakan pemandu hanya sedar apabila masalah sudah serius.',
          items: [
            { icon: 'noise', title: 'Masalah pertama', text: 'Terangkan simptom yang pelanggan rasa setiap hari.' },
            { icon: 'gauge', title: 'Masalah kedua', text: 'Terangkan kesannya pada pemanduan atau kos.' },
            { icon: 'flame', title: 'Masalah ketiga', text: 'Terangkan risiko jika dibiarkan.' },
          ],
          outro: 'Berita baiknya: ada jalan keluar yang mudah — tanpa kos ribuan ringgit.',
        },
      },
      {
        type: 'benefits',
        props: {
          eyebrow: 'Penyelesaiannya',
          title: 'Kenapa {{product}} Berbeza',
          items: [
            { icon: 'zap', title: 'Kelebihan pertama', text: 'Terangkan hasil yang pemandu boleh rasa.' },
            { icon: 'heat', title: 'Dibina untuk Malaysia', text: 'Kekal stabil dalam kesesakan bandar dan perjalanan jauh.' },
            { icon: 'shield', title: 'Perlindungan berterusan', text: 'Terangkan perlindungan jangka panjang.' },
          ],
        },
      },
      {
        type: 'steps',
        props: {
          eyebrow: 'Mudah sahaja',
          title: 'Cara Guna — Semudah 1, 2, 3',
          items: [
            { title: 'Langkah pertama', text: 'Terangkan langkah dengan ringkas.' },
            { title: 'Langkah kedua', text: 'Terangkan langkah dengan ringkas.' },
            { title: 'Pandu seperti biasa', text: 'Hasilnya datang sendiri — rasa bezanya.' },
          ],
        },
      },
      { type: 'packs', props: PACKS_124 },
      {
        type: 'testimonials',
        props: {
          eyebrow: 'Bukti sebenar',
          title: 'Mereka Dah Cuba. Ini Kata Mereka.',
          quotes: [
            { name: 'Nama pelanggan', role: 'Peranan · Bandar', text: 'Gantikan dengan testimoni sebenar sebelum terbit.' },
            { name: 'Nama pelanggan', role: 'Peranan · Bandar', text: 'Gantikan dengan testimoni sebenar sebelum terbit.' },
            { name: 'Nama pelanggan', role: 'Peranan · Bandar', text: 'Gantikan dengan testimoni sebenar sebelum terbit.' },
          ],
        },
      },
      { type: 'guarantee', props: GUARANTEE },
      SPECS,
      { type: 'faq', props: { eyebrow: 'Soalan lazim', title: 'Sebelum Anda Membeli', items: BASE_FAQ } },
      { type: 'cta', props: { title: 'Sedia Untuk Mencuba {{product}}?', text: 'Dihantar hari yang sama · Bayaran selamat · Stok pengedar sah.' } },
    ],
  },

  {
    id: 'tpl-promosi-kilat',
    name: 'Promosi Kilat',
    description: 'Halaman pendek untuk kempen pantas — hero, pakej, jaminan, CTA. Sesuai untuk blast WhatsApp/iklan bila masa terhad.',
    seo: {
      title: 'Promosi {{product}} — Tawaran Terhad | NanoRev Malaysia',
      description: 'Tawaran istimewa {{product}} ({{volume}}). Stok pengedar sah, penghantaran hari sama ke seluruh Malaysia.',
      keywords: '{{product}}, promosi, tawaran, NanoRev Malaysia',
    },
    sections: [
      { type: 'announce', props: { text: 'PROMOSI TERHAD — Penghantaran PERCUMA untuk pesanan melebihi RM150 🇲🇾' } },
      {
        type: 'hero',
        props: {
          flag: 'Promosi Terhad · {{category}}',
          headline: 'Tawaran Istimewa {{product}} — Sementara Stok Masih Ada',
          sub: '{{product}} ({{volume}}) pada tawaran istimewa. Terangkan tawaran anda di sini — dan bila ia tamat.',
          bullets: ['Kenapa tawaran ini berbaloi', 'Stok promosi terhad', 'Pesanan sebelum 3 petang dihantar hari yang sama'],
          priceNote: 'SST dikira semasa checkout',
          waLabel: 'Tanya di WhatsApp',
          meta: HERO_META,
        },
      },
      { type: 'packs', props: PACKS_124 },
      { type: 'guarantee', props: GUARANTEE },
      { type: 'cta', props: { title: 'Jangan Tunggu Stok Habis', text: 'Dihantar hari yang sama · Bayaran selamat · Stok pengedar sah.' } },
    ],
  },

  {
    id: 'tpl-masalah-penyelesaian',
    name: 'Masalah → Penyelesaian',
    description: 'Bercerita untuk audiens sejuk — masalah dihurai dalam, penyelesaian, testimoni, FAQ. Tiada pakej; satu CTA fokus.',
    seo: {
      title: '{{product}} — Penyelesaian {{category}} | NanoRev Malaysia',
      description: 'Kenali punca masalah kenderaan anda dan cara {{product}} menyelesaikannya. Pengedar sah, hantar seluruh Malaysia.',
      keywords: '{{product}}, {{category}}, masalah kereta, NanoRev',
    },
    sections: [
      { type: 'announce', props: ANNOUNCE },
      {
        type: 'hero',
        props: {
          flag: '{{category}}',
          headline: 'Tulis Soalan Masalah Pelanggan Di Sini?',
          sub: 'Mulakan dengan masalah, bukan produk. {{product}} ({{volume}}) ialah jawapannya — tetapi biarkan pembaca kenal masalah mereka dahulu.',
          bullets: ['Simptom yang paling dikenali', 'Kos jika dibiarkan', 'Penyelesaian dalam satu langkah mudah'],
          priceNote: 'SST dikira semasa checkout',
          waLabel: 'Tanya di WhatsApp',
          meta: HERO_META,
        },
      },
      { type: 'trust', props: TRUST },
      {
        type: 'pains',
        props: {
          eyebrow: 'Kenali puncanya',
          title: 'Kenapa Ia Berlaku?',
          intro: 'Fahami punca sebelum memilih penyelesaian.',
          items: [
            { icon: 'noise', title: 'Punca pertama', text: 'Terangkan punca teknikal dengan bahasa mudah.' },
            { icon: 'gauge', title: 'Punca kedua', text: 'Terangkan bagaimana ia memburukkan keadaan.' },
            { icon: 'flame', title: 'Kesan jangka panjang', text: 'Terangkan kos sebenar jika dibiarkan.' },
          ],
          outro: 'Penyelesaiannya lebih mudah — dan lebih murah — daripada yang anda sangka.',
        },
      },
      {
        type: 'benefits',
        props: {
          eyebrow: 'Penyelesaiannya',
          title: 'Bagaimana {{product}} Membantu',
          items: [
            { icon: 'zap', title: 'Tindakan pertama', text: 'Apa yang berlaku sebaik digunakan.' },
            { icon: 'shield', title: 'Perlindungan', text: 'Apa yang ia lindungi untuk jangka panjang.' },
            { icon: 'drops', title: 'Hasil yang dirasai', text: 'Perubahan yang pemandu akan perasan.' },
          ],
        },
      },
      {
        type: 'testimonials',
        props: {
          eyebrow: 'Kisah sebenar',
          title: 'Pengalaman Mereka Yang Sama Masalahnya',
          quotes: [
            { name: 'Nama pelanggan', role: 'Peranan · Bandar', text: 'Gantikan dengan testimoni sebenar sebelum terbit.' },
            { name: 'Nama pelanggan', role: 'Peranan · Bandar', text: 'Gantikan dengan testimoni sebenar sebelum terbit.' },
          ],
        },
      },
      { type: 'faq', props: { eyebrow: 'Soalan lazim', title: 'Soalan Yang Sering Ditanya', items: BASE_FAQ } },
      { type: 'cta', props: { title: 'Selesaikan Sebelum Jadi Serius', text: '{{product}} ({{volume}}) — dihantar hari yang sama, bayaran selamat.' } },
    ],
  },

  {
    id: 'tpl-bukti-testimoni',
    name: 'Bukti & Testimoni',
    description: 'Bukti sosial dahulu — testimoni sebelum jualan. Sesuai untuk pautan bengkel/affiliate & audiens yang sudah kenal produk.',
    seo: {
      title: '{{product}} — Dipercayai Bengkel & Pemandu | NanoRev Malaysia',
      description: 'Lihat kata mereka yang telah mencuba {{product}} ({{volume}}). Original daripada pengedar sah, hantar seluruh Malaysia.',
      keywords: '{{product}}, testimoni, review, NanoRev Malaysia',
    },
    sections: [
      { type: 'announce', props: ANNOUNCE },
      {
        type: 'hero',
        props: {
          flag: 'Dipercayai Bengkel Panel · {{category}}',
          headline: 'Ribuan Pemandu Dah Cuba {{product}}. Ini Kata Mereka.',
          sub: '{{product}} ({{volume}}) — biar pengguna sebenar yang bercerita. Tambah nombor & fakta sebenar anda di sini.',
          bullets: ['Dipercayai bengkel panel di seluruh Malaysia', 'Produk original, bermeterai kilang', 'Pesanan sebelum 3 petang dihantar hari yang sama'],
          priceNote: 'SST dikira semasa checkout',
          waLabel: 'Tanya di WhatsApp',
          meta: HERO_META,
        },
      },
      {
        type: 'testimonials',
        props: {
          eyebrow: 'Bukti sebenar',
          title: 'Kata Mereka Yang Dah Guna',
          quotes: [
            { name: 'Nama pelanggan', role: 'Peranan · Bandar', text: 'Gantikan dengan testimoni sebenar sebelum terbit.' },
            { name: 'Nama pelanggan', role: 'Peranan · Bandar', text: 'Gantikan dengan testimoni sebenar sebelum terbit.' },
            { name: 'Nama pelanggan', role: 'Peranan · Bandar', text: 'Gantikan dengan testimoni sebenar sebelum terbit.' },
          ],
        },
      },
      {
        type: 'benefits',
        props: {
          eyebrow: 'Kenapa mereka memilihnya',
          title: 'Apa Yang Membuatkan Mereka Kembali',
          items: [
            { icon: 'zap', title: 'Hasil yang dirasai', text: 'Perubahan yang paling kerap disebut pengguna.' },
            { icon: 'badge', title: 'Kualiti konsisten', text: 'Setiap botol, kualiti yang sama.' },
            { icon: 'truck', title: 'Servis yang pantas', text: 'Penghantaran hari sama dari Shah Alam.' },
          ],
        },
      },
      {
        type: 'steps',
        props: {
          eyebrow: 'Mudah sahaja',
          title: 'Cara Guna',
          items: [
            { title: 'Langkah pertama', text: 'Terangkan langkah dengan ringkas.' },
            { title: 'Langkah kedua', text: 'Terangkan langkah dengan ringkas.' },
            { title: 'Rasa bezanya', text: 'Sama seperti mereka di atas.' },
          ],
        },
      },
      { type: 'packs', props: PACKS_124 },
      { type: 'guarantee', props: GUARANTEE },
      { type: 'cta', props: { title: 'Giliran Anda Pula', text: '{{product}} ({{volume}}) — dihantar hari yang sama, bayaran selamat.' } },
    ],
  },

  {
    id: 'tpl-teknikal-spec',
    name: 'Teknikal & Spesifikasi',
    description: 'Data dahulu — spesifikasi & fakta untuk pembeli berpengetahuan dan bengkel. Kurang pujukan, lebih bukti teknikal.',
    seo: {
      title: '{{product}} {{grade}} — Spesifikasi & Data Teknikal | NanoRev Malaysia',
      description: 'Spesifikasi penuh {{product}} ({{volume}}, {{base}}, {{spec}}). Harga dealer untuk pembelian pukal. Hantar seluruh Malaysia.',
      keywords: '{{product}}, {{spec}}, {{base}}, spesifikasi, harga borong, NanoRev',
    },
    sections: [
      { type: 'announce', props: ANNOUNCE },
      {
        type: 'hero',
        props: {
          flag: '{{spec}} · {{base}}',
          headline: '{{product}} — Data Penuh, Keputusan Anda',
          sub: 'Untuk pembeli yang mahukan fakta: spesifikasi penuh {{product}} ({{volume}}) di bawah. Harga dealer tersedia untuk pembelian pukal.',
          bullets: ['{{spec}} — {{base}}', 'Bermeterai kilang dengan nombor batch', 'Harga dealer & bengkel untuk pesanan pukal'],
          priceNote: 'SST dikira semasa checkout',
          waLabel: 'Tanya di WhatsApp',
          meta: HERO_META,
        },
      },
      SPECS,
      {
        type: 'benefits',
        props: {
          eyebrow: 'Kelebihan teknikal',
          title: 'Apa Yang Data Tunjukkan',
          items: [
            { icon: 'zap', title: 'Prestasi', text: 'Nyatakan fakta prestasi yang boleh diukur.' },
            { icon: 'heat', title: 'Kestabilan suhu', text: 'Nyatakan julat suhu operasi / kestabilan.' },
            { icon: 'shield', title: 'Keserasian', text: 'Nyatakan keserasian enjin/kenderaan.' },
          ],
        },
      },
      {
        type: 'steps',
        props: {
          eyebrow: 'Penggunaan',
          title: 'Prosedur Penggunaan',
          items: [
            { title: 'Langkah pertama', text: 'Prosedur ringkas dan tepat.' },
            { title: 'Langkah kedua', text: 'Dos / sukatan yang betul.' },
            { title: 'Selang penggunaan', text: 'Berapa kerap perlu diulang.' },
          ],
        },
      },
      { type: 'packs', props: PACKS_124 },
      { type: 'faq', props: { eyebrow: 'Soalan teknikal', title: 'Soalan Lazim', items: BASE_FAQ } },
      { type: 'cta', props: { title: 'Perlukan Sebut Harga Pukal?', text: 'WhatsApp kami untuk harga dealer & bengkel — atau beli terus di sini.' } },
    ],
  },
]

// Fill {{tokens}} from the product + generate the specs table from the
// product record. Called at page-creation time — templates never store
// product data, so they can never go stale.
export function applyTemplate(template, product, category) {
  const tokens = {
    product: product.name,
    volume: product.volume || '',
    grade: product.grade || '',
    base: product.base || '',
    spec: product.spec || '',
    category: category?.name || '',
  }
  const fill = (v) => {
    if (typeof v === 'string') return v.replace(/\{\{(\w+)\}\}/g, (_, k) => tokens[k] ?? '')
    if (Array.isArray(v)) return v.map(fill)
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)]))
    return v
  }
  const sections = template.sections.map((s) => {
    const props = fill(JSON.parse(JSON.stringify(s.props)))
    if (s.type === 'specs' && props.rows === '@productSpecs') {
      props.rows = [
        ['Produk', product.name],
        ['Isipadu', product.volume || '—'],
        ['Jenis', product.base || '—'],
        ['Fungsi', product.spec || '—'],
        ['Aplikasi', category?.name || '—'],
      ]
    }
    return { type: s.type, props }
  })
  return { sections, seo: fill({ ...template.seo }) }
}
