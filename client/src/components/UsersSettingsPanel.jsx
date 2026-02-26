import { useEffect, useMemo, useState } from 'react'
import { UserPlus, ChevronDown, ChevronRight, Shield, Save, AlertTriangle, Users } from 'lucide-react'

import { api } from '../lib/api'
import { cn } from '../lib/utils'
import { createDefaultPermissions, FilePermissionsEditor } from './FilePermissionsEditor'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select } from './ui/select'
import { Switch } from './ui/switch'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'

const PERMISSION_OPTIONS = ['none', 'read', 'write']

const SECTION_DEFINITIONS = [
  { key: 'visualEditor', label: 'Visual Content Editor' },
  { key: 'rawEditor', label: 'Raw Content Editor' },
  { key: 'media', label: 'Media (viewer/editor)' },
  { key: 'settings', label: 'Settings' },
]

function defaultSectionPermissions(role = 'editor') {
  if (role === 'master') {
    return { visualEditor: 'write', rawEditor: 'write', media: 'write', settings: 'write' }
  }
  return { visualEditor: 'read', rawEditor: 'read', media: 'read', settings: 'none' }
}

function normalizeSectionPermissions(value, role = 'editor') {
  return { ...defaultSectionPermissions(role), ...(value || {}) }
}

function createDraftFromUser(user, fileNames) {
  const basePermissions = createDefaultPermissions(fileNames, 'read')
  return {
    id: user.id,
    displayName: user.displayName,
    role: user.role,
    active: user.active,
    filePermissions: { ...basePermissions, ...(user.filePermissions || {}) },
    sectionPermissions: normalizeSectionPermissions(user.sectionPermissions, user.role),
    password: '',
  }
}

function SectionPermissionsEditor({ value, onChange, disabled = false }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {SECTION_DEFINITIONS.map((section) => (
        <div key={section.key} className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{section.label}</Label>
          <Select
            value={value[section.key] || 'none'}
            onChange={(event) => onChange(section.key, event.target.value)}
            disabled={disabled}
          >
            {PERMISSION_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
        </div>
      ))}
    </div>
  )
}

