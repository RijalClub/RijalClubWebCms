import { useEffect, useState } from 'react'
import { Upload, FolderPlus, AlertTriangle, ExternalLink, FileUp } from 'lucide-react'

import { api } from '../lib/api'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select } from './ui/select'
import { Switch } from './ui/switch'

const FALLBACK_FOLDERS = [
  { id: 'announcements', label: 'Announcements', path: 'images/announcements' },
  { id: 'blog', label: 'Blog', path: 'images/blog' },
  { id: 'store', label: 'Store', path: 'images/store' },
  { id: 'profile', label: 'Profile', path: 'images/profile' },
  { id: 'hadith-covers', label: 'Hadith Covers', path: 'images/hadith/covers' },
]

function normalizeFolderPath(value) {
  const cleaned = String(value || '').trim().replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '')
  if (!cleaned) return ''
  return cleaned.startsWith('images/') ? cleaned : `images/${cleaned}`
}

function toFolderOption(pathValue) {
  return {
    id: String(pathValue || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
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
          setFolder((prev) => FALLBACK_FOLDERS.some((entry) => entry.path === prev) ? prev : FALLBACK_FOLDERS[0].path)
        }
      } finally {
        if (!cancelled) setLoadingFolders(false)
      }
    }
    loadFolderOptions()
    return () => { cancelled = true }
  }, [])

  async function handleUpload(event) {
    event.preventDefault()
    if (!file) { setError('Choose a file first.'); return }
    const targetFolder = createFolder ? normalizeFolderPath(newFolderPath) : folder
    if (!targetFolder) { setError('Provide a folder path.'); return }
    if (!/^images(?:\/[a-zA-Z0-9_-]+)+$/.test(targetFolder)) {
      setError('Folder must look like images/blog or images/store/new-items.')
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', targetFolder)
    if (fileName.trim()) formData.append('fileName', fileName.trim())

    setUploading(true)
    setError('')
    try {
      const uploadResult = await api.uploadMedia(formData)
      setResult(uploadResult)
      onNotify({ kind: 'success', message: 'Media uploaded to public repository.' })
      setFolder((prev) => (prev === targetFolder ? prev : targetFolder))
      setFolderOptions((prev) => {
        if (prev.some((entry) => entry.path === targetFolder)) return prev
        return [...prev, toFolderOption(targetFolder)].sort((a, b) => a.path.localeCompare(b.path))
      })
      if (createFolder) { setCreateFolder(false); setNewFolderPath('') }
    } catch (apiError) {
      setError(apiError.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Media Upload</CardTitle>
              <CardDescription>Upload files to your configured public media GitHub repo.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form className="space-y-5" onSubmit={handleUpload}>
            {/* File input */}
            <div className="space-y-2">
              <Label htmlFor="upload-file">File</Label>
              <div className={cn(
                'relative flex items-center justify-center rounded-lg border-2 border-dashed border-input p-6 transition-colors hover:border-primary/50 hover:bg-primary/5',
                file && 'border-primary/30 bg-primary/5',
              )}>
                <div className="flex flex-col items-center gap-2 text-center">
                  <FileUp className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {file ? (
                      <span className="font-medium text-foreground">{file.name}</span>
                    ) : (
                      'Click or drag a file here'
                    )}
                  </p>
                </div>
                <input
                  id="upload-file"
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  required
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </div>
            </div>

            {/* Folder selector */}
            <div className="space-y-2">
              <Label htmlFor="folder-select">Section Folder</Label>
              <Select
                id="folder-select"
                value={folder}
                onChange={(event) => setFolder(event.target.value)}
                disabled={loadingFolders || createFolder}
              >
                {folderOptions.map((option) => (
                  <option key={option.id} value={option.path}>
                    {option.label} ({option.path})
                  </option>
                ))}
              </Select>
            </div>

            {/* Create new folder toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={createFolder}
                onChange={setCreateFolder}
                disabled={loadingFolders}
              />
              <Label className="cursor-pointer" onClick={() => !loadingFolders && setCreateFolder(!createFolder)}>
                <div className="flex items-center gap-1.5">
                  <FolderPlus className="h-3.5 w-3.5" />
                  Create a new folder on upload
                </div>
              </Label>
            </div>

            {createFolder && (
              <div className="space-y-2">
                <Label htmlFor="new-folder">New Folder Path</Label>
                <Input
                  id="new-folder"
                  type="text"
                  value={newFolderPath}
                  onChange={(event) => setNewFolderPath(event.target.value)}
                  placeholder="images/blog/ramadan-2026"
                />
              </div>
            )}

            {/* Optional file name */}
            <div className="space-y-2">
              <Label htmlFor="file-name">Optional File Name</Label>
              <Input
                id="file-name"
                type="text"
                value={fileName}
                onChange={(event) => setFileName(event.target.value)}
                placeholder="feature-hero.png"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={uploading || loadingFolders}>
              {uploading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Upload result */}
      {result && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-2">Public URL</p>
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline break-all"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              {result.url}
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
