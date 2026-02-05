import { useEffect, useState } from 'react'

import { DataTable } from '../components/DataTable'
import { TypeDistributionChart } from '../components/TypeDistributionChart'

export function Dashboard({ api, apiBaseUrl, username, onLogout }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [datasets, setDatasets] = useState([])
  const [selected, setSelected] = useState(null)
  const [table, setTable] = useState(null)
  const [tableLoading, setTableLoading] = useState(false)
  const [tableParams, setTableParams] = useState({ limit: 100, offset: 0 })

  async function refreshDatasets({ keepSelection = true } = {}) {
    setError('')
    setLoading(true)
    try {
      const items = await api.listDatasets()
      setDatasets(items)

      if (!keepSelection || !selected) {
        setSelected(items?.[0] || null)
      } else if (selected) {
        const stillThere = items.find((d) => d.id === selected.id)
        setSelected(stillThere || (items?.[0] || null))
      }
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Failed to load datasets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshDatasets({ keepSelection: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api])

  useEffect(() => {
    if (!selected?.id) {
      setTable(null)
      return
    }

    // reset paging when switching datasets
    setTableParams((p) => (p.offset === 0 ? p : { ...p, offset: 0 }))
  }, [selected?.id])

  useEffect(() => {
    if (!selected?.id) return
    let cancelled = false

    ;(async () => {
      setError('')
      setTableLoading(true)
      try {
        const data = await api.getDatasetData(selected.id, tableParams)
        if (!cancelled) setTable(data)
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.detail || e.message || 'Failed to load dataset data')
      } finally {
        if (!cancelled) setTableLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [api, selected?.id, tableParams])

  async function onUpload(file) {
    if (!file) return
    setError('')
    setLoading(true)
    try {
      const created = await api.uploadCsv(file)
      await refreshDatasets({ keepSelection: false })
      setSelected(created)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  async function downloadPdf() {
    if (!selected?.id) return
    setError('')
    try {
      const blob = await api.downloadReport(selected.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dataset_${selected.id}_report.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'PDF download failed')
    }
  }

  async function deleteDataset(datasetId) {
    if (!datasetId) return
    const ok = window.confirm('Delete this dataset from history?')
    if (!ok) return

    setError('')
    setLoading(true)
    try {
      await api.deleteDataset(datasetId)
      const wasSelected = selected?.id === datasetId
      await refreshDatasets({ keepSelection: !wasSelected })
      if (wasSelected) setSelected(null)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  async function renameDataset(dataset) {
    if (!dataset?.id) return
    const next = window.prompt('Rename dataset', dataset.original_filename || '')
    if (next == null) return
    const name = next.trim()
    if (!name) {
      window.alert('Name cannot be empty.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const updated = await api.renameDataset(dataset.id, name)
      await refreshDatasets({ keepSelection: true })
      if (selected?.id === updated.id) setSelected(updated)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Rename failed')
    } finally {
      setLoading(false)
    }
  }

  const summary = selected?.summary
  const averages = summary?.averages

  const formatMetric = (v) => {
    if (v === null || v === undefined || v === '') return '-'
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2)
    const asNum = Number(v)
    if (!Number.isNaN(asNum) && v !== true && v !== false) return Number.isInteger(asNum) ? String(asNum) : asNum.toFixed(2)
    return String(v)
  }

  const tableTotal = table?.total_rows ?? 0
  const tableOffset = table?.offset ?? tableParams.offset
  const tableLimit = table?.limit ?? tableParams.limit
  const tableStart = tableTotal ? Math.min(tableOffset + 1, tableTotal) : 0
  const tableEnd = tableTotal ? Math.min(tableOffset + (table?.rows?.length ?? 0), tableTotal) : 0
  const canPrev = tableOffset > 0
  const canNext = tableOffset + tableLimit < tableTotal

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarHeader">
          <div className="brand">
            <div className="brandMark">CE</div>
            <div>
              <div className="brandTitle">ChemEquip</div>
              <div className="brandSub">Dashboard</div>
            </div>
          </div>

          <div className="sidebarMeta">
            {typeof username === 'string' && username.trim()
              ? <div className="pill">Signed in as: {username}</div>
              : null}
          </div>
        </div>

        <div className="sidebarSection">
          <div className="sectionTitle">Upload</div>
          <div className="uploadBox">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onUpload(e.target.files?.[0])}
              disabled={loading}
            />
            <button className="ghostBtn" onClick={() => refreshDatasets({ keepSelection: true })} disabled={loading}>
              Refresh
            </button>
          </div>
          <div className="hint small">Only the latest 5 uploads are stored.</div>
        </div>

        <div className="sidebarSection">
          <div className="sectionTitle">History</div>
          <div className="historyList">
            {datasets.map((d) => (
              <div key={d.id} className="historyCard">
                <button
                  className={selected?.id === d.id ? 'historyItem active' : 'historyItem'}
                  onClick={() => setSelected(d)}
                  title={d.original_filename}
                  disabled={loading}
                >
                  <div className="historyTop">
                    <span className="historyId">#{d.id}</span>
                    <span className="historyRows">{d.row_count} rows</span>
                  </div>
                  <div className="historyName">{d.original_filename}</div>
                  <div className="historyTime">{new Date(d.uploaded_at).toLocaleString()}</div>
                </button>

                <div className="historyActions">
                  <button className="ghostBtn" onClick={() => renameDataset(d)} disabled={loading}>
                    Rename
                  </button>
                  <button className="historyDelete" onClick={() => deleteDataset(d.id)} disabled={loading}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!datasets.length
              ? <div className="muted">{loading ? 'Loading datasets…' : 'No datasets yet.'}</div>
              : null}
          </div>
        </div>

        <div className="sidebarFooter">
          <button className="dangerBtn" onClick={onLogout}>Logout</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1 className="pageTitle">Equipment Analytics</h1>
            <div className="muted small">
              {selected?.original_filename
                ? `Selected: ${selected.original_filename}`
                : 'Select a dataset to see stats and charts'}
              {(loading || tableLoading) ? ' • Working…' : ''}
            </div>
          </div>
          <div className="topbarActions">
            <button className="primaryBtn" onClick={downloadPdf} disabled={!selected?.id}>
              Download PDF
            </button>
          </div>
        </div>

        {error ? <div className="alert">{error}</div> : null}

        <div className="kpis">
          <div className="kpi">
            <div className="kpiLabel">Total Equipment</div>
            <div className="kpiValue">{summary?.total_count ?? '-'}</div>
          </div>
          <div className="kpi">
            <div className="kpiLabel">Avg Flowrate</div>
            <div className="kpiValue">{formatMetric(averages?.flowrate)}</div>
          </div>
          <div className="kpi">
            <div className="kpiLabel">Avg Pressure</div>
            <div className="kpiValue">{formatMetric(averages?.pressure)}</div>
          </div>
          <div className="kpi">
            <div className="kpiLabel">Avg Temperature</div>
            <div className="kpiValue">{formatMetric(averages?.temperature)}</div>
          </div>
        </div>

        <div className="panelGrid">
          <section className="panel">
            <div className="panelHeader">
              <h2>Type Distribution</h2>
              <div className="muted small">Counts by equipment type</div>
            </div>
            <div className="panelBody">
              <TypeDistributionChart typeDistribution={summary?.type_distribution} />
            </div>
          </section>

          <section className="panel">
            <div className="panelHeader">
              <div className="panelHeaderRow">
                <div>
                  <h2>Data Preview</h2>
                  <div className="muted small">
                    {tableTotal
                      ? `Showing ${tableStart}-${tableEnd} of ${tableTotal}`
                      : 'Preview rows'}
                  </div>
                </div>

                <div className="panelTools">
                  <label className="tool">
                    <span className="muted small">Rows</span>
                    <select
                      value={tableLimit}
                      onChange={(e) => setTableParams({ limit: Number(e.target.value), offset: 0 })}
                      disabled={!selected?.id || tableLoading}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                  </label>

                  <button
                    className="ghostBtn"
                    onClick={() => setTableParams((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
                    disabled={!selected?.id || tableLoading || !canPrev}
                    title="Previous page"
                  >
                    Prev
                  </button>
                  <button
                    className="ghostBtn"
                    onClick={() => setTableParams((p) => ({ ...p, offset: p.offset + p.limit }))}
                    disabled={!selected?.id || tableLoading || !canNext}
                    title="Next page"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
            <div className="panelBody">
              {tableLoading
                ? <div className="muted">Loading preview…</div>
                : (table
                    ? <DataTable columns={table.columns} rows={table.rows} />
                    : <div className="muted">No data</div>)}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
