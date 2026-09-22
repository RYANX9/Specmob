export interface BrandInfo {
  name: string
  logo: string
  founded: string
  hq: string
  os: string
  tags: string[]
  description: string
  highlights: string[]
  lastReviewed: string // ISO date — update this whenever the entry is edited
}

const BRANDS: Record<string, BrandInfo> = {
  samsung: {
    name: 'Samsung',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Samsung_Orig_Wordmark_BLACK_RGB.jpg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original',
    founded: '1969',
    hq: 'Seoul, South Korea',
    os: 'Android · One UI 8.5',
    tags: ['Android', 'One UI 8.5', 'Flagship · Mid-Range · Budget', 'South Korea', 'AMOLED displays'],
    description:
      "Samsung is the world's top smartphone seller by volume. The Galaxy S26 Ultra leads the 2026 flagship lineup with a 200MP f/1.4 camera, Snapdragon 8 Elite chip, and Android 16 with One UI 8.5. Samsung promises 7 years of OS and security updates across its S-series devices, and the Galaxy Z series remains the benchmark for mainstream foldable phones.",
    highlights: ['7-year OS update promise', 'AMOLED displays across all tiers', 'Global #1 by shipments'],
    lastReviewed: '2026-06-01',
  },
  apple: {
    name: 'Apple',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    founded: '1976',
    hq: 'Cupertino, USA',
    os: 'iOS 26',
    tags: ['iOS 26', 'A19 Pro chip', 'Premium', 'USA', 'ProMotion OLED'],
    description:
      'Apple designs the iPhone, the benchmark for smartphone performance and software quality. The iPhone 17 Pro lineup runs on the A19 Pro chip and ships with iOS 26. Every iPhone receives software updates for 6+ years, and the A-series chips consistently lead mobile benchmarks by a wide margin. The iPhone 17 Air introduced a sub-6mm profile, the thinnest production smartphone Apple has shipped.',
    highlights: ['6+ years of iOS updates', 'Fastest mobile chips (A19 Pro)', 'Seamless ecosystem'],
    lastReviewed: '2026-06-01',
  },
  google: {
    name: 'Google',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Google_2026_logo.svg/1920px-Google_2026_logo.svg.png',
    founded: '1998',
    hq: 'Mountain View, USA',
    os: 'Android · Pixel UI',
    tags: ['Android 16', 'Tensor G5', 'Gemini AI', 'USA', 'Pure Android'],
    description:
      'Google Pixel phones run the cleanest version of Android and receive updates first. The Pixel 10 series is powered by the Tensor G5 on TSMC 3nm, enabling on-device Gemini AI features including Live Translate, Call Screen, and Photo Unblur. Pixels are the only Android phones guaranteed 7 years of OS updates.',
    highlights: ['7 years of Android updates', 'First to get Android updates', 'Best-in-class computational camera'],
    lastReviewed: '2026-06-01',
  },
  xiaomi: {
    name: 'Xiaomi',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg',
    founded: '2010',
    hq: 'Beijing, China',
    os: 'Android · HyperOS 2',
    tags: ['Android', 'HyperOS 2', 'Flagship · Mid-Range · Budget', 'China', 'Fast Charging'],
    description:
      'Xiaomi delivers flagship specs at aggressive prices. The current Ultra flagship features Leica-tuned optics and class-leading fast charging, while the Redmi series dominates the budget segment globally. Xiaomi consistently pushes charging speed innovation, with select models exceeding 120W wired.',
    highlights: ['Industry-leading fast charging', 'Leica camera partnership', 'Unbeatable specs-per-dollar'],
    lastReviewed: '2026-01-01',
  },
  oneplus: {
    name: 'OnePlus',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/OP_LU_Reg_1L_RGB_red_copy-01.svg/1920px-OP_LU_Reg_1L_RGB_red_copy-01.svg.png',
    founded: '2013',
    hq: 'Shenzhen, China',
    os: 'Android · OxygenOS',
    tags: ['Android', 'OxygenOS', 'Flagship · Mid-Range', 'China', '120Hz AMOLED'],
    description:
      'OnePlus built its reputation on "Never Settle" — flagship specs without the flagship wait. OxygenOS remains one of the fastest, cleanest Android skins. Current flagships feature Hasselblad-tuned cameras and Snapdragon 8 Elite performance with some of the fastest charging in the segment.',
    highlights: ['Hasselblad camera tuning', 'OxygenOS — clean & fast', 'Alert Slider hardware switch'],
    lastReviewed: '2026-01-01',
  },
  oppo: {
    name: 'OPPO',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/OPPO_LOGO_2019.svg/1920px-OPPO_LOGO_2019.svg.png',
    founded: '2004',
    hq: 'Dongguan, China',
    os: 'Android · ColorOS',
    tags: ['Android', 'ColorOS', 'Flagship · Mid-Range', 'China', 'SuperVOOC charging'],
    description:
      'OPPO pioneered fast-charging technology with its SuperVOOC standard, now reaching 240W on select devices. The Find X series pushes industrial design boundaries while the Reno lineup targets camera-focused mid-range buyers. The Find N foldable series also carries Hasselblad imaging credentials.',
    highlights: ['240W SuperVOOC charging', 'Find X flagship innovation', 'Hasselblad imaging on Find N'],
    lastReviewed: '2026-01-01',
  },
  vivo: {
    name: 'vivo',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Vivo_logo_2019.svg/1920px-Vivo_logo_2019.svg.png',
    founded: '2009',
    hq: 'Dongguan, China',
    os: 'Android · OriginOS / FuntouchOS',
    tags: ['Android', 'FuntouchOS', 'Flagship · Mid-Range', 'China', 'Zeiss cameras'],
    description:
      'Vivo specialises in camera and audio technology. The X series carries Zeiss optics and multi-frame computational imaging, while the V series targets selfie enthusiasts. The iQOO sub-brand handles gaming-focused flagships with high-refresh displays and aggressive cooling.',
    highlights: ['Zeiss camera collaboration', 'iQOO gaming sub-brand', 'Best-in-class selfie cameras'],
    lastReviewed: '2026-01-01',
  },
  motorola: {
    name: 'Motorola',
    logo: 'https://1000logos.net/wp-content/uploads/2017/04/Motorola-Logo-768x432.png',
    founded: '1928',
    hq: 'Chicago, USA',
    os: 'Android · My UX',
    tags: ['Android', 'My UX', 'Mid-Range · Budget', 'USA', 'Near-stock Android'],
    description:
      'Motorola (owned by Lenovo) offers reliable near-stock Android at mid and budget price points. The Edge series brings curved OLED displays and Snapdragon silicon to the masses, while the Moto G series remains a perennial best-seller in the budget tier. Motorola Edge devices receive 3 years of OS updates.',
    highlights: ['Near-stock Android experience', '3 years OS updates (Edge)', 'Moto G — best budget value'],
    lastReviewed: '2026-01-01',
  },
  sony: {
    name: 'Sony',
    logo: 'https://1000logos.net/wp-content/uploads/2021/05/Sony-logo-768x432.png',
    founded: '1946',
    hq: 'Tokyo, Japan',
    os: 'Android · Sony UI',
    tags: ['Android', 'Sony UI', 'Flagship', 'Japan', '4K OLED displays', 'Pro camera'],
    description:
      "Sony's Xperia 1 series targets creative professionals with a 4K 120Hz OLED display, a retained 3.5mm headphone jack, and manual camera controls drawn directly from Sony's Alpha lineup. The Xperia line is the only mainstream Android with a true pro-cinema video mode and native RAW capture.",
    highlights: ['4K 120Hz OLED display', '3.5mm headphone jack', 'Alpha-class manual camera controls'],
    lastReviewed: '2026-01-01',
  },
  nothing: {
    name: 'Nothing',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Nothing.svg/1920px-Nothing.svg.png',
    founded: '2020',
    hq: 'London, UK',
    os: 'Android · Nothing OS',
    tags: ['Android', 'Nothing OS', 'Mid-Range', 'UK', 'Glyph Interface', 'Transparent design'],
    description:
      'Nothing disrupted the mid-range market with its iconic transparent back and Glyph LED notification system. Nothing OS is lean and fast, with a commitment to 3 years of Android updates. Current flagships target Snapdragon 8-series performance at well under flagship pricing — rare at that spec level.',
    highlights: ['Glyph LED notification system', 'Transparent back design', 'Lean Nothing OS'],
    lastReviewed: '2026-01-01',
  },
  asus: {
    name: 'ASUS',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/ASUS_Logo.svg/1920px-ASUS_Logo.svg.png',
    founded: '1989',
    hq: 'Taipei, Taiwan',
    os: 'Android · ROG UI / Zen UI',
    tags: ['Android', 'ROG UI', 'Gaming Flagship', 'Taiwan', '165Hz display', 'AirTriggers'],
    description:
      'ASUS makes two distinct phone lines: the ROG Phone series — the definitive Android gaming smartphone — and the Zenfone series, a compact flagship for power users who prefer smaller form factors. ROG Phones feature AirTrigger shoulder buttons, active cooling, and the highest sustained-performance scores on any Android device.',
    highlights: ['Best gaming phones (ROG series)', 'AirTrigger shoulder buttons', 'Compact flagship Zenfone'],
    lastReviewed: '2026-01-01',
  },
  realme: {
    name: 'realme',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Realme_logo_SVG.svg/1920px-Realme_logo_SVG.svg.png',
    founded: '2018',
    hq: 'Shenzhen, China',
    os: 'Android · realme UI',
    tags: ['Android', 'realme UI', 'Mid-Range · Budget', 'China', '240W charging'],
    description:
      'realme targets young buyers with bold design and fast specs at low prices. The GT series competes with flagships at mid-range prices, while the C and Note series dominate the sub-budget segments. realme reached 100 million users faster than any prior smartphone brand.',
    highlights: ['Fastest-growing smartphone brand', '240W UltraDart charging', 'GT series flagship value'],
    lastReviewed: '2026-01-01',
  },
  honor: {
    name: 'Honor',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Honor_2026_logo.svg/1920px-Honor_2026_logo.svg.png',
    founded: '2013',
    hq: 'Shenzhen, China',
    os: 'Android · MagicOS',
    tags: ['Android', 'MagicOS', 'Flagship · Mid-Range', 'China', 'AI features'],
    description:
      'Honor (independent since 2020, formerly a Huawei sub-brand) has rapidly expanded its global portfolio with AI-driven features baked into MagicOS. The Magic series delivers competitive flagship specs with a focus on AI photography and multi-day battery endurance.',
    highlights: ['AI-powered MagicOS', 'Independent from Huawei since 2020', 'Magic series flagship'],
    lastReviewed: '2026-01-01',
  },
  huawei: {
    name: 'Huawei',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/04/Huawei_Standard_logo.svg/960px-Huawei_Standard_logo.svg.png',
    founded: '1987',
    hq: 'Shenzhen, China',
    os: 'HarmonyOS',
    tags: ['HarmonyOS', 'Flagship · Mid-Range', 'China', 'Leica cameras', 'Kirin chips'],
    description:
      'Huawei pioneered computational photography through its Leica partnership and developed its own Kirin chipsets in-house. Despite US trade restrictions limiting Google services availability, Huawei continues shipping devices on HarmonyOS with its own app ecosystem. The Mate and Pura series remain technically ambitious.',
    highlights: ['Leica camera partnership', 'HarmonyOS independent ecosystem', 'Kirin in-house chips'],
    lastReviewed: '2026-01-01',
  },
  tecno: {
    name: 'Tecno',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Tecno_Mobile_logo.svg/1920px-Tecno_Mobile_logo.svg.png',
    founded: '2006',
    hq: 'Shenzhen, China',
    os: 'Android · HiOS',
    tags: ['Android', 'HiOS', 'Mid-Range · Budget', 'China', 'Africa & Asia focus'],
    description:
      'Tecno (a Transsion Holdings brand, alongside Infinix and itel) is the dominant smartphone brand across Africa and a fast-growing player in South Asia and the Middle East. The Camon series focuses on camera value in the mid-range, while the Phantom series pushes flagship-tier design and folding form factors at aggressive prices.',
    highlights: ['#1 smartphone brand in Africa', 'Phantom series foldables at low cost', 'Broad budget-to-mid-range lineup'],
    lastReviewed: '2026-01-01',
  },
  lg: {
    name: 'LG',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/LG_logo_%282014%29.svg/1920px-LG_logo_%282014%29.svg.png',
    founded: '1958',
    hq: 'Seoul, South Korea',
    os: 'Android (legacy)',
    tags: ['Android', 'Discontinued', 'South Korea', 'Legacy flagship'],
    description:
      'LG exited the smartphone business in 2021 after years of losses, but its last devices — like the modular LG Wing and the V60 — are still remembered for unconventional design experimentation. LG continues to support existing devices with limited software updates but no longer develops new phones.',
    highlights: ['Exited smartphone market in 2021', 'Known for experimental designs (Wing, dual-screen)', 'No longer in active development'],
    lastReviewed: '2026-01-01',
  },
  htc: {
    name: 'HTC',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/HTC.svg/1920px-HTC.svg.png',
    founded: '1997',
    hq: 'Taoyuan, Taiwan',
    os: 'Android',
    tags: ['Android', 'Niche', 'Taiwan', 'VR (Vive)'],
    description:
      'HTC, once a top-three global smartphone maker, has scaled back phone production dramatically to focus resources on its Vive VR/XR headset business. Remaining HTC phones ship in limited markets, while the company positions itself primarily as a VR and metaverse hardware maker.',
    highlights: ['Pioneer of early Android flagships', 'Now focused mainly on Vive VR/XR', 'Limited-market phone releases'],
    lastReviewed: '2026-01-01',
  },
  meizu: {
    name: 'Meizu',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Meizu.svg/1920px-Meizu.svg.png',
    founded: '2003',
    hq: 'Zhuhai, China',
    os: 'Android · Flyme OS',
    tags: ['Android', 'Flyme OS', 'Mid-Range', 'China'],
    description:
      'Meizu, majority-owned by Geely (the automaker), has pivoted toward integrating Flyme OS with Geely vehicles while continuing a smaller smartphone lineup for the Chinese market. The brand is known for minimalist industrial design and its long-running, tightly optimized Flyme software.',
    highlights: ['Now majority-owned by Geely', 'Flyme OS car-phone integration', 'Minimalist design philosophy'],
    lastReviewed: '2026-01-01',
  },
  lenovo: {
    name: 'Lenovo',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Lenovo_%282015%29.svg/1920px-Lenovo_%282015%29.svg.png',
    founded: '1984',
    hq: 'Beijing, China',
    os: 'Android',
    tags: ['Android', 'Business', 'China', 'ThinkPhone'],
    description:
      "Lenovo, which also owns Motorola, sells phones under its own brand mainly in the business and gaming segments — most notably the ThinkPhone, which borrows ThinkPad design cues and enterprise-grade durability, and the Legion gaming phone line. Lenovo leans on Motorola for its mainstream consumer smartphone push.",
    highlights: ['ThinkPhone — ThinkPad-inspired durability', 'Legion gaming phone line', 'Parent company of Motorola'],
    lastReviewed: '2026-01-01',
  },
  nokia: {
    name: 'Nokia',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Nokian_logo_%282023%29.svg/1920px-Nokian_logo_%282023%29.svg.png',
    founded: '1865',
    hq: 'Espoo, Finland',
    os: 'Android (Android One)',
    tags: ['Android', 'Android One', 'Budget', 'Finland', 'Feature phones'],
    description:
      'The Nokia phone brand is licensed and operated by HMD Global (Finland), which continues the legacy of durable, no-frills devices. HMD sells both clean Android One smartphones and classic-style feature phones (including revivals like the 3310), and has recently also launched phones under its own HMD-branded line alongside Nokia.',
    highlights: ['Operated under license by HMD Global', 'Clean Android One software', 'Classic feature phone revivals'],
    lastReviewed: '2026-01-01',
  },
}

export default BRANDS

export function getBrandInfo(slugOrName: string): BrandInfo | null {
  // Normalise: lowercase, strip spaces/hyphens/diacritics
  const normalise = (s: string) =>
    s.normalize('NFD')
     .replace(/[\u0300-\u036f]/g, '')
     .toLowerCase()
     .replace(/[\s\-]+/g, '')

  const key = normalise(slugOrName)

  // Direct key hit
  if (BRANDS[key]) return BRANDS[key]

  // Match against normalised brand names
  const entry = Object.entries(BRANDS).find(
    ([k, v]) => normalise(k) === key || normalise(v.name) === key,
  )
  return entry ? entry[1] : null
}

export function getBrandInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '?'
}

/**
 * Returns brands whose lastReviewed date is older than `thresholdDays`.
 * Use this in a build check or admin view to surface stale entries.
 */
export function getStaleBrands(thresholdDays = 180): BrandInfo[] {
  const cutoff = Date.now() - thresholdDays * 24 * 60 * 60 * 1000
  return Object.values(BRANDS).filter(b => {
    const reviewed = new Date(b.lastReviewed).getTime()
    return reviewed < cutoff
  })
}
