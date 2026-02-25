import { useEffect, useMemo, useState } from 'react'

import { api } from '../lib/api'

export function ContentEditorPanel({
  files,
  selectedFile,
  onSelectFile,
  onNotify,
  sectionPermission = 'write',
  onDirtyChange,
}) {
  const [rawJson, setRawJson] = useState('')
  const [savedJson, setSavedJson] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [meta, setMeta] = useState(null)
  const [validated, setValidated] = useState(false)
  const [showValidateModal, setShowValidateModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [pendingFile, setPendingFile] = useState('')

  const activeFile = useMemo(
    () => files.find((entry) => entry.file === selectedFile) || null,
    [files, selectedFile],
  )

  const dirty = rawJson !== savedJson
  const canWrite = activeFile?.permission === 'write' && sectionPermission === 'write'

  useEffect(() => {
    if (!selectedFile) {
      setRawJson('')
      setSavedJson('')
      setValidated(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const payload = await api.getRawContent(selectedFile)
        const nextRaw = payload?.raw || JSON.stringify(payload?.content || {}, null, 2)

        if (!cancelled) {
          setRawJson(nextRaw)
          setSavedJson(nextRaw)
          setValidated(false)
          setMeta({
            sha: payload?.sha || '',
            commitSha: '',
            commitUrl: '',
          })
        }
      } catch (apiError) {
        if (!cancelled) {
          setError(apiError.message || 'Failed loading file.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [selectedFile])

  useEffect(() => {
    if (!dirty) {
      return undefined
    }

    const onBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    onDirtyChange?.(dirty)
    return () => onDirtyChange?.(false)
  }, [dirty, onDirtyChange])

  function validateJson() {
    try {
      JSON.parse(rawJson)
      setValidated(true)
      onNotify({ kind: 'success', message: `${selectedFile} JSON is valid.` })
    } catch (validationError) {
      setValidated(false)
      onNotify({
        kind: 'error',
        message: `JSON error: ${validationError.message}`,
      })
    }
  }

  async function saveFile() {
    if (!selectedFile || !canWrite) {
      return
    }

    if (!validated) {
      setShowValidateModal(true)
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = await api.saveRawContent(selectedFile, { raw: rawJson })
      const nextRaw = `${JSON.stringify(payload.content, null, 2)}\n`
      setRawJson(nextRaw)
      setSavedJson(nextRaw)
      setValidated(true)
      setMeta({
        sha: '',
        commitSha: payload.commitSha,
        commitUrl: payload.commitUrl,
      })
      onNotify({ kind: 'success', message: `${selectedFile} published to GitHub.` })
    } catch (apiError) {
      setError(apiError.message || 'Failed saving content.')
    } finally {
      setSaving(false)
    }
  }

  function resetChanges() {
    setRawJson(savedJson)
    setError('')
    setValidated(false)
  }

  function requestSelectFile(fileName) {
    if (!fileName || fileName === selectedFile) {
      return
    }

    if (dirty) {
      setPendingFile(fileName)
      setShowLeaveModal(true)
      return
    }

    onSelectFile(fileName)
  }

  function confirmLeaveFile() {
    if (!pendingFile) {
      setShowLeaveModal(false)
      return
    }

    setRawJson(savedJson)
    setValidated(false)
    setShowLeaveModal(false)
    onSelectFile(pendingFile)
    setPendingFile('')
  }

  return (
    <div className="panel-grid">
      <aside className="file-list card">
        <div className="card-header">
          <h2>Content Files</h2>
          <p className="muted">Raw JSON mode available for every file.</p>
        </div>

        <div className="file-list-scroll">
          {files.map((entry) => (
            <button
              key={entry.file}
              type="button"
              className={`file-chip ${entry.file === selectedFile ? 'active' : ''}`}
              onClick={() => requestSelectFile(entry.file)}
            >
              <span>{entry.file}</span>
              <small>{entry.permission}</small>
            </button>
          ))}
        </div>
      </aside>

      <section className="editor card">
        <div className="card-header">
          <div>
            <h2>{selectedFile || 'Select a file'}</h2>
            <p className="muted">
              Permission: <strong>{activeFile?.permission || 'none'}</strong> • Section:{' '}
              <strong>{sectionPermission}</strong>
            </p>
          </div>

          <div className="button-row">
            <button type="button" className="btn" onClick={validateJson} disabled={!selectedFile || loading}>
              Validate
            </button>
            <button type="button" className="btn" onClick={resetChanges} disabled={!dirty || loading || saving}>
              Revert
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveFile}
              disabled={!canWrite || !dirty || loading || saving}
            >
              {saving ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>

        {loading ? <p className="muted">Loading file...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        <textarea
          value={rawJson}
          onChange={(event) => {
            setRawJson(event.target.value)
            setValidated(false)
          }}
          className="json-textarea"
          spellCheck={false}
          placeholder='{"example": true}'
          disabled={!selectedFile || loading}
        />

        <div className="meta-row">
          <span>
            {dirty ? 'Unsaved changes' : 'Saved'} • {validated ? 'Validated' : 'Not validated'}
          </span>
          {meta?.commitSha ? (
            <a href={meta.commitUrl} target="_blank" rel="noreferrer">
              Commit {meta.commitSha.slice(0, 7)}
            </a>
          ) : null}
        </div>
      </section>

      {showValidateModal ? (
        <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Validation required">
          <div className="modal-backdrop" onClick={() => setShowValidateModal(false)} />
          <section className="modal-card">
            <h3>Validation Required</h3>
            <p>Press Validate and fix any JSON errors before publishing this file.</p>
            <button type="button" className="btn btn-primary" onClick={() => setShowValidateModal(false)}>
              Okay
            </button>
          </section>
        </div>
      ) : null}

      {showLeaveModal ? (
        <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Discard changes">
          <div
            className="modal-backdrop"
            onClick={() => {
              setPendingFile('')
              setShowLeaveModal(false)
            }}
          />
          <section className="modal-card">
            <h3>Unsaved Changes</h3>
            <p>Changes in this JSON file are not published yet. Leaving now will discard them.</p>
            <div className="button-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setPendingFile('')
                  setShowLeaveModal(false)
                }}
              >
                Stay
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmLeaveFile}>
                Leave Without Publishing
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