export function UsersSettingsPanel({ files, currentUser, onNotify }) {
  const fileNames = useMemo(() => files.map((entry) => entry.file), [files])
  const [users, setUsers] = useState([])
  const [drafts, setDrafts] = useState({})
  const [expandedUsers, setExpandedUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingIds, setSavingIds] = useState(new Set())
  const [error, setError] = useState('')

  const [newUser, setNewUser] = useState({
    username: '',
    displayName: '',
    password: '',
    role: 'editor',
    active: true,
    filePermissions: createDefaultPermissions(fileNames, 'read'),
    sectionPermissions: defaultSectionPermissions('editor'),
  })

  useEffect(() => {
    setNewUser((prev) => ({
      ...prev,
      filePermissions:
        Object.keys(prev.filePermissions || {}).length === fileNames.length
          ? prev.filePermissions
          : createDefaultPermissions(fileNames, 'read'),
    }))
  }, [fileNames])

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      const payload = await api.listUsers()
      const list = payload.users || []
      const nextDrafts = {}
      for (const user of list) nextDrafts[user.id] = createDraftFromUser(user, fileNames)
      setUsers(list)
      setDrafts(nextDrafts)
      setExpandedUsers((prev) => {
        const next = {}
        for (const user of list) next[user.id] = prev[user.id] ?? false
        return next
      })
    } catch (apiError) {
      setError(apiError.message || 'Could not load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  function setSaving(id, value) {
    setSavingIds((prev) => {
      const next = new Set(prev)
      if (value) next.add(id); else next.delete(id)
      return next
    })
  }

  function updateDraft(id, changes) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...changes } }))
  }

  function toggleUserCard(userId) {
    setExpandedUsers((prev) => ({ ...prev, [userId]: !prev[userId] }))
  }

  async function createEditor(event) {
    event.preventDefault()
    setError('')
    try {
      await api.createUser({
        username: newUser.username,
        displayName: newUser.displayName,
        password: newUser.password,
        role: newUser.role,
        active: newUser.active,
        filePermissions: newUser.filePermissions,
        sectionPermissions: newUser.sectionPermissions,
      })
      onNotify({ kind: 'success', message: `${newUser.username} created.` })
      setNewUser({
        username: '', displayName: '', password: '', role: 'editor', active: true,
        filePermissions: createDefaultPermissions(fileNames, 'read'),
        sectionPermissions: defaultSectionPermissions('editor'),
      })
      await loadUsers()
    } catch (apiError) {
      setError(apiError.message || 'Failed creating user.')
    }
  }

  async function saveUser(userId) {
    const draft = drafts[userId]
    if (!draft) return
    setSaving(userId, true)
    setError('')
    try {
      await api.updateUser(userId, {
        displayName: draft.displayName,
        role: draft.role,
        active: draft.active,
        filePermissions: draft.filePermissions,
        sectionPermissions: draft.sectionPermissions,
      })
      if (draft.password.trim()) {
        await api.updatePassword(userId, draft.password.trim())
        updateDraft(userId, { password: '' })
      }
      onNotify({ kind: 'success', message: 'User settings updated.' })
      await loadUsers()
    } catch (apiError) {
      setError(apiError.message || 'Failed updating user.')
    } finally {
      setSaving(userId, false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading user settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create user form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Create Editor Account</CardTitle>
              <CardDescription>Only master accounts can manage users. No public registration.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form className="space-y-6" onSubmit={createEditor}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-username">Username</Label>
                <Input id="new-username" type="text" value={newUser.username} onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-displayname">Display Name</Label>
                <Input id="new-displayname" type="text" value={newUser.displayName} onChange={(e) => setNewUser((p) => ({ ...p, displayName: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Password</Label>
                <Input id="new-password" type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} minLength={8} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-role">Role</Label>
                <Select id="new-role" value={newUser.role} onChange={(e) => {
                  const role = e.target.value
                  setNewUser((p) => ({ ...p, role, sectionPermissions: defaultSectionPermissions(role) }))
                }}>
                  <option value="editor">editor</option>
                  <option value="master">master</option>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={newUser.active} onChange={(val) => setNewUser((p) => ({ ...p, active: val }))} />
              <Label className="cursor-pointer" onClick={() => setNewUser((p) => ({ ...p, active: !p.active }))}>Active account</Label>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-semibold">File Permissions</h4>
              <FilePermissionsEditor
                files={fileNames}
                permissions={newUser.filePermissions}
                onChange={(file, value) => setNewUser((p) => ({ ...p, filePermissions: { ...p.filePermissions, [file]: value } }))}
                disabled={newUser.role === 'master'}
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Section Permissions</h4>
              <SectionPermissionsEditor
                value={newUser.sectionPermissions}
                onChange={(section, value) => setNewUser((p) => ({ ...p, sectionPermissions: { ...p.sectionPermissions, [section]: value } }))}
                disabled={newUser.role === 'master'}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4" />
              Create Account
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing users */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <Users className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <CardTitle>Existing Accounts</CardTitle>
              <CardDescription>Master account: {currentUser.displayName}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {users.map((user) => {
            const draft = drafts[user.id]
            if (!draft) return null
            const isProtected = Boolean(user.protected) || (user.role === 'master' && user.username === 'master')
            const expanded = Boolean(expandedUsers[user.id])

            return (
              <div key={user.id} className="rounded-lg border border-border overflow-hidden">
                {/* User header */}
                <button
                  type="button"
                  onClick={() => toggleUserCard(user.id)}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/50 cursor-pointer"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                    {(draft.displayName || user.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{draft.displayName || user.username}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="text-xs text-muted-foreground">{user.username}</span>
                      <Badge variant={draft.role === 'master' ? 'default' : 'secondary'} className="text-[10px]">{draft.role}</Badge>
                      <Badge variant={draft.active ? 'success' : 'destructive'} className="text-[10px]">{draft.active ? 'Active' : 'Disabled'}</Badge>
                      {isProtected && <Badge variant="outline" className="text-[10px]"><Shield className="h-2.5 w-2.5 mr-1" />Protected</Badge>}
                    </div>
                  </div>
                  {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>

                {/* Expanded editor */}
                {expanded && (
                  <div className="border-t border-border p-4 space-y-5 bg-muted/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Username</Label>
                        <Input type="text" value={user.username} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input type="text" value={draft.displayName} disabled={isProtected} onChange={(e) => updateDraft(user.id, { displayName: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={draft.role} disabled={isProtected} onChange={(e) => {
                          const role = e.target.value
                          updateDraft(user.id, { role, sectionPermissions: defaultSectionPermissions(role) })
                        }}>
                          <option value="editor">editor</option>
                          <option value="master">master</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Reset Password</Label>
                        <Input type="password" value={draft.password} minLength={8} disabled={isProtected} placeholder={isProtected ? 'Protected account' : 'Leave blank to keep'} onChange={(e) => updateDraft(user.id, { password: e.target.value })} />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch checked={draft.active} onChange={(val) => updateDraft(user.id, { active: val })} disabled={isProtected} />
                      <Label>Active account</Label>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">File Permissions</h4>
                      <FilePermissionsEditor
                        files={fileNames}
                        permissions={draft.filePermissions}
                        onChange={(file, value) => updateDraft(user.id, { filePermissions: { ...draft.filePermissions, [file]: value } })}
                        disabled={isProtected || draft.role === 'master'}
                      />
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Section Permissions</h4>
                      <SectionPermissionsEditor
                        value={draft.sectionPermissions}
                        onChange={(section, value) => updateDraft(user.id, { sectionPermissions: { ...draft.sectionPermissions, [section]: value } })}
                        disabled={isProtected || draft.role === 'master'}
                      />
                    </div>

                    {isProtected && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5" />
                        Protected master account cannot be edited.
                      </p>
                    )}

                    {!isProtected && (
                      <Button onClick={() => saveUser(user.id)} disabled={savingIds.has(user.id)}>
                        <Save className="h-4 w-4" />
                        {savingIds.has(user.id) ? 'Saving...' : 'Save User'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
