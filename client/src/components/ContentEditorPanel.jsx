import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronsUpDown,
  ExternalLink,
  FileJson,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
} from 'lucide-react'

import { api } from '../lib/api'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { DialogContent, DialogFooter } from './ui/dialog'

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
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false)
  const [mobileQuery, setMobileQuery] = useState('')
  const mobilePickerRef = useRef(null)

  const activeFile = useMemo(
    () => files.find((entry) => entry.file === selectedFile) || null,
    [files, selectedFile],
  )
  const filteredFiles = useMemo(() => {
    const query = mobileQuery.trim().toLowerCase()
    if (!query) return files
    return files.filter((entry) => entry.file.toLowerCase().includes(query))
  }, [files, mobileQuery])

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
          setMeta({ sha: payload?.sha || '', commitSha: '', commitUrl: '' })
        }
      } catch (apiError) {
        if (!cancelled) setError(apiError.message || 'Failed loading file.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [selectedFile])

  useEffect(() => {
    if (!dirty) return undefined
    const onBeforeUnload = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    onDirtyChange?.(dirty)
    return () => onDirtyChange?.(false)
  }, [dirty, onDirtyChange])

  useEffect(() => {
    if (!mobilePickerOpen) return undefined
    function handleClickOutside(event) {
      if (!mobilePickerRef.current?.contains(event.target)) {
        setMobilePickerOpen(false)
        setMobileQuery('')
      }
    }
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setMobilePickerOpen(false)
        setMobileQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [mobilePickerOpen])

  function validateJson() {
    try {
      JSON.parse(rawJson)
      setValidated(true)
      onNotify({ kind: 'success', message: `${selectedFile} JSON is valid.` })
    } catch (validationError) {
      setValidated(false)
      onNotify({ kind: 'error', message: `JSON error: ${validationError.message}` })
    }
  }

  async function saveFile() {
    if (!selectedFile || !canWrite) return
    if (!validated) { setShowValidateModal(true); return }
    setSaving(true)
    setError('')
    try {
      const payload = await api.saveRawContent(selectedFile, { raw: rawJson })
      const nextRaw = `${JSON.stringify(payload.content, null, 2)}\n`
      setRawJson(nextRaw)
      setSavedJson(nextRaw)
      setValidated(true)
      setMeta({ sha: '', commitSha: payload.commitSha, commitUrl: payload.commitUrl })
      onNotify({ kind: 'success', message: `${selectedFile} published to GitHub.` })
    } catch (apiError) {
      setError(apiError.message || 'Failed saving content.')
    } finally {
      setSaving(false)
    }
  }

  function resetChanges() { setRawJson(savedJson); setError(''); setValidated(false) }

  function requestSelectFile(fileName) {
    if (!fileName || fileName === selectedFile) return
    if (dirty) { setPendingFile(fileName); setShowLeaveModal(true); return }
    onSelectFile(fileName)
  }

  function selectFromMobilePicker(fileName) {
    requestSelectFile(fileName)
    setMobilePickerOpen(false)
    setMobileQuery('')
  }

  function confirmLeaveFile() {
    if (!pendingFile) { setShowLeaveModal(false); return }
    setRawJson(savedJson)
    setValidated(false)
    setShowLeaveModal(false)
    onSelectFile(pendingFile)
    setPendingFile('')
  }

  return (
    <div className="grid min-h-[calc(100svh-8rem)] grid-cols-1 grid-rows-[auto_1fr] items-start gap-4 lg:h-full lg:min-h-[calc(100vh-7rem)] lg:grid-cols-[240px_1fr] lg:grid-rows-none lg:items-stretch">
      {/* File list sidebar */}
      <Card className="lg:flex lg:flex-col">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-base">Content Files</CardTitle>
          <CardDescription>Select a file to edit raw JSON</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 lg:flex-1 lg:overflow-hidden lg:p-2 lg:pt-0">
          <div ref={mobilePickerRef} className="relative lg:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMobilePickerOpen((open) => !open)}
              className="h-11 w-full justify-between px-3"
            >
              <span className="flex items-center gap-2 min-w-0">
                <FileJson className="h-4 w-4 shrink-0 opacity-70" />
                <span className="truncate font-medium">{selectedFile || 'Select content file'}</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                {activeFile && (
                  <Badge variant={activeFile.permission === 'write' ? 'success' : activeFile.permission === 'read' ? 'warning' : 'muted'} className="text-[10px]">
                    {activeFile.permission}
                  </Badge>
                )}
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              </span>
            </Button>

            {mobilePickerOpen && (
              <div className="absolute z-20 mt-2 w-full rounded-lg border border-border bg-popover p-2 shadow-lg">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={mobileQuery}
                    onChange={(event) => setMobileQuery(event.target.value)}
                    placeholder="Search files..."
                    className="h-9 pl-8"
                  />
                </div>

                <div className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
                  {filteredFiles.length < 1 && (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">No matching files.</p>
                  )}
                  {filteredFiles.map((entry) => (
                    <button
                      key={entry.file}
                      type="button"
                      onClick={() => selectFromMobilePicker(entry.file)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-secondary cursor-pointer',
                        entry.file === selectedFile ? 'bg-secondary' : '',
                      )}
                    >
                      <Check className={cn('h-4 w-4 shrink-0', entry.file === selectedFile ? 'opacity-100 text-primary' : 'opacity-0')} />
                      <FileJson className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="truncate font-medium">{entry.file}</span>
                      <Badge variant={entry.permission === 'write' ? 'success' : entry.permission === 'read' ? 'warning' : 'muted'} className="ml-auto text-[10px] shrink-0">
                        {entry.permission}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="hidden lg:flex lg:h-full lg:flex-col lg:gap-1.5 lg:overflow-y-auto">
            {files.map((entry) => (
              <button
                key={entry.file}
                type="button"
                onClick={() => requestSelectFile(entry.file)}
                className={cn(
                  'flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors cursor-pointer',
                  entry.file === selectedFile
                    ? 'border-primary/20 bg-primary/10 text-primary'
                    : 'border-border/70 bg-background text-foreground hover:bg-secondary lg:border-transparent lg:bg-transparent',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileJson className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  <span className="truncate font-medium">{entry.file}</span>
                </div>
                <Badge variant={entry.permission === 'write' ? 'success' : entry.permission === 'read' ? 'warning' : 'muted'} className="text-[10px] shrink-0">
                  {entry.permission}
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Editor area */}
      <Card className="flex flex-col self-stretch">
        <CardHeader className="p-4 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{selectedFile || 'Select a file'}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1 flex-wrap">
                <span>Permission: <strong className="text-foreground">{activeFile?.permission || 'none'}</strong></span>
                <span>&middot;</span>
                <span>Section: <strong className="text-foreground">{sectionPermission}</strong></span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={validateJson} disabled={!selectedFile || loading}>
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Validate</span>
              </Button>
              <Button variant="outline" size="sm" onClick={resetChanges} disabled={!dirty || loading || saving}>
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Revert</span>
              </Button>
              <Button size="sm" onClick={saveFile} disabled={!canWrite || !dirty || loading || saving}>
                <Send className="h-3.5 w-3.5" />
                {saving ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0 flex flex-col flex-1 gap-3 min-h-0">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading file...
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Textarea
            value={rawJson}
            onChange={(event) => { setRawJson(event.target.value); setValidated(false) }}
            className="font-mono text-xs leading-relaxed flex-1 min-h-[300px] resize-y"
            spellCheck={false}
            placeholder='{"example": true}'
            disabled={!selectedFile || loading}
          />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className={cn('flex items-center gap-1', dirty ? 'text-amber-500' : 'text-primary')}>
                {dirty ? <><AlertTriangle className="h-3 w-3" /> Unsaved</> : <><CheckCircle className="h-3 w-3" /> Saved</>}
              </span>
              <span className={cn('flex items-center gap-1', validated ? 'text-primary' : '')}>
                {validated ? <><ShieldCheck className="h-3 w-3" /> Validated</> : 'Not validated'}
              </span>
            </div>
            {meta?.commitSha && (
              <a href={meta.commitUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                <ExternalLink className="h-3 w-3" />
                Commit {meta.commitSha.slice(0, 7)}
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation required dialog */}
      {showValidateModal && (
        <DialogContent title="Validation Required" description="Press Validate and fix any JSON errors before publishing this file." onClose={() => setShowValidateModal(false)}>
          <DialogFooter>
            <Button onClick={() => setShowValidateModal(false)}>Okay</Button>
          </DialogFooter>
        </DialogContent>
      )}

      {/* Leave without saving dialog */}
      {showLeaveModal && (
        <DialogContent title="Unsaved Changes" description="Changes in this JSON file are not published yet. Leaving now will discard them." onClose={() => { setPendingFile(''); setShowLeaveModal(false) }}>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPendingFile(''); setShowLeaveModal(false) }}>Stay</Button>
            <Button variant="destructive" onClick={confirmLeaveFile}>Leave Without Publishing</Button>
          </DialogFooter>
        </DialogContent>
      )}
    </div>
  )
}
