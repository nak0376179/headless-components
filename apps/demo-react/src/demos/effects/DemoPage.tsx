// 演出系のデモで包む、偽の「実ページ」。効果に題材を与えるためのもの (テーマに依らず元デモと同じ配色)。
import { DEMO_PAGE_CARDS } from "@hc/demo-data"

export function DemoPage({ hint }: { hint: string }) {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#1c1c1c" }}>
      <header
        style={{
          padding: "28px 32px",
          background: "linear-gradient(120deg,#6a5cff,#00c2ff)",
          color: "#fff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.2 }}>🧩 Acme Dashboard</h1>
        <p style={{ margin: "6px 0 0", opacity: 0.9 }}>ごく普通のページ……に見えますよね？</p>
      </header>

      <main
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          padding: 32,
          background: "#f4f5f7",
        }}
      >
        {DEMO_PAGE_CARDS.map(([label, value, color]) => (
          <div
            key={label}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 20,
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: 13, color: "#777" }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
            <div
              style={{
                marginTop: 12,
                height: 8,
                borderRadius: 4,
                background: `linear-gradient(90deg, ${color}, ${color}33)`,
              }}
            />
          </div>
        ))}
      </main>

      <footer style={{ padding: "20px 32px", background: "#22223b", color: "#cfcfe0" }}>
        © 2026 Acme Inc. — {hint}
      </footer>
    </div>
  )
}
