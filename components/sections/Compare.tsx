type Cell = "yes" | "no" | string;

const rows: { feature: string; cells: Cell[] }[] = [
  {
    feature: "100% Offline Capability",
    cells: ["yes", "no", "no", "Partial", "no", "Partial"],
  },
  { feature: "DPDP Act 2023 Compliant", cells: ["yes", "Unclear", "Unclear", "no", "Unclear", "yes"] },
  { feature: "Zero Server Data Retention", cells: ["yes", "no", "no", "no", "no", "no"] },
  { feature: "Indian LLM Language Support", cells: ["Coming Soon", "no", "no", "no", "no", "no"] },
  { feature: "Token Based AI Enrichment", cells: ["yes", "no", "yes", "no", "no", "yes"] },
  { feature: "Audio Notes on Scan", cells: ["yes", "no", "no", "yes", "no", "no"] },
];

function renderCell(c: Cell) {
  if (c === "yes")
    return (
      <span className="table-check">
        <i className="fa-solid fa-check" />
      </span>
    );
  if (c === "no")
    return (
      <span className="table-dash">
        <i className="fa-solid fa-xmark" />
      </span>
    );
  return c;
}

export default function Compare() {
  return (
    <section
      id="compare"
      style={{ background: "linear-gradient(180deg, var(--bg-card) 0%, var(--bg) 100%)" }}
    >
      <div className="container">
        <div className="section-header reveal">
          <span className="section-label">Market Leaders</span>
          <h2>Why Kauntech Stands Apart</h2>
          <p>
            Competition makes us strong. Here is how our offline-first architecture compares to top
            Indian market alternatives.
          </p>
        </div>

        <div className="comparison-section reveal" style={{ marginTop: 0 }}>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th className="plan-header" style={{ color: "var(--gold)" }}>
                  KAUNTECH
                </th>
                {[1, 2, 3, 4, 5].map((i) => (
                  <th className="plan-header" key={i}>
                    <span className="blurred-name">Comp {i}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.feature}>
                  <td>{r.feature}</td>
                  {r.cells.map((c, idx) => (
                    <td key={idx}>{renderCell(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
