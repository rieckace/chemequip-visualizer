import axios from 'axios'

export function createApi({ baseURL, username, password }) {
  const client = axios.create({
    baseURL,
    auth: username && password ? { username, password } : undefined,
  })

  return {
    async register({ username, password, password2 }) {
      const res = await client.post('/auth/register/', { username, password, password2 })
      return res.data
    },

    async health() {
      const res = await client.get('/health/')
      return res.data
    },

    async listDatasets() {
      const res = await client.get('/datasets/')
      return res.data
    },

    async deleteDataset(datasetId) {
      const res = await client.delete(`/datasets/${datasetId}/`)
      return res.data
    },

    async renameDataset(datasetId, original_filename) {
      const res = await client.patch(`/datasets/${datasetId}/`, { original_filename })
      return res.data
    },

    async uploadCsv(file) {
      const form = new FormData()
      form.append('file', file)
      const res = await client.post('/datasets/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },

    async getDatasetData(datasetId, { limit = 200, offset = 0 } = {}) {
      const res = await client.get(`/datasets/${datasetId}/data/`, {
        params: { limit, offset },
      })
      return res.data
    },

    async downloadReport(datasetId) {
      const res = await client.get(`/datasets/${datasetId}/report/`, {
        responseType: 'blob',
      })
      return res.data
    },

    async downloadCsv(datasetId) {
      const res = await client.get(`/datasets/${datasetId}/csv/`, {
        responseType: 'blob',
      })
      return res.data
    },
  }
}
