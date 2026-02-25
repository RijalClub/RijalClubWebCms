const DEFAULT_CONTENT_FILES = [
  'profile.json',
  'links.json',
  'announcements.json',
  'blog.json',
  'prayer.json',
  'store.json',
  'quran.json',
  'hadith.json',
  'contact.json',
  'cache.json',
]

const FILE_PERMISSION_LEVELS = ['none', 'read', 'write']

function resolveContentFilesFromEnv() {
  const raw = process.env.CONTENT_FILES

  if (!raw || !raw.trim()) {
    return [...DEFAULT_CONTENT_FILES]
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((file) => (file.endsWith('.json') ? file : `${file}.json`))
}

const CONTENT_FILES = resolveContentFilesFromEnv()
const CONTENT_FILE_SET = new Set(CONTENT_FILES)

module.exports = {
  DEFAULT_CONTENT_FILES,
  FILE_PERMISSION_LEVELS,
  CONTENT_FILES,
  CONTENT_FILE_SET,
}
