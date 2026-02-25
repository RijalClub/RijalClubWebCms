import { useCallback, useEffect, useMemo, useState } from 'react'

import { LoginPage } from './components/LoginPage'
import { ContentEditorPanel } from './components/ContentEditorPanel'
import { MediaUploaderPanel } from './components/MediaUploaderPanel'
import { MediaViewerPanel } from './components/MediaViewerPanel'
import { UsersSettingsPanel } from './components/UsersSettingsPanel'
import { VisualContentEditorPanel } from './components/VisualContentEditorPanel'
import { api } from './lib/api'

const VIEWS = {
  visualContent: 'visualContent',
  rawContent: 'rawContent',
  mediaEditor: 'mediaEditor',
  mediaViewer: 'mediaViewer',
  settings: 'settings',
}

const PERMISSION_ORDER = {
  none: 0,
  read: 1,
  write: 2,
}

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
  if (!user) {
    return 'none'
  }

  if (user.role === 'master') {
    return 'write'
  }

  return user.sectionPermissions?.[section] || SECTION_DEFAULTS[section] || 'none'
}

function resolveDefaultView(user) {
  const visualLevel = getSectionLevel(user, 'visualEditor')
  const rawLevel = getSectionLevel(user, 'rawEditor')
  const mediaLevel = getSectionLevel(user, 'media')

  if (hasLevel(visualLevel, 'read')) {
    return VIEWS.visualContent
  }

  if (hasLevel(rawLevel, 'read')) {
    return VIEWS.rawContent
  }

  if (hasLevel(mediaLevel, 'write')) {
    return VIEWS.mediaEditor
  }

  if (hasLevel(mediaLevel, 'read')) {
    return VIEWS.mediaViewer
  }

  if (user?.role === 'master') {
    return VIEWS.settings
  }

  return VIEWS.mediaViewer
}

function Notice({ notice, onClear }) {
  if (!notice) {
    return null
  }

  return (
    <div className={`notice ${notice.kind}`}>
      <span>{notice.message}</span>
      <button type="button" onClick={onClear}>
        Dismiss
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
    if (!notice) {
      return undefined
    }

    const timeout = window.setTimeout(() => setNotice(null), 4500)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    if (!user) {
      return
    }

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
  }, [
    activeView,
    mediaEditorVisible,
    mediaViewerVisible,
    rawEditorVisible,
    user,
    visualEditorVisible,
  ])

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
    setDirtyByView({
      [VIEWS.visualContent]: false,
      [VIEWS.rawContent]: false,
    })
    setPendingLeaveAction(null)
    setAuthStatus('guest')
  }

  function markDirty(view, dirty) {
    setDirtyByView((prev) => (prev[view] === dirty ? prev : { ...prev, [view]: dirty }))
  }

  function requestViewChange(nextView) {
    if (!nextView || nextView === activeView) {
      return
    }

    const activeViewIsDirty =
      (activeView === VIEWS.visualContent && dirtyByView[VIEWS.visualContent]) ||
      (activeView === VIEWS.rawContent && dirtyByView[VIEWS.rawContent])

    if (activeViewIsDirty) {
      setPendingLeaveAction({ type: 'view', view: nextView, from: activeView })
      return
    }

    setActiveView(nextView)
  }

  async function confirmLeaveAction() {
    if (!pendingLeaveAction) {
      return
    }

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

  if (authStatus === 'checking') {
    return <div className="loading-screen">Checking session...</div>
  }

  if (authStatus !== 'authenticated') {
    return <LoginPage onSubmit={handleLogin} loading={loginLoading} />
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Rijal Club CMS</p>
          <h1>Admin Panel</h1>
        </div>

        <div className="topbar-right">
          <div className="identity-block">
            <p className="muted">
              Signed in as <strong>{user.displayName}</strong> ({user.role})
            </p>
            <div className="permission-summary-row">
              {sectionBadges.map((badge) => (
                <span key={badge.key} className={`permission-badge ${badge.level}`}>
                  {badge.label}: {badge.level}
                </span>
              ))}
            </div>
          </div>
          <button className="btn" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="view-tabs compact-tabs">
        {visualEditorVisible ? (
          <button
            type="button"
            className={`btn ${activeView === VIEWS.visualContent ? 'btn-primary' : ''}`}
            onClick={() => requestViewChange(VIEWS.visualContent)}
          >
            <span className="tab-icon">CE</span>
            Content Editor
          </button>
        ) : null}

        {rawEditorVisible ? (
          <button
            type="button"
            className={`btn ${activeView === VIEWS.rawContent ? 'btn-primary' : ''}`}
            onClick={() => requestViewChange(VIEWS.rawContent)}
          >
            <span className="tab-icon">RE</span>
            Raw Content Editor
          </button>
        ) : null}

        {mediaEditorVisible ? (
          <button
            type="button"
            className={`btn ${activeView === VIEWS.mediaEditor ? 'btn-primary' : ''}`}
            onClick={() => requestViewChange(VIEWS.mediaEditor)}
          >
            <span className="tab-icon">ME</span>
            Media Editor
          </button>
        ) : null}

        {mediaViewerVisible ? (
          <button
            type="button"
            className={`btn ${activeView === VIEWS.mediaViewer ? 'btn-primary' : ''}`}
            onClick={() => requestViewChange(VIEWS.mediaViewer)}
          >
            <span className="tab-icon">MV</span>
            Media Viewer
          </button>
        ) : null}

        {user.role === 'master' ? (
          <button
            type="button"
            className={`btn ${activeView === VIEWS.settings ? 'btn-primary' : ''}`}
            onClick={() => requestViewChange(VIEWS.settings)}
          >
            <span className="tab-icon">ST</span>
            Settings
          </button>
        ) : null}
      </nav>

      <main className="main-content">
        {activeView === VIEWS.visualContent ? (
          <VisualContentEditorPanel
            files={accessibleFiles}
            sectionPermission={sectionLevels.visualEditor}
            onNotify={setNotice}
            onDirtyChange={(dirty) => markDirty(VIEWS.visualContent, dirty)}
          />
        ) : null}

        {activeView === VIEWS.rawContent ? (
          <ContentEditorPanel
            files={accessibleFiles}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
            onNotify={setNotice}
            sectionPermission={sectionLevels.rawEditor}
            onDirtyChange={(dirty) => markDirty(VIEWS.rawContent, dirty)}
          />
        ) : null}

        {activeView === VIEWS.mediaEditor ? <MediaUploaderPanel onNotify={setNotice} /> : null}

        {activeView === VIEWS.mediaViewer ? <MediaViewerPanel onNotify={setNotice} /> : null}

        {activeView === VIEWS.settings && user.role === 'master' ? (
          <UsersSettingsPanel files={files} currentUser={user} onNotify={setNotice} />
        ) : null}
      </main>

      <Notice notice={notice} onClear={() => setNotice(null)} />

      {pendingLeaveAction ? (
        <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Discard changes">
          <div className="modal-backdrop" onClick={() => setPendingLeaveAction(null)} />
          <section className="modal-card">
            <h3>Unsaved Changes</h3>
            <p>Your edits are not published yet. Leaving this editor now will discard those changes.</p>
            <div className="button-row">
              <button type="button" className="btn" onClick={() => setPendingLeaveAction(null)}>
                Stay
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmLeaveAction}>
                Leave Without Publishing
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
