export interface BrandInfo {
  name: string
  logo: string
  founded: string
  hq: string
  os: string
  tags: string[]
  description: string
  highlights: string[]
  lastReviewed: string
}

const REVIEWED = '2026-10-01'

const BRANDS: Record<string, BrandInfo> = {
  samsung: {
    name: 'Samsung',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Samsung_Orig_Wordmark_BLACK_RGB.jpg',
    founded: '1969',
    hq: 'Suwon, South Korea',
    os: 'Android · One UI',
    tags: ['Android', 'One UI', 'Budget to flagship', 'South Korea', 'AMOLED displays'],
    description: 'Samsung makes the Galaxy phone range, from the entry-level A series to the S-series flagships and the Z-series foldables. Most tiers use AMOLED displays, and recent S-series models carry a seven-year software update commitment.',
    highlights: ['Range from budget to foldables', 'AMOLED displays across most tiers', 'Seven-year update commitment on recent S-series'],
    lastReviewed: REVIEWED,
  },
  apple: {
    name: 'Apple',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    founded: '1976',
    hq: 'Cupertino, USA',
    os: 'iOS',
    tags: ['iOS', 'Apple silicon', 'Premium', 'USA', 'OLED displays'],
    description: 'Apple designs the iPhone together with iOS and its own A-series chips, which is why its phones receive many years of software updates and consistent performance. The lineup runs from the compact SE to the Pro models.',
    highlights: ['Long software support', 'In-house A-series chips', 'Tight ecosystem integration'],
    lastReviewed: REVIEWED,
  },
  google: {
    name: 'Google',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Google_2026_logo.svg/1920px-Google_2026_logo.svg.png',
    founded: '1998',
    hq: 'Mountain View, USA',
    os: 'Android · Pixel UI',
    tags: ['Android', 'Tensor chips', 'On-device AI', 'USA', 'Near-stock Android'],
    description: 'Google Pixel phones run a close-to-stock version of Android and receive updates directly from Google. Recent Pixels use Google\'s Tensor chips, which focus on on-device AI and camera processing, and carry a seven-year update commitment.',
    highlights: ['Direct Android updates', 'Tensor chips with on-device AI', 'Seven years of updates on recent models'],
    lastReviewed: REVIEWED,
  },
  xiaomi: {
    name: 'Xiaomi',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg',
    founded: '2010',
    hq: 'Beijing, China',
    os: 'Android · HyperOS',
    tags: ['Android', 'HyperOS', 'Budget to flagship', 'China', 'Fast charging'],
    description: 'Xiaomi sells phones across the price range under the Xiaomi, Redmi and POCO names, often with strong specifications for the price. Its flagship line has partnered with Leica on cameras, and several models support very fast wired charging.',
    highlights: ['Leica camera partnership on flagships', 'Very fast charging on select models', 'Range across every price tier'],
    lastReviewed: REVIEWED,
  },
  oneplus: {
    name: 'OnePlus',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/OP_LU_Reg_1L_RGB_red_copy-01.svg/1920px-OP_LU_Reg_1L_RGB_red_copy-01.svg.png',
    founded: '2013',
    hq: 'Shenzhen, China',
    os: 'Android · OxygenOS',
    tags: ['Android', 'OxygenOS', 'Mid-range to flagship', 'China', 'AMOLED displays'],
    description: 'OnePlus focuses on near-flagship hardware with OxygenOS, a light version of Android. Its flagships have used Hasselblad camera tuning and an alert slider, and its phones typically support fast wired charging.',
    highlights: ['Hasselblad camera tuning on flagships', 'OxygenOS software', 'Alert slider on flagship models'],
    lastReviewed: REVIEWED,
  },
  oppo: {
    name: 'OPPO',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/OPPO_LOGO_2019.svg/1920px-OPPO_LOGO_2019.svg.png',
    founded: '2004',
    hq: 'Dongguan, China',
    os: 'Android · ColorOS',
    tags: ['Android', 'ColorOS', 'Mid-range to flagship', 'China', 'SuperVOOC charging'],
    description: 'OPPO makes the Find flagship series and the camera-focused Reno range. The brand developed SuperVOOC fast charging, and its Find N line covers book-style foldables.',
    highlights: ['SuperVOOC fast charging', 'Find X flagships and Find N foldables', 'Camera-focused Reno range'],
    lastReviewed: REVIEWED,
  },
  vivo: {
    name: 'vivo',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Vivo_%28China%29_logo.svg/1920px-Vivo_%28China%29_logo.svg.png',
    founded: '2009',
    hq: 'Dongguan, China',
    os: 'Android · OriginOS / Funtouch OS',
    tags: ['Android', 'Funtouch OS', 'Mid-range to flagship', 'China', 'Zeiss cameras'],
    description: 'vivo\'s X-series phones are developed with Zeiss on camera optics, while the V and Y series cover selfie-focused and everyday models. The iQOO brand handles gaming-oriented phones.',
    highlights: ['Zeiss camera partnership on X series', 'iQOO gaming sub-brand', 'Wide mid-range lineup'],
    lastReviewed: REVIEWED,
  },
  motorola: {
    name: 'Motorola',
    logo: 'https://1000logos.net/wp-content/uploads/2017/04/Motorola-Logo-768x432.png',
    founded: '1928',
    hq: 'Chicago, USA',
    os: 'Android · My UX',
    tags: ['Android', 'My UX', 'Budget to mid-range', 'USA', 'Near-stock Android'],
    description: 'Motorola, owned by Lenovo, sells Android phones with a near-stock interface. The Edge series covers upper mid-range and flagship models, the Moto G series covers budget and mid-range, and the Razr line covers flip phones.',
    highlights: ['Near-stock Android interface', 'Edge, Moto G and Razr series', 'Budget to mid-range focus'],
    lastReviewed: REVIEWED,
  },
  sony: {
    name: 'Sony',
    logo: 'https://1000logos.net/wp-content/uploads/2021/05/Sony-logo-768x432.png',
    founded: '1946',
    hq: 'Tokyo, Japan',
    os: 'Android · Sony UI',
    tags: ['Android', 'Flagship', 'Japan', 'OLED displays', 'Camera controls'],
    description: 'Sony\'s Xperia phones target photography and video enthusiasts, with controls borrowed from the Alpha camera line. Xperia models have kept a 3.5mm headphone jack and microSD storage.',
    highlights: ['Camera controls from the Alpha line', '3.5mm headphone jack', 'Pro video features'],
    lastReviewed: REVIEWED,
  },
  nothing: {
    name: 'Nothing',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Nothing.svg/1920px-Nothing.svg.png',
    founded: '2020',
    hq: 'London, UK',
    os: 'Android · Nothing OS',
    tags: ['Android', 'Nothing OS', 'Mid-range', 'UK', 'Glyph lighting'],
    description: 'Nothing is a London-based brand known for a transparent back design and the Glyph lighting interface. Its phones run Nothing OS, an Android skin with a distinctive look.',
    highlights: ['Transparent design', 'Glyph lighting interface', 'Nothing OS'],
    lastReviewed: REVIEWED,
  },
  asus: {
    name: 'ASUS',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/ASUS_Logo.svg/1920px-ASUS_Logo.svg.png',
    founded: '1989',
    hq: 'Taipei, Taiwan',
    os: 'Android · ROG UI / Zen UI',
    tags: ['Android', 'ROG UI', 'Gaming', 'Taiwan', 'High refresh displays'],
    description: 'ASUS makes two phone lines: the ROG Phone gaming series, with shoulder triggers, high-refresh displays and active cooling, and the Zenfone, a compact flagship.',
    highlights: ['ROG Phone gaming series', 'AirTrigger shoulder controls', 'Compact Zenfone flagship'],
    lastReviewed: REVIEWED,
  },
  realme: {
    name: 'realme',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Realme_logo_SVG.svg/1920px-Realme_logo_SVG.svg.png',
    founded: '2018',
    hq: 'Shenzhen, China',
    os: 'Android · realme UI',
    tags: ['Android', 'realme UI', 'Budget to mid-range', 'China', 'Fast charging'],
    description: 'realme sells value-focused phones, including the performance-oriented GT series and the Number, C and Note series for lower budgets. Several models support very fast wired charging.',
    highlights: ['GT performance series', 'Fast charging on select models', 'Entry-level C and Note series'],
    lastReviewed: REVIEWED,
  },
  honor: {
    name: 'Honor',
    logo: 'https://thumb.wikimedia.org/wikipedia/en/thumb/a/a0/Honor_2026_logo.svg/1920px-Honor_2026_logo.svg.png',
    founded: '2013',
    hq: 'Shenzhen, China',
    os: 'Android · MagicOS',
    tags: ['Android', 'MagicOS', 'Mid-range to flagship', 'China', 'AI features'],
    description: 'Honor became independent from Huawei in 2020. Its Magic series covers flagship and foldable phones, and its MagicOS software adds on-device AI features.',
    highlights: ['Magic flagship and foldable series', 'MagicOS software', 'Independent since 2020'],
    lastReviewed: REVIEWED,
  },
  huawei: {
    name: 'Huawei',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/04/Huawei_Standard_logo.svg/960px-Huawei_Standard_logo.svg.png',
    founded: '1987',
    hq: 'Shenzhen, China',
    os: 'HarmonyOS',
    tags: ['HarmonyOS', 'Mid-range to flagship', 'China', 'Kirin chips'],
    description: 'Huawei designs its own Kirin chipsets and runs HarmonyOS on its phones, with its own app ecosystem. The Pura and Mate series are its camera-focused and flagship lines.',
    highlights: ['In-house Kirin chipsets', 'HarmonyOS software', 'Pura and Mate series'],
    lastReviewed: REVIEWED,
  },
  tecno: {
    name: 'Tecno',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Tecno_Mobile_logo.svg/1920px-Tecno_Mobile_logo.svg.png',
    founded: '2006',
    hq: 'Shenzhen, China',
    os: 'Android · HiOS',
    tags: ['Android', 'HiOS', 'Budget to mid-range', 'China', 'Africa and South Asia'],
    description: 'Tecno is a Transsion Holdings brand, alongside Infinix and itel, with a strong presence in Africa, South Asia and the Middle East. The Camon series focuses on cameras, and the Phantom series covers premium and foldable models.',
    highlights: ['Transsion Holdings brand', 'Strong presence in Africa', 'Camon and Phantom series'],
    lastReviewed: REVIEWED,
  },
  lg: {
    name: 'LG',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/LG_logo_%282014%29.svg/1920px-LG_logo_%282014%29.svg.png',
    founded: '1958',
    hq: 'Seoul, South Korea',
    os: 'Android (legacy)',
    tags: ['Android', 'Discontinued', 'South Korea'],
    description: 'LG left the smartphone business in 2021. Its last phones, including the swiveling LG Wing and the dual-screen V60, are remembered for unconventional design.',
    highlights: ['Exited smartphones in 2021', 'Experimental designs such as the Wing', 'No longer developing phones'],
    lastReviewed: REVIEWED,
  },
  htc: {
    name: 'HTC',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/HTC.svg/1920px-HTC.svg.png',
    founded: '1997',
    hq: 'Taoyuan, Taiwan',
    os: 'Android',
    tags: ['Android', 'Niche', 'Taiwan', 'VR (Vive)'],
    description: 'HTC made the first commercial Android phone and was once a top smartphone maker. It now ships few phones and focuses mainly on its Vive VR and XR hardware.',
    highlights: ['Made the first commercial Android phone', 'Now focused mainly on Vive VR and XR', 'Limited-market phone releases'],
    lastReviewed: REVIEWED,
  },
  meizu: {
    name: 'Meizu',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Meizu.svg/1920px-Meizu.svg.png',
    founded: '2003',
    hq: 'Zhuhai, China',
    os: 'Android · Flyme OS',
    tags: ['Android', 'Flyme OS', 'Mid-range', 'China'],
    description: 'Meizu is known for minimalist industrial design and its Flyme OS software. The brand is now controlled by Geely-affiliated Xingji Meizu Group and sells a smaller phone lineup, mainly in China.',
    highlights: ['Flyme OS software', 'Minimalist design', 'Geely-affiliated ownership'],
    lastReviewed: REVIEWED,
  },
  lenovo: {
    name: 'Lenovo',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Lenovo_%282015%29.svg/1920px-Lenovo_%282015%29.svg.png',
    founded: '1984',
    hq: 'Beijing, China',
    os: 'Android',
    tags: ['Android', 'Business', 'China', 'ThinkPhone'],
    description: 'Lenovo, which also owns Motorola, sells phones under its own name mainly in the business and gaming segments, such as the ThinkPhone and the Legion gaming phones.',
    highlights: ['ThinkPhone for business', 'Legion gaming phones', 'Parent company of Motorola'],
    lastReviewed: REVIEWED,
  },
  nokia: {
    name: 'Nokia',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Nokian_logo_%282023%29.svg/1920px-Nokian_logo_%282023%29.svg.png',
    founded: '1865',
    hq: 'Espoo, Finland',
    os: 'Android (Android One)',
    tags: ['Android', 'Android One', 'Budget', 'Finland', 'Feature phones'],
    description: 'The Nokia phone brand is licensed to HMD Global of Finland, which sells Android One smartphones and classic-style feature phones, including revivals such as the 3310.',
    highlights: ['Operated under license by HMD Global', 'Android One software', 'Classic feature phone revivals'],
    lastReviewed: REVIEWED,
  },
}

export default BRANDS

function normalise(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s\-]+/g, '')
}

export function getBrandInfo(slugOrName: string): BrandInfo | null {
  const key = normalise(slugOrName)
  if (BRANDS[key]) return BRANDS[key]
  const entry = Object.entries(BRANDS).find(([k, v]) => normalise(k) === key || normalise(v.name) === key)
  return entry ? entry[1] : null
}

export function getBrandInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '?'
}

export function getStaleBrands(thresholdDays = 180): BrandInfo[] {
  const cutoff = Date.now() - thresholdDays * 24 * 60 * 60 * 1000
  return Object.values(BRANDS).filter(b => new Date(b.lastReviewed).getTime() < cutoff)
}
