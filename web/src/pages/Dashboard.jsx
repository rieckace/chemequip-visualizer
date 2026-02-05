import { useEffect, useState } from 'react'

import { DataTable } from '../components/DataTable'
import { TypeDistributionChart } from '../components/TypeDistributionChart'

export function Dashboard({ api, apiBaseUrl, username, onLogout }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [datasets, setDatasets] = useState([])
  const [selected, setSelected] = useState(null)
  const [table, setTable] = useState(null)

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

    ;(async () => {
      setError('')
      try {
        const data = await api.getDatasetData(selected.id, { limit: 200, offset: 0 })
        setTable(data)
      } catch (e) {
        setError(e?.response?.data?.detail || e.message || 'Failed to load dataset data')
      }
    })()
  }, [api, selected?.id])

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
            {!datasets.length ? <div className="muted">No datasets yet.</div> : null}
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
            <div className="muted small">Select a dataset to see stats and charts</div>
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
            <div className="kpiValue">{averages?.flowrate ?? '-'}</div>
          </div>
          <div className="kpi">
            <div className="kpiLabel">Avg Pressure</div>
            <div className="kpiValue">{averages?.pressure ?? '-'}</div>
          </div>
          <div className="kpi">
            <div className="kpiLabel">Avg Temperature</div>
            <div className="kpiValue">{averages?.temperature ?? '-'}</div>
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
              <h2>Data Preview</h2>
              <div className="muted small">First 200 rows</div>
            </div>
            <div className="panelBody">
              {table ? <DataTable columns={table.columns} rows={table.rows} /> : <div className="muted">No data</div>}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
