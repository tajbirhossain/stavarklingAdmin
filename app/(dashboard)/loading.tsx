export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <header className="page-header">
        <div style={{ width: '100%' }}>
          <div className="skeleton" style={{ width: 90, height: 12, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: 280, height: 34 }} />
        </div>
      </header>

      <section className="stat-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="panel stat-card">
            <div className="skeleton" style={{ width: 80, height: 12 }} />
            <div className="skeleton" style={{ width: 56, height: 30, marginTop: 14 }} />
            <div className="skeleton" style={{ width: 130, height: 12, marginTop: 14 }} />
          </div>
        ))}
      </section>

      <div className="panel panel-pad">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: 52, marginBottom: 10 }} />
        ))}
      </div>
    </div>
  )
}
