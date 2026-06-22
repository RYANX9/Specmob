export interface BrandInfo {
  name: string
  logo: string
  founded: string
  hq: string
  os: string
  tags: string[]
  description: string
  highlights: string[]
}

const BRANDS: Record<string, BrandInfo> = {
  samsung: {
    name: 'Samsung',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Samsung_Logo.svg/2560px-Samsung_Logo.svg.png',
    founded: '1969',
    hq: 'Seoul, South Korea',
    os: 'Android · One UI 8.5',
    tags: ['Android', 'One UI 8.5', 'Flagship · Mid-Range · Budget', 'South Korea', 'AMOLED displays'],
    description:
      "Samsung is the world's top smartphone seller by volume. The Galaxy S26 Ultra leads the 2026 flagship lineup with a 200MP f/1.4 camera, Snapdragon 8 Elite Gen 5, and a first-of-its-kind hardware Privacy Display — all on Android 16 with One UI 8.5. Samsung promises 7 years of OS and security updates across its S-series devices.",
    highlights: ['7-year OS update promise', 'AMOLED displays across all tiers', 'Global #1 by shipments'],
  },
  apple: {
    name: 'Apple',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    founded: '1976',
    hq: 'Cupertino, USA',
    os: 'iOS 26',
    tags: ['iOS 26', 'A19 Pro chip', 'Premium', 'USA', 'ProMotion OLED'],
    description:
      'Apple designs the iPhone, the benchmark for smartphone performance and software quality. The iPhone 17 Pro lineup runs on the A19 Pro chip and ships with iOS 26. Every iPhone receives software updates for 6+ years, and the A-series chips consistently lead mobile benchmarks by a wide margin.',
    highlights: ['6+ years of iOS updates', 'Fastest mobile chips (A19 Pro)', 'Seamless ecosystem'],
  },
  google: {
    name: 'Google',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/2560px-Google_2015_logo.svg.png',
    founded: '1998',
    hq: 'Mountain View, USA',
    os: 'Android · Pixel UI',
    tags: ['Android 16', 'Tensor G5', 'Gemini AI', 'USA', 'Pure Android'],
    description:
      'Google Pixel phones run the cleanest version of Android and receive updates first. The Pixel 10 series is powered by the Tensor G5 on TSMC 3nm, enabling on-device Gemini AI features including Live Translate, Call Screen, and Photo Unblur. Pixels are the only Android phones guaranteed 7 years of OS updates.',
    highlights: ['7 years of Android updates', 'First to get Android updates', 'Best-in-class computational camera'],
  },
  xiaomi: {
    name: 'Xiaomi',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Xiaomi_logo_%282021-%29.svg/2560px-Xiaomi_logo_%282021-%29.svg.png',
    founded: '2010',
    hq: 'Beijing, China',
    os: 'Android · HyperOS 2',
    tags: ['Android', 'HyperOS 2', 'Flagship · Mid-Range · Budget', 'China', 'Fast Charging'],
    description:
      'Xiaomi delivers flagship specs at aggressive prices. The current Ultra flagship features Leica-tuned optics and class-leading fast charging, while the Redmi series dominates the budget segment globally. Xiaomi consistently pushes charging speed innovation, with select models exceeding 120W wired.',
    highlights: ['Industry-leading fast charging', 'Leica camera partnership', 'Unbeatable specs-per-dollar'],
  },
  oneplus: {
    name: 'OnePlus',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/OnePlus_Logo.svg/2560px-OnePlus_Logo.svg.png',
    founded: '2013',
    hq: 'Shenzhen, China',
    os: 'Android · OxygenOS',
    tags: ['Android', 'OxygenOS', 'Flagship · Mid-Range', 'China', '120Hz AMOLED'],
    description:
      'OnePlus built its reputation on "Never Settle" — flagship specs without the flagship wait. OxygenOS remains one of the fastest, cleanest Android skins. Current flagships feature Hasselblad-tuned cameras and Snapdragon 8 Elite performance with some of the fastest charging in the segment.',
    highlights: ['Hasselblad camera tuning', 'OxygenOS — clean & fast', 'Alert Slider hardware switch'],
  },
  oppo: {
    name: 'OPPO',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/OPPO_LOGO_2019.svg/2560px-OPPO_LOGO_2019.svg.png',
    founded: '2004',
    hq: 'Dongguan, China',
    os: 'Android · ColorOS',
    tags: ['Android', 'ColorOS', 'Flagship · Mid-Range', 'China', 'SuperVOOC charging'],
    description:
      'OPPO pioneered fast-charging technology with its SuperVOOC standard, now reaching 240W on select devices. The Find X series pushes industrial design boundaries while the Reno lineup targets camera-focused mid-range buyers. The Find N foldable series also carries Hasselblad imaging credentials.',
    highlights: ['240W SuperVOOC charging', 'Find X flagship innovation', 'Hasselblad imaging on Find N'],
  },
  vivo: {
    name: 'vivo',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Vivo_logo_2019.svg/2560px-Vivo_logo_2019.svg.png',
    founded: '2009',
    hq: 'Dongguan, China',
    os: 'Android · OriginOS / FuntouchOS',
    tags: ['Android', 'FuntouchOS', 'Flagship · Mid-Range', 'China', 'Zeiss cameras'],
    description:
      'Vivo specialises in camera and audio technology. The X series carries Zeiss optics and multi-frame computational imaging, while the V series targets selfie enthusiasts. The iQOO sub-brand handles gaming-focused flagships with high-refresh displays and aggressive cooling.',
    highlights: ['Zeiss camera collaboration', 'iQOO gaming sub-brand', 'Best-in-class selfie cameras'],
  },
  motorola: {
    name: 'Motorola',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Motorola_logo_2013.svg/2560px-Motorola_logo_2013.svg.png',
    founded: '1928',
    hq: 'Chicago, USA',
    os: 'Android · My UX',
    tags: ['Android', 'My UX', 'Mid-Range · Budget', 'USA', 'Near-stock Android'],
    description:
      'Motorola (owned by Lenovo) offers reliable near-stock Android at mid and budget price points. The Edge series brings curved OLED displays and Snapdragon silicon to the masses, while the Moto G series remains a perennial best-seller under $300. Motorola Edge devices receive 3 years of OS updates.',
    highlights: ['Near-stock Android experience', '3 years OS updates (Edge)', 'Moto G — best budget value'],
  },
  sony: {
    name: 'Sony',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Sony_logo.svg/2560px-Sony_logo.svg.png',
    founded: '1946',
    hq: 'Tokyo, Japan',
    os: 'Android · Sony UI',
    tags: ['Android', 'Sony UI', 'Flagship', 'Japan', '4K OLED displays', 'Pro camera'],
    description:
      "Sony's Xperia 1 series targets creative professionals with a 4K 120Hz OLED display, a retained 3.5mm headphone jack, and manual camera controls drawn directly from Sony's Alpha lineup. The Xperia line is the only mainstream Android with a true pro-cinema video mode and native RAW capture.",
    highlights: ['4K 120Hz OLED display', '3.5mm headphone jack', 'Alpha-class manual camera controls'],
  },
  nothing: {
    name: 'Nothing',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Nothing_Technology_logo.svg/2560px-Nothing_Technology_logo.svg.png',
    founded: '2020',
    hq: 'London, UK',
    os: 'Android · Nothing OS',
    tags: ['Android', 'Nothing OS', 'Mid-Range', 'UK', 'Glyph Interface', 'Transparent design'],
    description:
      'Nothing disrupted the mid-range market with its iconic transparent back and Glyph LED notification system. Nothing OS is lean and fast, with a commitment to 3 years of Android updates. Current flagships target Snapdragon 8-series performance at well under $700 — rare at that spec level.',
    highlights: ['Glyph LED notification system', 'Transparent back design', 'Lean Nothing OS'],
  },
  asus: {
    name: 'ASUS',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/ASUS_Logo.svg/2560px-ASUS_Logo.svg.png',
    founded: '1989',
    hq: 'Taipei, Taiwan',
    os: 'Android · ROG UI / Zen UI',
    tags: ['Android', 'ROG UI', 'Gaming Flagship', 'Taiwan', '165Hz display', 'AirTriggers'],
    description:
      'ASUS makes two distinct phone lines: the ROG Phone series — the definitive Android gaming smartphone — and the Zenfone series, a compact flagship for power users who prefer smaller form factors. ROG Phones feature AirTrigger shoulder buttons, active cooling, and the highest sustained-performance scores on any Android device.',
    highlights: ['Best gaming phones (ROG series)', 'AirTrigger shoulder buttons', 'Compact flagship Zenfone'],
  },
  realme: {
    name: 'realme',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Realme_logo.svg/2560px-Realme_logo.svg.png',
    founded: '2018',
    hq: 'Shenzhen, China',
    os: 'Android · realme UI',
    tags: ['Android', 'realme UI', 'Mid-Range · Budget', 'China', '240W charging'],
    description:
      'realme targets young buyers with bold design and fast specs at low prices. The GT series competes with flagships at mid-range prices, while the C and Note series dominate sub-$200 segments. realme reached 100 million users faster than any prior smartphone brand.',
    highlights: ['Fastest-growing smartphone brand', '240W UltraDart charging', 'GT series flagship value'],
  },
  honor: {
    name: 'Honor',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Honor_brand_logo.svg/2560px-Honor_brand_logo.svg.png',
    founded: '2013',
    hq: 'Shenzhen, China',
    os: 'Android · MagicOS',
    tags: ['Android', 'MagicOS', 'Flagship · Mid-Range', 'China', 'AI features'],
    description:
      'Honor (independent since 2020, formerly a Huawei sub-brand) has rapidly expanded its global portfolio with AI-driven features baked into MagicOS. The Magic series delivers competitive flagship specs with a focus on AI photography and multi-day battery endurance.',
    highlights: ['AI-powered MagicOS', 'Independent from Huawei since 2020', 'Magic series flagship'],
  },
  huawei: {
    name: 'Huawei',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Huawei_Logo.svg/2560px-Huawei_Logo.svg.png',
    founded: '1987',
    hq: 'Shenzhen, China',
    os: 'HarmonyOS',
    tags: ['HarmonyOS', 'Flagship · Mid-Range', 'China', 'Leica cameras', 'Kirin chips'],
    description:
      'Huawei pioneered computational photography through its Leica partnership and developed its own Kirin chipsets in-house. Despite US trade restrictions limiting Google services availability, Huawei continues shipping devices on HarmonyOS with its own app ecosystem. The Mate and Pura series remain technically ambitious.',
    highlights: ['Leica camera partnership', 'HarmonyOS independent ecosystem', 'Kirin in-house chips'],
  },
}

export default BRANDS

export function getBrandInfo(slugOrName: string): BrandInfo | null {
  const key = slugOrName.toLowerCase().replace(/[\s-]+/g, '')
  if (BRANDS[key]) return BRANDS[key]

  const entry = Object.entries(BRANDS).find(
    ([k, v]) =>
      k === key ||
      v.name.toLowerCase().replace(/[\s-]+/g, '') === key,
  )
  return entry ? entry[1] : null
}

export function getBrandInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '?'
}
