import './App.css'
import { useEffect, useMemo, useState } from 'react'

import { createApi } from './api/client'
import { AuthPanel } from './components/AuthPanel'
import { DataTable } from './components/DataTable'
import { TypeDistributionChart } from './components/TypeDistributionChart'

function App() {
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('basicAuth') || 'null') || { username: '', password: '' }
    } catch {
      return { username: '', password: '' }
    }
  })

  const api = useMemo(
    () => createApi({ baseURL, username: auth.username, password: auth.password }),
    [baseURL, auth.username, auth.password]
  )

  const [health, setHealth] = useState(null)
  const [error, setError] = useState('')
  const [datasets, setDatasets] = useState([])
  const [selected, setSelected] = useState(null)
  const [table, setTable] = useState(null)

  async function refreshDatasets() {
    setError('')
    try {
      const items = await api.listDatasets()
      setDatasets(items)
      if (items.length && !selected) {
        setSelected(items[0])
      }
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Failed to load datasets')
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        const res = await api.health()
        setHealth(res)
      } catch {
        setHealth({ status: 'backend-not-reachable' })
      }
    })()
  }, [api])

  useEffect(() => {
    if (auth.username && auth.password) {
      refreshDatasets()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.username, auth.password])

  useEffect(() => {
    if (!selected?.id) return
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
    try {
      const created = await api.uploadCsv(file)
      setSelected(created)
      await refreshDatasets()
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Upload failed')
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

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>Chemical Equipment Visualizer</h1>
          <p className="muted">
            API: <code>{baseURL}</code> | Health: <code>{health?.status || '...'}</code>
          </p>
        </div>
      </header>

      <AuthPanel
        username={auth.username}
        password={auth.password}
        onChange={(next) => {
          localStorage.setItem('basicAuth', JSON.stringify(next))
          setAuth(next)
        }}
      />

      <div className="card">
        <h3>Upload CSV</h3>
        <div className="row">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => onUpload(e.target.files?.[0])}
            disabled={!auth.username || !auth.password}
          />
          <button onClick={refreshDatasets} disabled={!auth.username || !auth.password}>
            Refresh history
          </button>
        </div>
        <p className="muted">Stores only the latest 5 uploads.</p>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="grid">
        <div className="card">
          <h3>History (latest 5)</h3>
          <div className="list">
            {datasets.map((d) => (
              <button
                key={d.id}
                className={selected?.id === d.id ? 'listItem active' : 'listItem'}
                onClick={() => setSelected(d)}
              >
                <div className="listTitle">#{d.id} — {d.original_filename}</div>
                <div className="muted small">rows: {d.row_count} | {new Date(d.uploaded_at).toLocaleString()}</div>
              </button>
            ))}
            {!datasets.length ? <div className="muted">No datasets yet.</div> : null}
          </div>
        </div>

        <div className="card">
          <h3>Summary</h3>
          {selected?.summary ? (
            <>
              <div className="stats">
                <div className="stat"><div className="muted small">Total</div><div>{selected.summary.total_count}</div></div>
                <div className="stat"><div className="muted small">Avg Flowrate</div><div>{selected.summary.averages?.flowrate ?? '-'}</div></div>
                <div className="stat"><div className="muted small">Avg Pressure</div><div>{selected.summary.averages?.pressure ?? '-'}</div></div>
                <div className="stat"><div className="muted small">Avg Temperature</div><div>{selected.summary.averages?.temperature ?? '-'}</div></div>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <button onClick={downloadPdf} disabled={!selected?.id}>Download PDF report</button>
              </div>
              <div style={{ marginTop: 12 }}>
                <TypeDistributionChart typeDistribution={selected.summary.type_distribution} />
              </div>
            </>
          ) : (
            <div className="muted">Select a dataset to see summary.</div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Data Preview</h3>
        {table ? (
          <DataTable columns={table.columns} rows={table.rows} />
        ) : (
          <div className="muted">Select a dataset to preview.</div>
        )}
      </div>
    </div>
  )
}

export default App
