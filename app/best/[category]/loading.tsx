import { c } from '@/lib/tokens'

export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: c.bg }} aria-busy="true">
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '96px 20px' }}>
        <div className="sk" style={{ height: 28, width: '40%', borderRadius: 8 }} />
        <div className="sk" style={{ height: 16, width: '65%', borderRadius: 8, marginTop: 14 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16, marginTop: 32 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="sk" style={{ height: 180, borderRadius: 16 }} />
          ))}
        </div>
      </div>
      <style>{`.sk{background:linear-gradient(90deg,#ECE9E1 25%,#F5F3EC 50%,#ECE9E1 75%);background-size:200% 100%;animation:sk 1.2s infinite}@keyframes sk{to{background-position:-200% 0}}`}</style>
    </div>
  )
}
