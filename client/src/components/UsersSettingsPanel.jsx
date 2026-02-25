import { useEffect, useMemo, useState } from 'react'

import { api } from '../lib/api'
import { createDefaultPermissions, FilePermissionsEditor } from './FilePermissionsEditor'

const PERMISSION_OPTIONS = ['none', 'read', 'write']

const SECTION_DEFINITIONS = [
  { key: 'visualEditor', label: 'Visual Content Editor' },
  { key: 'rawEditor', label: 'Raw Content Editor' },
  { key: 'media', label: 'Media (viewer/editor)' },
  { key: 'settings', label: 'Settings' },
]

function defaultSectionPermissions(role = 'editor') {
  if (role === 'master') {
    return {
      visualEditor: 'write',
      rawEditor: 'write',
      media: 'write',
      settings: 'write',
    }
  }

  return {
    visualEditor: 'read',
    rawEditor: 'read',
    media: 'read',
    settings: 'none',
  }
}

function normalizeSectionPermissions(value, role = 'editor') {
  const defaults = defaultSectionPermissions(role)

  return {
    ...defaults,
    ...(value || {}),
  }
}

function createDraftFromUser(user, fileNames) {
  const basePermissions = createDefaultPermissions(fileNames, 'read')

  return {
    id: user.id,
    displayName: user.displayName,
    role: user.role,
    active: user.active,
    filePermissions: {
      ...basePermissions,
      ...(user.filePermissions || {}),
    },
    sectionPermissions: normalizeSectionPermissions(user.sectionPermissions, user.role),
    password: '',
  }
}

