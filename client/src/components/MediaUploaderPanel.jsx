import { useEffect, useState } from 'react'

import { api } from '../lib/api'

const FALLBACK_FOLDERS = [
  { id: 'announcements', label: 'Announcements', path: 'images/announcements' },
  { id: 'blog', label: 'Blog', path: 'images/blog' },
  { id: 'store', label: 'Store', path: 'images/store' },
  { id: 'profile', label: 'Profile', path: 'images/profile' },
  { id: 'hadith-covers', label: 'Hadith Covers', path: 'images/hadith/covers' },
]

function normalizeFolderPath(value) {
  const cleaned = String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')

  if (!cleaned) {
    return ''
  }

  return cleaned.startsWith('images/') ? cleaned : `images/${cleaned}`
}

function toFolderOption(pathValue) {
  return {
    id: String(pathValue || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''),
    label: pathValue,
    path: pathValue,
  }
}

export function MediaUploaderPanel({ onNotify }) {
  const [file, setFile] = useState(null)
  const [folderOptions, setFolderOptions] = useState(FALLBACK_FOLDERS)
  const [folder, setFolder] = useState(FALLBACK_FOLDERS[0].path)
  const [createFolder, setCreateFolder] = useState(false)
  const [newFolderPath, setNewFolderPath] = useState('')
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loadingFolders, setLoadingFolders] = useState(true)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadFolderOptions() {
      setLoadingFolders(true)

      try {
        const payload = await api.listMediaFolders()
        const options = payload?.folders || []

        if (!cancelled && options.length > 0) {
          setFolderOptions(options)
          setFolder((prev) => (options.some((entry) => entry.path === prev) ? prev : options[0].path))
        }
      } catch {
        if (!cancelled) {
          setFolderOptions(FALLBACK_FOLDERS)
          setFolder((prev) =>
            FALLBACK_FOLDERS.some((entry) => entry.path === prev) ? prev : FALLBACK_FOLDERS[0].path,
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingFolders(false)
        }
      }
    }

    loadFolderOptions()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleUpload(event) {
    event.preventDefault()

    if (!file) {
      setError('Choose a file first.')
      return
    }

    const targetFolder = createFolder ? normalizeFolderPath(newFolderPath) : folder

    if (!targetFolder) {
      setError('Provide a folder path.')
      return
    }

    if (!/^images(?:\/[a-zA-Z0-9_-]+)+$/.test(targetFolder)) {
      setError('Folder must look like images/blog or images/store/new-items.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', targetFolder)

    if (fileName.trim()) {
      formData.append('fileName', fileName.trim())
    }

    setUploading(true)
    setError('')

    try {
      const uploadResult = await api.uploadMedia(formData)
      setResult(uploadResult)
      onNotify({ kind: 'success', message: 'Media uploaded to public repository.' })
      setFolder((prev) => (prev === targetFolder ? prev : targetFolder))
      setFolderOptions((prev) => {
        if (prev.some((entry) => entry.path === targetFolder)) {
          return prev
        }

        return [...prev, toFolderOption(targetFolder)].sort((a, b) => a.path.localeCompare(b.path))
      })
      if (createFolder) {
        setCreateFolder(false)
        setNewFolderPath('')
      }
    } catch (apiError) {
      setError(apiError.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="card stack">
      <div className="card-header">
        <h2>Media Upload</h2>
        <p className="muted">Uploads files to your configured public media GitHub repo.</p>
      </div>

      <form className="stack" onSubmit={handleUpload}>
        <label>
          <span>File</span>
          <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} required />
        </label>

        <label>
          <span>Section Folder</span>
          <select
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            disabled={loadingFolders || createFolder}
          >
            {folderOptions.map((option) => (
              <option key={option.id} value={option.path}>
                {option.label} ({option.path})
              </option>
            ))}
          </select>
        </label>

        <label className="inline-toggle">
          <input
            type="checkbox"
            checked={createFolder}
            onChange={(event) => setCreateFolder(event.target.checked)}
            disabled={loadingFolders}
          />
          <span>Create a new folder on upload</span>
        </label>

        {createFolder ? (
          <label>
            <span>New Folder Path</span>
            <input
              type="text"
              value={newFolderPath}
              onChange={(event) => setNewFolderPath(event.target.value)}
              placeholder="images/blog/ramadan-2026"
            />
          </label>
        ) : null}

        <label>
          <span>Optional file name</span>
          <input
            type="text"
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
            placeholder="feature-hero.png"
          />
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        <button className="btn btn-primary" type="submit" disabled={uploading || loadingFolders}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {result ? (
        <div className="result-box">
          <p>
            <strong>Public URL</strong>
          </p>
          <a href={result.url} target="_blank" rel="noreferrer">
            {result.url}
          </a>
        </div>
      ) : null}
    </section>
  )
}
