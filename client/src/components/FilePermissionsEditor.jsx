const PERMISSIONS = ['none', 'read', 'write']

export function createDefaultPermissions(files, fallback = 'read') {
  return files.reduce((accumulator, file) => {
    accumulator[file] = fallback
    return accumulator
  }, {})
}

export function FilePermissionsEditor({ files, permissions, onChange, disabled = false }) {
  return (
    <div className="permissions-grid">
      {files.map((file) => (
        <label key={file}>
          <span>{file}</span>
          <select
            value={permissions[file] || 'none'}
            onChange={(event) => onChange(file, event.target.value)}
            disabled={disabled}
          >
            {PERMISSIONS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  )
}
