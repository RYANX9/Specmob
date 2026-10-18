import { c, f, r } from '@/lib/tokens'

const COMPONENTS = [
  ['Screen', '30 points', 'Perfect scores full marks. A cracked or unresponsive screen scores little or nothing, and a non-original replacement panel reduces the score.'],
  ['Body and frame', '20 points', 'From flawless down to a cracked glass back.'],
  ['Battery', '25 points', 'Based on the battery health percentage you enter. A non-original battery reduces the score.'],
  ['Functional checklist', '25 points', 'Starts at full marks. Each fault, such as camera, biometrics, audio, charging port or buttons, takes points off.'],
] as const

const TIERS = [
  ['Excellent', '90 to 100', '4% to 14% below the tracked price'],
  ['Good', '70 to 89', '15% to 26% below the tracked price'],
  ['Fair', '45 to 69', '28% to 42% below the tracked price'],
  ['Poor', 'under 45', '45% to 70% below the tracked price'],
] as const

const CHECKLIST = [
  'Back up your data and sign out of your accounts (Apple ID, Google, Samsung).',
  'Turn off Find My Device or Activation Lock so the next owner can use the phone.',
  'Remove your SIM card and any memory card.',
  'Factory reset the phone after the backup is confirmed.',
  'Photograph the screen, body and battery health screen as proof of condition.',
  'Keep the original box, charger and receipt if you still have them.',
]

export default function TradeInInfo() {
  const h2: React.CSSProperties = { fontFamily: f.serif, fontSize: 26, color: c.text1, fontWeight: 400, margin: '0 0 14px' }
  const p: React.CSSProperties = { fontSize: 14.5, color: c.text2, lineHeight: 1.7, marginBottom: 14, maxWidth: 680 }
  const card: React.CSSProperties = { background: c.surface, border: `1px solid ${c.border}`, borderRadius: r.md, padding: '14px 18px' }

  return (
    <section aria-label="How the estimate works" style={{ maxWidth: 860, margin: '0 auto', padding: '8px var(--page-px) 80px' }}>
      <h2 style={h2}>How the estimate works</h2>
      <p style={p}>
        The estimate starts from the price Specmob tracks for your phone (the lowest recorded price for the storage
        configuration you choose) and subtracts a percentage for wear and damage. It is a guide to what a fair trade-in
        might look like, not an offer, and real buyback prices are usually lower.
      </p>
      <p style={p}>
        Your answers produce a condition score out of 100, made of four parts, plus a small bonus for brands that hold their
        resale value well.
      </p>
      <div style={{ display: 'grid', gap: 10, marginBottom: 36 }}>
        {COMPONENTS.map(([name, points, text]) => (
          <div key={name} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: c.text1, margin: 0 }}>{name}</h3>
              <span style={{ fontSize: 12, fontWeight: 700, color: c.text3 }}>{points}</span>
            </div>
            <p style={{ fontSize: 13.5, color: c.text2, lineHeight: 1.6, margin: 0 }}>{text}</p>
          </div>
        ))}
      </div>

      <h2 style={h2}>Condition guide</h2>
      <p style={p}>
        The total score decides your condition tier, and each tier maps to a deduction range. Ranges vary slightly with the
        phone&apos;s price band, and the figures below are the overall span.
      </p>
      <div style={{ display: 'grid', gap: 10, marginBottom: 36 }}>
        {TIERS.map(([tier, score, range]) => (
          <div key={tier} style={{ ...card, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: c.text1 }}>{tier} <span style={{ fontWeight: 500, color: c.text3 }}>({score})</span></span>
            <span style={{ fontSize: 13.5, color: c.text2 }}>{range}</span>
          </div>
        ))}
      </div>

      <h2 style={h2}>Before you trade in</h2>
      <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
        {CHECKLIST.map(item => (
          <li key={item} style={{ fontSize: 14.5, color: c.text2, lineHeight: 1.6 }}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
