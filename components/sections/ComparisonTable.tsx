import type { CompareRow } from "@/lib/compare/competitors";

/**
 * Presentational comparison table for the /compare/<slug> pages:
 * Feature | Kauntech | <competitor>. Kauntech cells carry a check to signal the
 * advantaged column. Styling lives in app/extra.css (.vs-table*).
 */
export default function ComparisonTable({
  competitorName,
  rows,
}: {
  competitorName: string;
  rows: CompareRow[];
}) {
  return (
    <div className="vs-table-wrap">
      <table className="vs-table">
        <thead>
          <tr>
            <th scope="col">Feature</th>
            <th scope="col" className="vs-table-kauntech">
              Kauntech
            </th>
            <th scope="col">{competitorName}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.dimension}>
              <th scope="row">{row.dimension}</th>
              <td className="vs-table-kauntech">
                <span className="vs-check" aria-hidden="true">
                  <i className="fa-solid fa-check" />
                </span>
                {row.kauntech}
              </td>
              <td>{row.competitor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
