// 演出系のデモで包む、偽の「実ページ」(本物らしいダッシュボード)。効果に題材を与えるためのもの。
// 中身と CSS は @demo-data にあり、Vue 版 (DemoPage.vue) と同じ見た目になる。
import {
  DASH_ACTIVITY,
  DASH_DONUT,
  DASH_KPIS,
  DASH_MONTH_MAX,
  DASH_MONTHS,
  DASH_NAV,
  DASH_ORDERS,
  DASH_SOURCES,
  DEMO_PAGE_CSS,
} from "@demo-data"

export function DemoPage({ hint }: { hint: string }) {
  return (
    <div className="hcdp">
      <style>{DEMO_PAGE_CSS}</style>
      <header className="hcdp-top">
        <div className="hcdp-logo">🧩 Acme Dashboard</div>
        <div className="hcdp-search">🔍 注文・顧客・商品を検索</div>
        <div className="hcdp-spacer" />
        <div className="hcdp-bell">
          🔔<b>3</b>
        </div>
        <div className="hcdp-avatar">佐</div>
      </header>

      <div className="hcdp-body">
        <nav className="hcdp-side">
          {DASH_NAV.map((n, i) => (
            <a
              key={n}
              className={i === 0 ? "on" : undefined}
              href="#"
              onClick={(e) => e.preventDefault()}
            >
              {n}
            </a>
          ))}
        </nav>

        <main className="hcdp-main">
          <section className="hcdp-hero">
            <div style={{ flex: 1 }}>
              <h1>おはようございます、佐藤さん ☀️</h1>
              <p>
                ごく普通のダッシュボード……に見えますよね？ 今月は前月比 +12.4% で推移しています。
              </p>
            </div>
            <button type="button">レポートを作る</button>
            <button type="button" className="ghost">
              共有
            </button>
          </section>

          <section className="hcdp-kpis">
            {DASH_KPIS.map((k) => (
              <div key={k.label} className="hcdp-card">
                <div className="hcdp-kpi-head">
                  <span className="hcdp-kpi-icon" style={{ background: `${k.color}1f` }}>
                    {k.icon}
                  </span>
                  {k.label}
                </div>
                <div className="hcdp-kpi-value">{k.value}</div>
                {/* 解約率は下がる方が良いので、どれも緑 */}
                <div className="hcdp-delta" style={{ color: "#2d8f5a" }}>
                  {k.up ? "▲" : "▼"} {k.delta}{" "}
                  <span style={{ color: "#8a90a6", fontWeight: 400 }}>前月比</span>
                </div>
                <svg viewBox="0 0 120 32" width="100%" height="32" aria-hidden>
                  <path d={`${k.spark} L120,32 L0,32 Z`} fill={`${k.color}22`} />
                  <path d={k.spark} fill="none" stroke={k.color} strokeWidth="2" />
                </svg>
              </div>
            ))}
          </section>

          <section className="hcdp-row">
            <div className="hcdp-card">
              <div className="hcdp-title">
                <h2>月別の売上</h2>
                <span>単位: 百万円 ・ 2026 年</span>
              </div>
              <div className="hcdp-bars">
                {DASH_MONTHS.map(([m, v]) => (
                  <div key={m} className={`hcdp-bar${v === DASH_MONTH_MAX ? " max" : ""}`}>
                    <span>{v}</span>
                    <i style={{ height: `${(v / DASH_MONTH_MAX) * 75}%` }} />
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="hcdp-card">
              <div className="hcdp-title">
                <h2>流入元</h2>
                <span>直近 30 日</span>
              </div>
              <div className="hcdp-donut">
                <svg viewBox="0 0 100 100" width="130" height="130" aria-hidden>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#eef0f5" strokeWidth="14" />
                  {DASH_DONUT.map((p) => (
                    <circle
                      key={p.color}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={p.color}
                      strokeWidth="14"
                      strokeDasharray={p.dash}
                      strokeDashoffset={p.offset}
                      transform="rotate(-90 50 50)"
                    />
                  ))}
                  <text
                    x="50"
                    y="47"
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="800"
                    fill="#1c2033"
                  >
                    39.2k
                  </text>
                  <text x="50" y="61" textAnchor="middle" fontSize="7" fill="#8a90a6">
                    訪問
                  </text>
                </svg>
                <div className="hcdp-legend">
                  {DASH_SOURCES.map((s) => (
                    <div key={s.label}>
                      <span style={{ background: s.color }} />
                      {s.label} <strong>{s.value}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="hcdp-row">
            <div className="hcdp-card">
              <div className="hcdp-title">
                <h2>最近の注文</h2>
                <span>すべて見る →</span>
              </div>
              <table className="hcdp-table">
                <thead>
                  <tr>
                    <th>注文</th>
                    <th>顧客</th>
                    <th>内容</th>
                    <th>金額</th>
                    <th>状態</th>
                  </tr>
                </thead>
                <tbody>
                  {DASH_ORDERS.map((o) => (
                    <tr key={o.id}>
                      <td>{o.id}</td>
                      <td>{o.customer}</td>
                      <td>{o.item}</td>
                      <td>{o.amount}</td>
                      <td>
                        <span
                          className="hcdp-pill"
                          style={{ color: o.color, background: `${o.color}1a` }}
                        >
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="hcdp-card">
              <div className="hcdp-title">
                <h2>アクティビティ</h2>
                <span>今日</span>
              </div>
              {DASH_ACTIVITY.map((a) => (
                <div key={a.what} className="hcdp-act">
                  <div className="hcdp-dot" style={{ background: a.color }}>
                    {a.who[0]}
                  </div>
                  <div>
                    <div>
                      <strong>{a.who}</strong> が{a.what}
                    </div>
                    <small>{a.when}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      <footer className="hcdp-foot">© 2026 Acme Inc. — {hint}</footer>
    </div>
  )
}
