import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Copy, Check, ExternalLink, Search, FolderOpen, Image, Film, File, AlertTriangle } from 'lucide-react'

import { api } from '../lib/api'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Input } from './ui/input'
import { Badge } from './ui/badge'

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 1) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) { value /= 1024; unitIndex += 1 }
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

  useEffect(() => { loadMedia() }, [])

  const visibleFiles = useMemo(() => {
    const scoped = activeFolder === 'all' ? files : files.filter((entry) => entry.folder === activeFolder)
    const query = searchTerm.trim().toLowerCase()
    if (!query) return scoped
    return scoped.filter((entry) => {
      const haystack = [entry.fileName, entry.folder, entry.path].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [activeFolder, files, searchTerm])

  async function copyLink(url, pathValue) {
    if (!url) return
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
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Image className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Media Library</CardTitle>
                <CardDescription>Browse media currently in the public repository.</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadMedia} disabled={loading}>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0 space-y-4">
          {/* Folder filter chips */}
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveFolder('all')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                activeFolder === 'all'
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-input hover:bg-secondary text-muted-foreground',
              )}
            >
              <FolderOpen className="h-3 w-3" />
              All ({files.length})
            </button>
            {folders.map((folder) => {
              const count = files.filter((entry) => entry.folder === folder).length
              return (
                <button
                  type="button"
                  key={folder}
                  onClick={() => setActiveFolder(folder)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                    activeFolder === folder
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-input hover:bg-secondary text-muted-foreground',
                  )}
                >
                  {folder} ({count})
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by file name, path, or folder..."
              className="pl-9"
            />
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading media files...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {!loading && !error && (
            visibleFiles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visibleFiles.map((file) => (
                  <div key={file.path} className="group rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-md">
                    {/* Preview */}
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {file.mediaType === 'image' ? (
                        <img src={file.url} alt={file.fileName} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      ) : file.mediaType === 'video' ? (
                        <video controls preload="metadata" className="h-full w-full object-cover">
                          <source src={file.url} />
                        </video>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <File className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] uppercase">
                        {file.mediaType}
                      </Badge>
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-2">
                      <p className="text-sm font-semibold truncate">{file.fileName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{file.folder || 'root'}</span>
                        <span>&middot;</span>
                        <span>{formatBytes(file.size)}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-auto h-7 text-xs"
                          onClick={() => copyLink(file.url, file.path)}
                        >
                          {copiedPath === file.path ? (
                            <><Check className="h-3 w-3" /> Copied</>
                          ) : (
                            <><Copy className="h-3 w-3" /> Copy Link</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Image className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">No media files found for this folder.</p>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
