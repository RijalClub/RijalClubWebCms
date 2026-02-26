import { Select } from './ui/select'
import { Label } from './ui/label'

const PERMISSIONS = ['none', 'read', 'write']

export function createDefaultPermissions(files, fallback = 'read') {
  return files.reduce((accumulator, file) => {
    accumulator[file] = fallback
    return accumulator
  }, {})
}

export function FilePermissionsEditor({ files, permissions, onChange, disabled = false }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {files.map((file) => (
        <div key={file} className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{file}</Label>
          <Select
            value={permissions[file] || 'none'}
            onChange={(event) => onChange(file, event.target.value)}
            disabled={disabled}
          >
            {PERMISSIONS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </Select>
        </div>
      ))}
    </div>
  )
}
