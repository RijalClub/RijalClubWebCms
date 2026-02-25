import { useEffect, useMemo, useState } from 'react'

import { api } from '../lib/api'

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 1) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function MediaViewerPanel({ onNotify }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [folders, setFolders] = useState([])
  const [files, setFiles] = useState([])
  const [activeFolder, setActiveFolder] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedPath, setCopiedPath] = useState('')

  async function loadMedia() {
    setLoading(true)
    setError('')

    try {
      const payload = await api.listMediaFiles()
      const nextFolders = payload?.folders || []
      const nextFiles = payload?.files || []
      setFolders(nextFolders)
      setFiles(nextFiles)
      setActiveFolder((prev) => (prev === 'all' || nextFolders.includes(prev) ? prev : 'all'))
    } catch (apiError) {
      setError(apiError.message || 'Unable to load media list.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMedia()
  }, [])

  const visibleFiles = useMemo(() => {
    const scoped = activeFolder === 'all' ? files : files.filter((entry) => entry.folder === activeFolder)
    const query = searchTerm.trim().toLowerCase()

    if (!query) {
      return scoped
    }

    return scoped.filter((entry) => {
      const haystack = [entry.fileName, entry.folder, entry.path].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [activeFolder, files, searchTerm])

  async function copyLink(url, pathValue) {
    if (!url) {
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopiedPath(pathValue)
      onNotify?.({ kind: 'success', message: 'Media link copied to clipboard.' })
      window.setTimeout(() => setCopiedPath(''), 1800)
    } catch {
      setError('Clipboard access failed. Copy manually from Open File.')
      onNotify?.({ kind: 'error', message: 'Clipboard access failed. Copy the URL manually.' })
    }
  }

  return (
    <section className="card stack-lg">
      <div className="card-header">
        <div>
          <h2>Media Viewer</h2>
          <p className="muted">Browse media currently in the public repository.</p>
        </div>

        <button type="button" className="btn" onClick={loadMedia} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="media-folder-row">
        <button
          type="button"
          className={`folder-chip ${activeFolder === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFolder('all')}
        >
          All ({files.length})
        </button>

        {folders.map((folder) => {
          const count = files.filter((entry) => entry.folder === folder).length
          return (
            <button
              type="button"
              key={folder}
              className={`folder-chip ${activeFolder === folder ? 'active' : ''}`}
              onClick={() => setActiveFolder(folder)}
            >
              {folder} ({count})
            </button>
          )
        })}
      </div>

      <label>
        <span>Search media</span>
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Find by file name, path, or folder"
        />
      </label>

      {loading ? <p className="muted">Loading media files...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error ? (
        visibleFiles.length > 0 ? (
          <div className="media-grid">
            {visibleFiles.map((file) => (
              <article className="media-card" key={file.path}>
                <div className="media-preview">
                  {file.mediaType === 'image' ? (
                    <img src={file.url} alt={file.fileName} loading="lazy" />
                  ) : file.mediaType === 'video' ? (
                    <video controls preload="metadata">
                      <source src={file.url} />
                    </video>
                  ) : (
                    <div className="media-fallback">{file.mediaType.toUpperCase()}</div>
                  )}
                </div>

                <div className="media-card-body">
                  <p className="media-name">{file.fileName}</p>
                  <p className="muted">{file.folder || 'root'}</p>
                  <p className="muted">{formatBytes(file.size)}</p>
                  <div className="media-link-row">
                    <a href={file.url} target="_blank" rel="noreferrer">
                      Open File
                    </a>
                    <button type="button" className="btn btn-small" onClick={() => copyLink(file.url, file.path)}>
                      {copiedPath === file.path ? 'Copied' : 'Copy Link'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No media files found for this folder.</p>
        )
      ) : null}
    </section>
  )
}
