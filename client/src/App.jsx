import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PanelLeft,
  FileText,
  Code2,
  Upload,
  Image,
  Settings,
  LogOut,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from 'lucide-react'

import { LoginPage } from './components/LoginPage'
import { ContentEditorPanel } from './components/ContentEditorPanel'
import { MediaUploaderPanel } from './components/MediaUploaderPanel'
import { MediaViewerPanel } from './components/MediaViewerPanel'
import { UsersSettingsPanel } from './components/UsersSettingsPanel'
import { VisualContentEditorPanel } from './components/VisualContentEditorPanel'
import { ThemeToggle } from './components/ThemeToggle'
import { Button } from './components/ui/button'
import { Badge } from './components/ui/badge'
import { DialogContent, DialogFooter } from './components/ui/dialog'
import { Separator } from './components/ui/separator'
import { cn } from './lib/utils'
import { api } from './lib/api'

const VIEWS = {
  visualContent: 'visualContent',
  rawContent: 'rawContent',
  mediaEditor: 'mediaEditor',
  mediaViewer: 'mediaViewer',
  settings: 'settings',
}

const VIEW_META = {
  [VIEWS.visualContent]: { label: 'Content Editor', icon: FileText, shortLabel: 'Content' },
  [VIEWS.rawContent]: { label: 'Raw Editor', icon: Code2, shortLabel: 'Raw JSON' },
  [VIEWS.mediaEditor]: { label: 'Media Upload', icon: Upload, shortLabel: 'Upload' },
  [VIEWS.mediaViewer]: { label: 'Media Library', icon: Image, shortLabel: 'Library' },
  [VIEWS.settings]: { label: 'Settings', icon: Settings, shortLabel: 'Settings' },
}

const PERMISSION_ORDER = { none: 0, read: 1, write: 2 }

const SECTION_DEFAULTS = {
  visualEditor: 'read',
  rawEditor: 'read',
  media: 'read',
  settings: 'none',
}

const SECTION_LABELS = {
  visualEditor: 'Visual',
  rawEditor: 'Raw',
  media: 'Media',
  settings: 'Settings',
}

function hasLevel(currentLevel, requiredLevel = 'read') {
  return (PERMISSION_ORDER[currentLevel] || 0) >= (PERMISSION_ORDER[requiredLevel] || 0)
}

function getSectionLevel(user, section) {
  if (!user) return 'none'
  if (user.role === 'master') return 'write'
  return user.sectionPermissions?.[section] || SECTION_DEFAULTS[section] || 'none'
}

function resolveDefaultView(user) {
  const visualLevel = getSectionLevel(user, 'visualEditor')
  const rawLevel = getSectionLevel(user, 'rawEditor')
  const mediaLevel = getSectionLevel(user, 'media')

  if (hasLevel(visualLevel, 'read')) return VIEWS.visualContent
  if (hasLevel(rawLevel, 'read')) return VIEWS.rawContent
  if (hasLevel(mediaLevel, 'write')) return VIEWS.mediaEditor
  if (hasLevel(mediaLevel, 'read')) return VIEWS.mediaViewer
  if (user?.role === 'master') return VIEWS.settings
  return VIEWS.mediaViewer
}

function permissionBadgeVariant(level) {
  if (level === 'write') return 'success'
  if (level === 'read') return 'warning'
  return 'muted'
}

