// Product families for a lubricant distributor.
export const categories = [
  { id: 'engine-oil', name: 'Car Engine Oil', blurb: 'Passenger & SUV', tag: 'PCMO' },
  { id: 'motorcycle', name: 'Motorcycle Oil', blurb: '4T scooter & sport', tag: '4T' },
  { id: 'heavy-duty', name: 'Heavy Duty Diesel', blurb: 'Truck, bus & fleet', tag: 'HDDO' },
  { id: 'transmission', name: 'Transmission & Gear', blurb: 'ATF, CVT & gear oil', tag: 'GEAR' },
  { id: 'grease-industrial', name: 'Grease & Industrial', blurb: 'Grease, hydraulic', tag: 'IND' },
  { id: 'coolant-care', name: 'Coolant & Additives', blurb: 'Coolant, brake, care', tag: 'CARE' },
]

export const categoryById = (id) => categories.find((c) => c.id === id)
