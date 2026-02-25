const MEDIA_FOLDER_OPTIONS = [
  {
    id: 'announcements',
    label: 'Announcements',
    path: 'images/announcements',
  },
  {
    id: 'blog',
    label: 'Blog',
    path: 'images/blog',
  },
  {
    id: 'store',
    label: 'Store',
    path: 'images/store',
  },
  {
    id: 'profile',
    label: 'Profile',
    path: 'images/profile',
  },
  {
    id: 'hadith-covers',
    label: 'Hadith Covers',
    path: 'images/hadith/covers',
  },
]

const DEFAULT_MEDIA_FOLDER = MEDIA_FOLDER_OPTIONS[0].path
const MEDIA_FOLDER_PATHS = MEDIA_FOLDER_OPTIONS.map((entry) => entry.path)
const MEDIA_FOLDER_SET = new Set(MEDIA_FOLDER_PATHS)

module.exports = {
  MEDIA_FOLDER_OPTIONS,
  DEFAULT_MEDIA_FOLDER,
  MEDIA_FOLDER_PATHS,
  MEDIA_FOLDER_SET,
}