function SectionPermissionsEditor({ value, onChange, disabled = false }) {
  return (
    <div className="permissions-grid">
      {SECTION_DEFINITIONS.map((section) => (
        <label key={section.key}>
          <span>{section.label}</span>
          <select
            value={value[section.key] || 'none'}
            onChange={(event) => onChange(section.key, event.target.value)}
            disabled={disabled}
          >
            {PERMISSION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
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
      for (const user of list) {
        nextDrafts[user.id] = createDraftFromUser(user, fileNames)
      }

      setUsers(list)
      setDrafts(nextDrafts)
      setExpandedUsers((prev) => {
        const next = {}
        for (const user of list) {
          next[user.id] = prev[user.id] ?? false
        }
        return next
      })
    } catch (apiError) {
      setError(apiError.message || 'Could not load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  function setSaving(id, value) {
    setSavingIds((prev) => {
      const next = new Set(prev)
      if (value) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  function updateDraft(id, changes) {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...changes,
      },
    }))
  }

  function toggleUserCard(userId) {
    setExpandedUsers((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }))
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
        username: '',
        displayName: '',
        password: '',
        role: 'editor',
        active: true,
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
    if (!draft) {
      return
    }

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
      <section className="card">
        <p className="muted">Loading user settings...</p>
      </section>
    )
  }

  return (
    <div className="stack-lg">
      <section className="card stack">
        <div className="card-header">
          <h2>Create Editor Account</h2>
          <p className="muted">Only master accounts can manage users. There is no public registration.</p>
        </div>

        <form className="stack" onSubmit={createEditor}>
          <div className="form-grid">
            <label>
              <span>Username</span>
              <input
                type="text"
                value={newUser.username}
                onChange={(event) => setNewUser((prev) => ({ ...prev, username: event.target.value }))}
                required
              />
            </label>

            <label>
              <span>Display Name</span>
              <input
                type="text"
                value={newUser.displayName}
                onChange={(event) => setNewUser((prev) => ({ ...prev, displayName: event.target.value }))}
                required
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                value={newUser.password}
                onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
                minLength={8}
                required
              />
            </label>

            <label>
              <span>Role</span>
              <select
                value={newUser.role}
                onChange={(event) => {
                  const role = event.target.value
                  setNewUser((prev) => ({
                    ...prev,
                    role,
                    sectionPermissions: defaultSectionPermissions(role),
                  }))
                }}
              >
                <option value="editor">editor</option>
                <option value="master">master</option>
              </select>
            </label>
          </div>

          <label className="inline-toggle">
            <input
              type="checkbox"
              checked={newUser.active}
              onChange={(event) => setNewUser((prev) => ({ ...prev, active: event.target.checked }))}
            />
            <span>Active account</span>
          </label>

          <div>
            <h3>File permissions</h3>
            <FilePermissionsEditor
              files={fileNames}
              permissions={newUser.filePermissions}
              onChange={(file, value) =>
                setNewUser((prev) => ({
                  ...prev,
                  filePermissions: {
                    ...prev.filePermissions,
                    [file]: value,
                  },
                }))
              }
              disabled={newUser.role === 'master'}
            />
          </div>

          <div>
            <h3>Section permissions</h3>
            <SectionPermissionsEditor
              value={newUser.sectionPermissions}
              onChange={(section, value) =>
                setNewUser((prev) => ({
                  ...prev,
                  sectionPermissions: {
                    ...prev.sectionPermissions,
                    [section]: value,
                  },
                }))
              }
              disabled={newUser.role === 'master'}
            />
          </div>

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" className="btn btn-primary">
            Create Account
          </button>
        </form>
      </section>

      <section className="card stack">
        <div className="card-header">
          <h2>Existing Accounts</h2>
          <p className="muted">Master account: {currentUser.displayName}</p>
        </div>

        <div className="stack-lg">
          {users.map((user) => {
            const draft = drafts[user.id]
            if (!draft) {
              return null
            }

            const isProtected = Boolean(user.protected) || (user.role === 'master' && user.username === 'master')
            const expanded = Boolean(expandedUsers[user.id])

            return (
              <article className="user-card" key={user.id}>
                <div className="card-header compact user-card-header">
                  <div className="stack-tight">
                    <h3>{draft.displayName || user.username}</h3>
                    <p className="muted editor-subline">
                      {user.username} • {draft.role} • {draft.active ? 'Active' : 'Disabled'}
                      {isProtected ? ' • Protected master' : ''}
                    </p>
                  </div>
                  <button type="button" className="btn btn-small" onClick={() => toggleUserCard(user.id)}>
                    {expanded ? 'Collapse' : 'Edit'}
                  </button>
                </div>

                {expanded ? (
                  <>
                    <div className="form-grid">
                      <label>
                        <span>Username</span>
                        <input type="text" value={user.username} disabled />
                      </label>

                      <label>
                        <span>Display Name</span>
                        <input
                          type="text"
                          value={draft.displayName}
                          disabled={isProtected}
                          onChange={(event) => updateDraft(user.id, { displayName: event.target.value })}
                        />
                      </label>

                      <label>
                        <span>Role</span>
                        <select
                          value={draft.role}
                          disabled={isProtected}
                          onChange={(event) => {
                            const role = event.target.value
                            updateDraft(user.id, {
                              role,
                              sectionPermissions: defaultSectionPermissions(role),
                            })
                          }}
                        >
                          <option value="editor">editor</option>
                          <option value="master">master</option>
                        </select>
                      </label>

                      <label>
                        <span>Reset Password</span>
                        <input
                          type="password"
                          value={draft.password}
                          minLength={8}
                          disabled={isProtected}
                          placeholder={isProtected ? 'Protected account' : 'Leave blank to keep'}
                          onChange={(event) => updateDraft(user.id, { password: event.target.value })}
                        />
                      </label>
                    </div>

                    <label className="inline-toggle">
                      <input
                        type="checkbox"
                        checked={draft.active}
                        disabled={isProtected}
                        onChange={(event) => updateDraft(user.id, { active: event.target.checked })}
                      />
                      <span>Active account</span>
                    </label>

                    <div>
                      <h3>File permissions</h3>
                      <FilePermissionsEditor
                        files={fileNames}
                        permissions={draft.filePermissions}
                        onChange={(file, value) =>
                          updateDraft(user.id, {
                            filePermissions: {
                              ...draft.filePermissions,
                              [file]: value,
                            },
                          })
                        }
                        disabled={isProtected || draft.role === 'master'}
                      />
                    </div>

                    <div>
                      <h3>Section permissions</h3>
                      <SectionPermissionsEditor
                        value={draft.sectionPermissions}
                        onChange={(section, value) =>
                          updateDraft(user.id, {
                            sectionPermissions: {
                              ...draft.sectionPermissions,
                              [section]: value,
                            },
                          })
                        }
                        disabled={isProtected || draft.role === 'master'}
                      />
                    </div>

                    {isProtected ? <p className="muted">Protected master account cannot be edited.</p> : null}

                    {!isProtected ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => saveUser(user.id)}
                        disabled={savingIds.has(user.id)}
                      >
                        {savingIds.has(user.id) ? 'Saving...' : 'Save User'}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