/* ── Toast Notification ── */
function Notice({ notice, onClear }) {
  if (!notice) return null

  return (
    <div className={cn(
      'fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm transition-all animate-in slide-in-from-bottom-2',
      notice.kind === 'success' && 'border-primary/30 bg-primary/10 text-primary',
      notice.kind === 'error' && 'border-destructive/30 bg-destructive/10 text-destructive',
      !notice.kind && 'border-border bg-card text-card-foreground',
    )}>
      {notice.kind === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
      {notice.kind === 'error' && <XCircle className="h-4 w-4 shrink-0" />}
      <span className="text-sm font-medium flex-1">{notice.message}</span>
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export default function App() {
  const [authStatus, setAuthStatus] = useState('checking')
  const [user, setUser] = useState(null)
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState('')
  const [activeView, setActiveView] = useState(VIEWS.visualContent)
  const [notice, setNotice] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [dirtyByView, setDirtyByView] = useState({
    [VIEWS.visualContent]: false,
    [VIEWS.rawContent]: false,
  })
  const [pendingLeaveAction, setPendingLeaveAction] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const sectionLevels = useMemo(
    () => ({
      visualEditor: getSectionLevel(user, 'visualEditor'),
      rawEditor: getSectionLevel(user, 'rawEditor'),
      media: getSectionLevel(user, 'media'),
      settings: getSectionLevel(user, 'settings'),
    }),
    [user],
  )

  const accessibleFiles = useMemo(
    () => files.filter((entry) => entry.permission !== 'none'),
    [files],
  )

  const rawEditorVisible = hasLevel(sectionLevels.rawEditor, 'read')
  const visualEditorVisible = hasLevel(sectionLevels.visualEditor, 'read')
  const mediaViewerVisible = hasLevel(sectionLevels.media, 'read')
  const mediaEditorVisible = hasLevel(sectionLevels.media, 'write')

  const sectionBadges = useMemo(
    () =>
      Object.entries(SECTION_LABELS).map(([key, label]) => ({
        key,
        label,
        level: sectionLevels[key],
      })),
    [sectionLevels],
  )

  const navItems = useMemo(() => {
    const items = []
    if (visualEditorVisible) items.push(VIEWS.visualContent)
    if (rawEditorVisible) items.push(VIEWS.rawContent)
    if (mediaEditorVisible) items.push(VIEWS.mediaEditor)
    if (mediaViewerVisible) items.push(VIEWS.mediaViewer)
    if (user?.role === 'master') items.push(VIEWS.settings)
    return items
  }, [visualEditorVisible, rawEditorVisible, mediaEditorVisible, mediaViewerVisible, user])

  const loadFiles = useCallback(async () => {
    const payload = await api.listFiles()
    const nextFiles = payload.files || []
    setFiles(nextFiles)

    const fallback = nextFiles.find((entry) => entry.permission !== 'none')
    if (fallback) {
      setSelectedFile((prev) => (prev && nextFiles.some((item) => item.file === prev) ? prev : fallback.file))
    }
  }, [])

  const loadSession = useCallback(async () => {
    try {
      const payload = await api.me()
      setUser(payload.user)
      await loadFiles()
      setAuthStatus('authenticated')
      setActiveView(resolveDefaultView(payload.user))
    } catch {
      setUser(null)
      setAuthStatus('guest')
    }
  }, [loadFiles])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(null), 4500)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    if (!user) return

    const visibleViews = [
      ...(visualEditorVisible ? [VIEWS.visualContent] : []),
      ...(rawEditorVisible ? [VIEWS.rawContent] : []),
      ...(mediaEditorVisible ? [VIEWS.mediaEditor] : []),
      ...(mediaViewerVisible ? [VIEWS.mediaViewer] : []),
      ...(user.role === 'master' ? [VIEWS.settings] : []),
    ]

    if (!visibleViews.includes(activeView)) {
      setActiveView(visibleViews[0] || resolveDefaultView(user))
    }
  }, [activeView, mediaEditorVisible, mediaViewerVisible, rawEditorVisible, user, visualEditorVisible])

  async function handleLogin(credentials) {
    setLoginLoading(true)
    try {
      const payload = await api.login(credentials)
      setUser(payload.user)
      await loadFiles()
      setAuthStatus('authenticated')
      setActiveView(resolveDefaultView(payload.user))
      setNotice({ kind: 'success', message: `Welcome back, ${payload.user.displayName}.` })
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleLogout() {
    if (
      (activeView === VIEWS.visualContent && dirtyByView[VIEWS.visualContent]) ||
      (activeView === VIEWS.rawContent && dirtyByView[VIEWS.rawContent])
    ) {
      setPendingLeaveAction({ type: 'logout' })
      return
    }
    await performLogout()
  }

  async function performLogout() {
    await api.logout()
    setUser(null)
    setFiles([])
    setSelectedFile('')
    setDirtyByView({ [VIEWS.visualContent]: false, [VIEWS.rawContent]: false })
    setPendingLeaveAction(null)
    setAuthStatus('guest')
  }

  function markDirty(view, dirty) {
    setDirtyByView((prev) => (prev[view] === dirty ? prev : { ...prev, [view]: dirty }))
  }

  function requestViewChange(nextView) {
    if (!nextView || nextView === activeView) return

    const activeViewIsDirty =
      (activeView === VIEWS.visualContent && dirtyByView[VIEWS.visualContent]) ||
      (activeView === VIEWS.rawContent && dirtyByView[VIEWS.rawContent])

    if (activeViewIsDirty) {
      setPendingLeaveAction({ type: 'view', view: nextView, from: activeView })
      return
    }

    setActiveView(nextView)
    setMobileMenuOpen(false)
  }

  async function confirmLeaveAction() {
    if (!pendingLeaveAction) return
    const fromView = pendingLeaveAction.from || activeView
    setDirtyByView((prev) => ({ ...prev, [fromView]: false }))
    const nextAction = pendingLeaveAction
    setPendingLeaveAction(null)

    if (nextAction.type === 'view') {
      setActiveView(nextAction.view)
      return
    }
    await performLogout()
  }

  /* ── Loading state ── */
  if (authStatus === 'checking') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Checking session...</p>
        </div>
      </div>
    )
  }

  /* ── Guest / Login ── */
  if (authStatus !== 'authenticated') {
    return <LoginPage onSubmit={handleLogin} loading={loginLoading} />
  }

  const activeViewMeta = VIEW_META[activeView]

  /* ── Authenticated layout ── */
  return (
    <div className="flex min-h-svh bg-background">
      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-60',
        )}
      >
        {/* Brand */}
        <div className={cn('flex items-center gap-3 border-b border-sidebar-border px-4 h-14', sidebarCollapsed && 'justify-center px-2')}>
          <img src="/rijal.svg" alt="Rijal Club" className="h-7 w-7 shrink-0" />
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight truncate">Rijal Club</p>
              <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">CMS</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {!sidebarCollapsed && (
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Navigation
            </p>
          )}
          {navItems.map((viewKey) => {
            const meta = VIEW_META[viewKey]
            const Icon = meta.icon
            const isActive = viewKey === activeView
            return (
              <button
                key={viewKey}
                type="button"
                onClick={() => requestViewChange(viewKey)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  sidebarCollapsed && 'justify-center px-2',
                )}
                title={sidebarCollapsed ? meta.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{meta.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* User section at bottom */}
        <div className={cn('border-t border-sidebar-border p-3', sidebarCollapsed && 'p-2')}>
          {!sidebarCollapsed && (
            <div className="mb-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold">
                  {(user.displayName || user.username || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{user.displayName}</p>
                  <p className="text-[10px] text-sidebar-foreground/60 capitalize">{user.role}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {sectionBadges.map((badge) => (
                  <span
                    key={badge.key}
                    className={cn(
                      'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border',
                      badge.level === 'write' && 'border-emerald-500/40 text-emerald-400',
                      badge.level === 'read' && 'border-amber-500/40 text-amber-400',
                      badge.level === 'none' && 'border-sidebar-foreground/20 text-sidebar-foreground/40',
                    )}
                  >
                    {badge.label}: {badge.level}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className={cn('flex gap-1', sidebarCollapsed ? 'flex-col items-center' : 'items-center')}>
            <ThemeToggle className="border-sidebar-border text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-red-400"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* ── Mobile menu overlay ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar text-sidebar-foreground shadow-xl animate-in slide-in-from-left">
            <div className="flex items-center justify-between border-b border-sidebar-border px-4 h-14">
              <div className="flex items-center gap-3">
                <img src="/rijal.svg" alt="Rijal Club" className="h-7 w-7" />
                <span className="text-sm font-semibold tracking-tight">Rijal Club CMS</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md p-1.5 hover:bg-sidebar-accent cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="space-y-1 p-3">
              {navItems.map((viewKey) => {
                const meta = VIEW_META[viewKey]
                const Icon = meta.icon
                const isActive = viewKey === activeView
                return (
                  <button
                    key={viewKey}
                    type="button"
                    onClick={() => {
                      requestViewChange(viewKey)
                      setMobileMenuOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{meta.label}</span>
                    {isActive && <ChevronRight className="ml-auto h-4 w-4 opacity-50" />}
                  </button>
                )
              })}
            </nav>

            <Separator className="bg-sidebar-border" />

            <div className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold">
                  {(user.displayName || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.displayName}</p>
                  <p className="text-xs text-sidebar-foreground/60 capitalize">{user.role}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {sectionBadges.map((badge) => (
                  <span
                    key={badge.key}
                    className={cn(
                      'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border',
                      badge.level === 'write' && 'border-emerald-500/40 text-emerald-400',
                      badge.level === 'read' && 'border-amber-500/40 text-amber-400',
                      badge.level === 'none' && 'border-sidebar-foreground/20 text-sidebar-foreground/40',
                    )}
                  >
                    {badge.label}: {badge.level}
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <ThemeToggle className="border-sidebar-border text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { handleLogout(); setMobileMenuOpen(false) }}
                  className="text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-red-400 gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top header bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-md p-1.5 hover:bg-secondary md:hidden cursor-pointer"
          >
            <PanelLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            {activeViewMeta && (
              <>
                <activeViewMeta.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <h1 className="text-sm font-semibold truncate">{activeViewMeta.label}</h1>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <span className="truncate max-w-[150px]">{user.displayName}</span>
              <Badge variant="secondary" className="text-[10px]">{user.role}</Badge>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeView === VIEWS.visualContent && (
            <VisualContentEditorPanel
              files={accessibleFiles}
              sectionPermission={sectionLevels.visualEditor}
              onNotify={setNotice}
              onDirtyChange={(dirty) => markDirty(VIEWS.visualContent, dirty)}
            />
          )}

          {activeView === VIEWS.rawContent && (
            <ContentEditorPanel
              files={accessibleFiles}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              onNotify={setNotice}
              sectionPermission={sectionLevels.rawEditor}
              onDirtyChange={(dirty) => markDirty(VIEWS.rawContent, dirty)}
            />
          )}

          {activeView === VIEWS.mediaEditor && <MediaUploaderPanel onNotify={setNotice} />}

          {activeView === VIEWS.mediaViewer && <MediaViewerPanel onNotify={setNotice} />}

          {activeView === VIEWS.settings && user.role === 'master' && (
            <UsersSettingsPanel files={files} currentUser={user} onNotify={setNotice} />
          )}
        </main>
      </div>

      {/* ── Toast notification ── */}
      <Notice notice={notice} onClear={() => setNotice(null)} />

      {/* ── Unsaved changes dialog ── */}
      {pendingLeaveAction && (
        <DialogContent
          title="Unsaved Changes"
          description="Your edits are not published yet. Leaving this editor now will discard those changes."
          onClose={() => setPendingLeaveAction(null)}
        >
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-foreground">Any unpublished changes will be permanently lost.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingLeaveAction(null)}>
              Stay
            </Button>
            <Button variant="destructive" onClick={confirmLeaveAction}>
              Leave Without Publishing
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </div>
  )
}
