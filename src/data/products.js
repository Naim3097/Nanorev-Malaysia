// NanoRev catalogue. Prices in MYR (RM). Retail (dealer pricing on request).
// `tile` is the bold spec shown on the placeholder until real bottle shots are added.
export const products = [
  // ── Car Engine Oil ─────────────────────────────
  { id: 'eo-01', name: 'NanoRev Ultra', cat: 'engine-oil', price: 129.00, grade: '0W-20', tile: '0W-20', volume: '4L', base: 'Fully Synthetic', spec: 'API SP', badge: 'bestseller' },
  { id: 'eo-02', name: 'NanoRev Synth', cat: 'engine-oil', price: 115.00, grade: '5W-30', tile: '5W-30', volume: '4L', base: 'Fully Synthetic', spec: 'API SP' },
  { id: 'eo-03', name: 'NanoRev Synth', cat: 'engine-oil', price: 109.00, grade: '5W-40', tile: '5W-40', volume: '4L', base: 'Fully Synthetic', spec: 'API SN', badge: 'bestseller' },
  { id: 'eo-04', name: 'NanoRev Progress', cat: 'engine-oil', price: 78.00, grade: '10W-40', tile: '10W-40', volume: '4L', base: 'Semi-Synthetic', spec: 'API SN' },
  { id: 'eo-05', name: 'NanoRev Classic', cat: 'engine-oil', price: 62.00, grade: '15W-40', tile: '15W-40', volume: '4L', base: 'Mineral', spec: 'API SL' },
  { id: 'eo-06', name: 'NanoRev Racing', cat: 'engine-oil', price: 158.00, grade: '5W-50', tile: '5W-50', volume: '4L', base: 'Fully Synthetic', spec: 'API SN', badge: 'pro' },
  { id: 'eo-07', name: 'NanoRev Synth', cat: 'engine-oil', price: 34.00, grade: '5W-40', tile: '5W-40', volume: '1L', base: 'Fully Synthetic', spec: 'API SN' },

  // ── Motorcycle Oil ─────────────────────────────
  { id: 'mc-01', name: 'NanoRev Moto', cat: 'motorcycle', price: 28.00, grade: '10W-40', tile: '10W-40', volume: '1L', base: 'Semi-Synthetic', spec: 'JASO MA2', badge: 'bestseller' },
  { id: 'mc-02', name: 'NanoRev Moto Sport', cat: 'motorcycle', price: 42.00, grade: '10W-50', tile: '10W-50', volume: '1L', base: 'Fully Synthetic', spec: 'JASO MA2', badge: 'pro' },
  { id: 'mc-03', name: 'NanoRev Scooter', cat: 'motorcycle', price: 22.00, grade: '10W-30', tile: '10W-30', volume: '0.8L', base: 'Semi-Synthetic', spec: 'JASO MB' },
  { id: 'mc-04', name: 'NanoRev Moto Classic', cat: 'motorcycle', price: 18.00, grade: '20W-50', tile: '20W-50', volume: '1L', base: 'Mineral', spec: 'JASO MA' },

  // ── Heavy Duty Diesel ──────────────────────────
  { id: 'hd-01', name: 'NanoRev Diesel Max', cat: 'heavy-duty', price: 88.00, grade: '15W-40', tile: '15W-40', volume: '5L', base: 'Mineral', spec: 'API CI-4', badge: 'bestseller' },
  { id: 'hd-02', name: 'NanoRev Diesel Synth', cat: 'heavy-duty', price: 132.00, grade: '10W-40', tile: '10W-40', volume: '5L', base: 'Semi-Synthetic', spec: 'API CI-4' },
  { id: 'hd-03', name: 'NanoRev Fleet', cat: 'heavy-duty', price: 96.00, grade: '20W-50', tile: '20W-50', volume: '5L', base: 'Mineral', spec: 'API CH-4' },
  { id: 'hd-04', name: 'NanoRev Truck Bulk', cat: 'heavy-duty', price: 2450.00, grade: '15W-40', tile: '208L', volume: '208L drum', base: 'Mineral', spec: 'API CI-4', badge: 'bulk' },

  // ── Transmission & Gear ────────────────────────
  { id: 'ntp-01', name: 'Nano Transmission Protector', cat: 'transmission', price: 45.00, grade: 'ATF+', tile: 'TRANS', volume: '200ml', base: 'Additive', spec: 'Auto · Manual · CVT', badge: 'new', image: '/assets/products/nano-transmission-protector.jpeg' },
  { id: 'tr-01', name: 'NanoRev ATF Multi', cat: 'transmission', price: 26.00, grade: 'ATF', tile: 'ATF', volume: '1L', base: 'Synthetic Blend', spec: 'Dexron III' },
  { id: 'tr-02', name: 'NanoRev CVT Fluid', cat: 'transmission', price: 32.00, grade: 'CVT', tile: 'CVT', volume: '1L', base: 'Fully Synthetic', spec: 'CVT-NS' },
  { id: 'tr-03', name: 'NanoRev Gear EP', cat: 'transmission', price: 29.00, grade: '85W-140', tile: '85W-140', volume: '1L', base: 'Mineral', spec: 'API GL-5' },
  { id: 'tr-04', name: 'NanoRev Gear EP', cat: 'transmission', price: 24.00, grade: '80W-90', tile: '80W-90', volume: '1L', base: 'Mineral', spec: 'API GL-5' },

  // ── Grease & Industrial ────────────────────────
  { id: 'gi-01', name: 'NanoRev Multi Grease', cat: 'grease-industrial', price: 19.00, grade: 'NLGI 2', tile: 'NLGI 2', volume: '500g', base: 'Lithium', spec: 'Multipurpose', badge: 'bestseller' },
  { id: 'gi-02', name: 'NanoRev Hi-Temp Grease', cat: 'grease-industrial', price: 38.00, grade: 'NLGI 2', tile: 'HI-TEMP', volume: '1kg', base: 'Lithium Complex', spec: '180°C' },
  { id: 'gi-03', name: 'NanoRev Hydraulic AW', cat: 'grease-industrial', price: 168.00, grade: 'AW 68', tile: 'AW 68', volume: '18L', base: 'Mineral', spec: 'ISO VG 68' },
  { id: 'gi-04', name: 'NanoRev Compressor Oil', cat: 'grease-industrial', price: 74.00, grade: 'VG 46', tile: 'VG 46', volume: '5L', base: 'Mineral', spec: 'ISO VG 46' },

  // ── Coolant & Additives ────────────────────────
  // The NanoRev treatment line — hero products with real bottle shots.
  { id: 'pns-01', name: 'Premium Nano Synthetic', cat: 'coolant-care', price: 89.00, grade: 'NANO', tile: 'NANO+', volume: '100ml', base: 'Additive', spec: 'Treatment & Performance', badge: 'bestseller', image: '/assets/products/premium-nano-synthetic.jpeg' },
  { id: 'prb-01', name: 'Premium Racing Booster', cat: 'coolant-care', price: 49.00, grade: 'BOOST', tile: 'BOOST', volume: '200ml', base: 'Additive', spec: 'Performance booster', badge: 'pro' },
  { id: 'cc-01', name: 'NanoRev Coolant Green', cat: 'coolant-care', price: 45.00, grade: 'PREMIX', tile: '-40°C', volume: '4L', base: 'Pre-Mixed', spec: 'Ready to use', badge: 'bestseller' },
  { id: 'cc-02', name: 'NanoRev Radiator Coolant', cat: 'coolant-care', price: 16.00, grade: 'CONC.', tile: 'RED', volume: '1L', base: 'Concentrate', spec: 'Dilute 50:50' },
  { id: 'cc-03', name: 'NanoRev Brake Fluid', cat: 'coolant-care', price: 14.00, grade: 'DOT 4', tile: 'DOT 4', volume: '500ml', base: 'Glycol', spec: 'DOT 4' },
  { id: 'cc-04', name: 'Nano Engine Flush', cat: 'coolant-care', price: 18.00, grade: 'FLUSH', tile: 'FLUSH', volume: '200ml', base: 'Additive', spec: 'Bio-tech 10-min flush', image: '/assets/products/nano-engine-flush.jpeg' },
  { id: 'cc-05', name: 'NanoRev Oil Treatment', cat: 'coolant-care', price: 24.00, grade: 'NANO', tile: 'NANO+', volume: '300ml', base: 'Additive', spec: 'Friction modifier', badge: 'new' },
  { id: 'cc-06', name: 'Nano Fuel Injector', cat: 'coolant-care', price: 15.00, grade: 'CLEAN', tile: 'CLEAN', volume: '200ml', base: 'Additive', spec: 'Cleaner & protector', image: '/assets/products/nano-fuel-injector.jpeg' },
]

export const productById = (id) => products.find((p) => p.id === id)
export const productsByCat = (cat) => products.filter((p) => p.cat === cat)
