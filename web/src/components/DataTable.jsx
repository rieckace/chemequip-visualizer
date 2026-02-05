export function DataTable({ columns, rows }) {
  if (!columns?.length) return null
  if (!rows?.length) return <div className="muted">No rows to display.</div>

  const formatHeader = (key) => {
    const text = String(key ?? '')
      .replace(/_/g, ' ')
      .trim()
      .toLowerCase()
    if (!text) return ''
    return text.charAt(0).toUpperCase() + text.slice(1)
  }

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{formatHeader(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.map((row, idx) => (
            <tr key={idx}>
              {columns.map((c) => (
                <td key={c}>{row?.[c] ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
