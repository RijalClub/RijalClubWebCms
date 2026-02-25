import { useEffect, useMemo, useState } from 'react'

import { api } from '../lib/api'

const VISUAL_FILE_ORDER = ['links.json', 'blog.json', 'store.json']

const LINK_RESOURCE_ICONS = [
  'book-open',
  'brain',
  'handshake',
  'hand-heart',
  'message-circle',
  'play-circle',
  'link',
]

function optionalValue(value) {
  const trimmed = String(value || '').trim()
  return trimmed ? trimmed : undefined
}

function toLines(value) {
  if (!Array.isArray(value) || value.length < 1) {
    return ''
  }

  return value.join('\n')
}

function fromLines(value) {
  return String(value || '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function toTags(value) {
  if (!Array.isArray(value) || value.length < 1) {
    return ''
  }

  return value.join(', ')
}

function fromTags(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function createLinksQuickLink() {
  return {
    id: `link-${Date.now()}`,
    title: 'New link',
    subtitle: 'Link subtitle',
    url: 'https://example.com',
    icon: 'link',
    featured: false,
  }
}

function createLinksSocial() {
  return {
    platform: 'platform',
    url: 'https://example.com',
  }
}

function createResourceSection() {
  return {
    id: `section-${Date.now()}`,
    title: 'New section',
    icon: 'link',
    description: undefined,
  }
}

function createResourceLink() {
  return {
    id: `resource-${Date.now()}`,
    title: 'New resource',
    subtitle: 'Resource subtitle',
    url: 'https://example.com',
    sectionId: 'general',
  }
}

function createBlogPost() {
  return {
    id: `post-${Date.now()}`,
    title: 'New post',
    publishedAt: new Date().toISOString().slice(0, 10),
    coverImage:
      'https://raw.githubusercontent.com/RijalClub/RijalClubWebMedia/main/assets/images/blog/fitness-post-importance.svg',
    coverAlt: 'Blog cover image',
    excerpt: 'Write a short summary for this post.',
    tags: ['Fitness'],
    paragraphs: ['Write your post here.'],
    checklist: undefined,
    html: undefined,
  }
}

function createStoreProduct() {
  return {
    id: `product-${Date.now()}`,
    title: 'New product',
    description: 'Describe this product.',
    badge: undefined,
    price: 0,
    currency: 'GBP',
    image:
      'https://raw.githubusercontent.com/RijalClub/RijalClubWebMedia/main/assets/images/store/store-hoodie.png',
    enabled: true,
    checkoutUrl: undefined,
    stripePriceId: undefined,
  }
}

function LinksEditor({ value, canWrite, onChange }) {
  if (!value) {
    return null
  }

  return (
    <div className="stack-lg">
      <section className="card stack">
        <h3>Core</h3>
        <div className="form-grid">
          <label>
            <span>Heading</span>
            <input
              type="text"
              value={value.heading || ''}
              disabled={!canWrite}
              onChange={(event) => onChange((prev) => ({ ...prev, heading: event.target.value }))}
            />
          </label>

          <label>
            <span>Description</span>
            <input
              type="text"
              value={value.description || ''}
              disabled={!canWrite}
              onChange={(event) => onChange((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
        </div>
      </section>

      <section className="card stack">
        <div className="card-header">
          <h3>Quick Links</h3>
          <button
            type="button"
            className="btn"
            disabled={!canWrite}
            onClick={() =>
              onChange((prev) => ({
                ...prev,
                quickLinks: [...(prev.quickLinks || []), createLinksQuickLink()],
              }))
            }
          >
            Add Link
          </button>
        </div>

        <div className="stack">
          {(value.quickLinks || []).map((link, index) => (
            <article className="editor-card" key={`${link.id || 'link'}-${index}`}>
              <div className="form-grid">
                <label>
                  <span>ID</span>
                  <input
                    type="text"
                    value={link.id || ''}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onChange((prev) => ({
                        ...prev,
                        quickLinks: prev.quickLinks.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, id: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </label>

                <label>
                  <span>Title</span>
                  <input
                    type="text"
                    value={link.title || ''}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onChange((prev) => ({
                        ...prev,
                        quickLinks: prev.quickLinks.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, title: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </label>

                <label>
                  <span>Subtitle</span>
                  <input
                    type="text"
                    value={link.subtitle || ''}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onChange((prev) => ({
                        ...prev,
                        quickLinks: prev.quickLinks.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, subtitle: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </label>

                <label>
                  <span>URL</span>
                  <input
                    type="url"
                    value={link.url || ''}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onChange((prev) => ({
                        ...prev,
                        quickLinks: prev.quickLinks.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, url: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </label>

                <label>
                  <span>Icon</span>
                  <input
                    type="text"
                    value={link.icon || ''}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onChange((prev) => ({
                        ...prev,
                        quickLinks: prev.quickLinks.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, icon: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </label>

                <label className="inline-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(link.featured)}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onChange((prev) => ({
                        ...prev,
                        quickLinks: prev.quickLinks.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, featured: event.target.checked } : item,
                        ),
                      }))
                    }
                  />
                  <span>Featured</span>
                </label>
              </div>

              <button
                type="button"
                className="btn btn-danger"
                disabled={!canWrite}
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    quickLinks: prev.quickLinks.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              >
                Remove
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div className="card-header">
          <h3>Social Links</h3>
          <button
            type="button"
            className="btn"
            disabled={!canWrite}
            onClick={() =>
              onChange((prev) => ({
                ...prev,
                socials: [...(prev.socials || []), createLinksSocial()],
              }))
            }
          >
            Add Social
          </button>
        </div>

        <div className="stack">
          {(value.socials || []).map((social, index) => (
            <article className="editor-card" key={`${social.platform || 'social'}-${index}`}>
              <div className="form-grid">
                <label>
                  <span>Platform</span>
                  <input
                    type="text"
                    value={social.platform || ''}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onChange((prev) => ({
                        ...prev,
                        socials: prev.socials.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, platform: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </label>

                <label>
                  <span>URL</span>
                  <input
                    type="url"
                    value={social.url || ''}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onChange((prev) => ({
                        ...prev,
                        socials: prev.socials.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, url: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </label>
              </div>

              <button
                type="button"
                className="btn btn-danger"
                disabled={!canWrite}
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    socials: prev.socials.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              >
                Remove
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div className="card-header">
          <h3>Adhan Alert</h3>
          {!value.adhanAlert ? (
            <button
              type="button"
              className="btn"
              disabled={!canWrite}
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  adhanAlert: {
                    enabled: false,
                    title: 'Adhan alert',
                    description: 'Play a short adhan reminder.',
                    audioUrl: '/audio/adhan.mp3',
                    autoPlayWindowSeconds: 30,
                  },
                }))
              }
            >
              Enable
            </button>
          ) : null}
        </div>

        {value.adhanAlert ? (
          <div className="form-grid">
            <label className="inline-toggle">
              <input
                type="checkbox"
                checked={Boolean(value.adhanAlert.enabled)}
                disabled={!canWrite}
                onChange={(event) =>
                  onChange((prev) => ({
                    ...prev,
                    adhanAlert: {
                      ...prev.adhanAlert,
                      enabled: event.target.checked,
                    },
                  }))
                }
              />
              <span>Enabled</span>
            </label>

            <label>
              <span>Title</span>
              <input
                type="text"
                value={value.adhanAlert.title || ''}
                disabled={!canWrite}
                onChange={(event) =>
                  onChange((prev) => ({
                    ...prev,
                    adhanAlert: {
                      ...prev.adhanAlert,
                      title: event.target.value,
                    },
                  }))
                }
              />
            </label>

            <label>
              <span>Description</span>
              <input
                type="text"
                value={value.adhanAlert.description || ''}
                disabled={!canWrite}
                onChange={(event) =>
                  onChange((prev) => ({
                    ...prev,
                    adhanAlert: {
                      ...prev.adhanAlert,
                      description: event.target.value,
                    },
                  }))
                }
              />
            </label>

            <label>
              <span>Audio URL / Path</span>
              <input
                type="text"
                value={value.adhanAlert.audioUrl || ''}
                disabled={!canWrite}
                onChange={(event) =>
                  onChange((prev) => ({
                    ...prev,
                    adhanAlert: {
                      ...prev.adhanAlert,
                      audioUrl: event.target.value,
                    },
                  }))
                }
              />
            </label>

            <label>
              <span>Autoplay window seconds</span>
              <input
                type="number"
                min={1}
                max={300}
                value={value.adhanAlert.autoPlayWindowSeconds || 30}
                disabled={!canWrite}
                onChange={(event) =>
                  onChange((prev) => ({
                    ...prev,
                    adhanAlert: {
                      ...prev.adhanAlert,
                      autoPlayWindowSeconds: Number(event.target.value || 30),
                    },
                  }))
                }
              />
            </label>
          </div>
        ) : (
          <p className="muted">Not enabled.</p>
        )}
      </section>

      <section className="card stack">
        <div className="card-header">
          <h3>Resource Sections</h3>
          <button
            type="button"
            className="btn"
            disabled={!canWrite}
            onClick={() =>
              onChange((prev) => ({
                ...prev,
                resourceSections: [...(prev.resourceSections || []), createResourceSection()],
              }))
            }
          >
            Add Section
          </button>
        </div>

        <div className="stack">
          {(value.resourceSections || []).map((section, index) => (
            <article className="editor-card" key={`${section.id || 'section'}-${index}`}>
              <div className="form-grid">
                <label>
                  <span>ID</span>
                  <input
                    type="text"
                    value={section.id || ''}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onChange((prev) => ({
                        ...prev,
                        resourceSections: prev.resourceSections.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, id: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </label>

                <label>
                  <span>Title</span>
                  <input
                    type="text"
                    value={section.title || ''}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onChange((prev) => ({
                        ...prev,
                        resourceSections: prev.resourceSections.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, title: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </label>

                <label>
                  <span>Icon</span>
                  <select
                    value={section.icon || 'link'}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onChange((prev) => ({
                        ...prev,
                        resourceSections: prev.resourceSections.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, icon: event.target.value } : item,
                        ),
                      }))
                    }
                  >
                    {LINK_RESOURCE_ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Description</span>
                  <input
                    type="text"
                    value={section.description || ''}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onChange((prev) => ({
                        ...prev,
                        resourceSections: prev.resourceSections.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, description: optionalValue(event.target.value) }
                            : item,
                        ),
                      }))
                    }
                  />
                </label>
              </div>

              <button
                type="button"
                className="btn btn-danger"
                disabled={!canWrite}
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    resourceSections: prev.resourceSections.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              >
                Remove
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div className="card-header">
          <h3>Resources</h3>
          <button
            type="button"
            className="btn"
            disabled={!canWrite}
            onClick={() =>
              onChange((prev) => ({
                ...prev,
                resources: [...(prev.resources || []), createResourceLink()],
              }))
            }
          >
            Add Resource
          </button>
        </div>

        <div className="stack">
          {(value.resources || []).map((resource, index) => (
            <article className="editor-card" key={`${resource.id || 'resource'}-${index}`}>
              <div className="form-grid">
                <label>
                  <span>ID</span>
                  <input
                    type="text"
                    value={resource.id || ''}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onChange((prev) => ({
                        ...prev,
                        resources: prev.resources.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, id: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </label>

                <label>
                  <span>Title</span>
                  <input
                    type="text"
                    value={resource.title || ''}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onChange((prev) => ({
                        ...prev,
                        resources: prev.resources.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, title: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </label>

                <label>
                  <span>Subtitle</span>
                  <input
                    type="text"
                    value={resource.subtitle || ''}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onChange((prev) => ({
                        ...prev,
                        resources: prev.resources.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, subtitle: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </label>

                <label>
                  <span>URL</span>
                  <input
                    type="url"
                    value={resource.url || ''}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onChange((prev) => ({
                        ...prev,
                        resources: prev.resources.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, url: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </label>

                <label>
                  <span>Section ID</span>
                  <input
                    type="text"
                    value={resource.sectionId || ''}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onChange((prev) => ({
                        ...prev,
                        resources: prev.resources.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, sectionId: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </label>
              </div>

              <button
                type="button"
                className="btn btn-danger"
                disabled={!canWrite}
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    resources: prev.resources.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              >
                Remove
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function BlogEditor({ value, canWrite, onChange, onUploadImage, uploadingAssetKey }) {
  const [postModes, setPostModes] = useState({})
  const [expandedPosts, setExpandedPosts] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const posts = value?.posts || []
  const filteredPosts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return posts.map((post, index) => ({ post, index }))
    }

    return posts
      .map((post, index) => ({ post, index }))
      .filter(({ post }) => {
        const haystack = [post.id, post.title, Array.isArray(post.tags) ? post.tags.join(' ') : '']
          .join(' ')
          .toLowerCase()
        return haystack.includes(query)
      })
  }, [posts, searchTerm])

  if (!value) {
    return null
  }

  return (
    <div className="stack-lg">
      <section className="card stack">
        <h3>Core</h3>
        <div className="form-grid">
          <label>
            <span>Kicker</span>
            <input
              type="text"
              value={value.kicker || ''}
              disabled={!canWrite}
              onChange={(event) => onChange((prev) => ({ ...prev, kicker: event.target.value }))}
            />
          </label>

          <label>
            <span>Title</span>
            <input
              type="text"
              value={value.title || ''}
              disabled={!canWrite}
              onChange={(event) => onChange((prev) => ({ ...prev, title: event.target.value }))}
            />
          </label>

          <label>
            <span>Description</span>
            <input
              type="text"
              value={value.description || ''}
              disabled={!canWrite}
              onChange={(event) => onChange((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
        </div>
      </section>

      <section className="card stack">
        <div className="card-header">
          <h3>Posts</h3>
          <button
            type="button"
            className="btn"
            disabled={!canWrite}
            onClick={() => {
              const nextPost = createBlogPost()
              const nextIndex = posts.length
              setExpandedPosts((prev) => ({ ...prev, [String(nextIndex)]: true }))
              onChange((prev) => ({ ...prev, posts: [...(prev.posts || []), nextPost] }))
            }}
          >
            Add Post
          </button>
        </div>

        <label>
          <span>Search posts</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by ID, title, or tags"
          />
        </label>

        {filteredPosts.length < 1 ? <p className="muted">No posts match your search.</p> : null}

        <div className="stack">
          {filteredPosts.map(({ post, index }) => {
            const stateKey = String(index)
            const cardKey = `${post.id || 'post'}-${index}`
            const mode = postModes[cardKey] || (post.html ? 'html' : 'structured')
            const expanded = Boolean(expandedPosts[stateKey])
            const uploadKey = `blog-${post.id || index}`
            const summaryTags = Array.isArray(post.tags) ? post.tags.join(', ') : ''

            return (
              <article className="editor-card" key={cardKey}>
                <div className="card-header compact">
                  <div className="stack-tight">
                    <h4>{post.title || `Post ${index + 1}`}</h4>
                    <p className="muted editor-subline">
                      ID: {post.id || '-'} • {post.publishedAt || 'No date'}
                      {summaryTags ? ` • ${summaryTags}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-small"
                    onClick={() => setExpandedPosts((prev) => ({ ...prev, [stateKey]: !expanded }))}
                  >
                    {expanded ? 'Collapse' : 'Edit'}
                  </button>
                </div>

                {!expanded ? null : (
                  <>
                    <div className="button-row">
                      <button
                        type="button"
                        className={`btn btn-small ${mode === 'structured' ? 'btn-primary' : ''}`}
                        onClick={() => setPostModes((prev) => ({ ...prev, [cardKey]: 'structured' }))}
                      >
                        Structured
                      </button>
                      <button
                        type="button"
                        className={`btn btn-small ${mode === 'html' ? 'btn-primary' : ''}`}
                        onClick={() => setPostModes((prev) => ({ ...prev, [cardKey]: 'html' }))}
                      >
                        HTML
                      </button>
                    </div>

                    <div className="form-grid">
                      <label>
                        <span>ID</span>
                        <input
                          type="text"
                          value={post.id || ''}
                          disabled={!canWrite}
                          onChange={(event) =>
                            onChange((prev) => ({
                              ...prev,
                              posts: prev.posts.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, id: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </label>

                      <label>
                        <span>Title</span>
                        <input
                          type="text"
                          value={post.title || ''}
                          disabled={!canWrite}
                          onChange={(event) =>
                            onChange((prev) => ({
                              ...prev,
                              posts: prev.posts.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, title: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </label>

                      <label>
                        <span>Published At</span>
                        <input
                          type="date"
                          value={post.publishedAt || ''}
                          disabled={!canWrite}
                          onChange={(event) =>
                            onChange((prev) => ({
                              ...prev,
                              posts: prev.posts.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, publishedAt: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </label>

                      <label>
                        <span>Cover Alt</span>
                        <input
                          type="text"
                          value={post.coverAlt || ''}
                          disabled={!canWrite}
                          onChange={(event) =>
                            onChange((prev) => ({
                              ...prev,
                              posts: prev.posts.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, coverAlt: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </label>

                      <label>
                        <span>Cover Image URL</span>
                        <input
                          type="text"
                          value={post.coverImage || ''}
                          disabled={!canWrite}
                          onChange={(event) =>
                            onChange((prev) => ({
                              ...prev,
                              posts: prev.posts.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, coverImage: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </label>

                      <label className="file-upload-label">
                        <span>Upload Cover (media/blog)</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={!canWrite || uploadingAssetKey === uploadKey}
                          onChange={async (event) => {
                            const uploadFile = event.target.files?.[0]
                            event.target.value = ''
                            if (!uploadFile) {
                              return
                            }

                            await onUploadImage('images/blog', uploadFile, uploadKey, (url) =>
                              onChange((prev) => ({
                                ...prev,
                                posts: prev.posts.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, coverImage: url } : item,
                                ),
                              })),
                            )
                          }}
                        />
                      </label>

                      <label>
                        <span>Tags (comma separated)</span>
                        <input
                          type="text"
                          value={toTags(post.tags)}
                          disabled={!canWrite}
                          onChange={(event) =>
                            onChange((prev) => ({
                              ...prev,
                              posts: prev.posts.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, tags: fromTags(event.target.value) } : item,
                              ),
                            }))
                          }
                        />
                      </label>
                    </div>

                    <label>
                      <span>Excerpt</span>
                      <textarea
                        value={post.excerpt || ''}
                        disabled={!canWrite}
                        onChange={(event) =>
                          onChange((prev) => ({
                            ...prev,
                            posts: prev.posts.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, excerpt: event.target.value } : item,
                            ),
                          }))
                        }
                        className="json-small"
                      />
                    </label>

                    {mode === 'html' ? (
                      <label>
                        <span>Post HTML (optional)</span>
                        <textarea
                          value={post.html || ''}
                          disabled={!canWrite}
                          onChange={(event) =>
                            onChange((prev) => ({
                              ...prev,
                              posts: prev.posts.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, html: optionalValue(event.target.value) } : item,
                              ),
                            }))
                          }
                          className="json-textarea"
                        />
                      </label>
                    ) : (
                      <>
                        <label>
                          <span>Paragraphs (one per line)</span>
                          <textarea
                            value={toLines(post.paragraphs)}
                            disabled={!canWrite}
                            onChange={(event) =>
                              onChange((prev) => ({
                                ...prev,
                                posts: prev.posts.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, paragraphs: fromLines(event.target.value) } : item,
                                ),
                              }))
                            }
                            className="json-textarea"
                          />
                        </label>

                        <label>
                          <span>Checklist (one per line, optional)</span>
                          <textarea
                            value={toLines(post.checklist)}
                            disabled={!canWrite}
                            onChange={(event) =>
                              onChange((prev) => ({
                                ...prev,
                                posts: prev.posts.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        checklist: (() => {
                                          const list = fromLines(event.target.value)
                                          return list.length > 0 ? list : undefined
                                        })(),
                                      }
                                    : item,
                                ),
                              }))
                            }
                            className="json-small"
                          />
                        </label>
                      </>
                    )}

                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={!canWrite}
                      onClick={() =>
                        onChange((prev) => ({
                          ...prev,
                          posts: prev.posts.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                    >
                      Remove Post
                    </button>
                  </>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function StoreEditor({ value, canWrite, onChange, onUploadImage, uploadingAssetKey }) {
  const [expandedProducts, setExpandedProducts] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const products = value?.products || []
  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return products.map((product, index) => ({ product, index }))
    }

    return products
      .map((product, index) => ({ product, index }))
      .filter(({ product }) => {
        const haystack = [product.id, product.title, product.badge, product.currency, product.description]
          .join(' ')
          .toLowerCase()
        return haystack.includes(query)
      })
  }, [products, searchTerm])

  if (!value) {
    return null
  }

  return (
    <div className="stack-lg">
      <section className="card stack">
        <h3>Store Core</h3>
        <div className="form-grid">
          <label>
            <span>Title</span>
            <input
              type="text"
              value={value.title || ''}
              disabled={!canWrite}
              onChange={(event) => onChange((prev) => ({ ...prev, title: event.target.value }))}
            />
          </label>

          <label>
            <span>Description</span>
            <input
              type="text"
              value={value.description || ''}
              disabled={!canWrite}
              onChange={(event) => onChange((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>

          <label>
            <span>Closed Message</span>
            <input
              type="text"
              value={value.closedMessage || ''}
              disabled={!canWrite}
              onChange={(event) => onChange((prev) => ({ ...prev, closedMessage: event.target.value }))}
            />
          </label>

          <label className="inline-toggle">
            <input
              type="checkbox"
              checked={Boolean(value.isOpen)}
              disabled={!canWrite}
              onChange={(event) => onChange((prev) => ({ ...prev, isOpen: event.target.checked }))}
            />
            <span>Store Open</span>
          </label>
        </div>
      </section>

      <section className="card stack">
        <h3>Stripe</h3>
        <div className="form-grid">
          <label className="inline-toggle">
            <input
              type="checkbox"
              checked={Boolean(value?.stripe?.enabled)}
              disabled={!canWrite}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  stripe: {
                    ...prev.stripe,
                    enabled: event.target.checked,
                  },
                }))
              }
            />
            <span>Enabled</span>
          </label>

          <label>
            <span>Publishable Key (optional)</span>
            <input
              type="text"
              value={value?.stripe?.publishableKey || ''}
              disabled={!canWrite}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  stripe: {
                    ...prev.stripe,
                    publishableKey: optionalValue(event.target.value),
                  },
                }))
              }
            />
          </label>

          <label>
            <span>Checkout Endpoint (optional)</span>
            <input
              type="url"
              value={value?.stripe?.checkoutEndpoint || ''}
              disabled={!canWrite}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  stripe: {
                    ...prev.stripe,
                    checkoutEndpoint: optionalValue(event.target.value),
                  },
                }))
              }
            />
          </label>

          <label>
            <span>Success URL (optional)</span>
            <input
              type="url"
              value={value?.stripe?.successUrl || ''}
              disabled={!canWrite}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  stripe: {
                    ...prev.stripe,
                    successUrl: optionalValue(event.target.value),
                  },
                }))
              }
            />
          </label>

          <label>
            <span>Cancel URL (optional)</span>
            <input
              type="url"
              value={value?.stripe?.cancelUrl || ''}
              disabled={!canWrite}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  stripe: {
                    ...prev.stripe,
                    cancelUrl: optionalValue(event.target.value),
                  },
                }))
              }
            />
          </label>
        </div>
      </section>

      <section className="card stack">
        <div className="card-header">
          <h3>Products</h3>
          <button
            type="button"
            className="btn"
            disabled={!canWrite}
            onClick={() => {
              const nextProduct = createStoreProduct()
              const nextIndex = products.length
              setExpandedProducts((prev) => ({ ...prev, [String(nextIndex)]: true }))
              onChange((prev) => ({ ...prev, products: [...(prev.products || []), nextProduct] }))
            }}
          >
            Add Product
          </button>
        </div>

        <label>
          <span>Search products</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by ID, title, badge, currency, or description"
          />
        </label>

        {filteredProducts.length < 1 ? <p className="muted">No products match your search.</p> : null}

        <div className="stack">
          {filteredProducts.map(({ product, index }) => {
            const stateKey = String(index)
            const cardKey = `${product.id || 'product'}-${index}`
            const expanded = Boolean(expandedProducts[stateKey])
            const uploadKey = `store-${product.id || index}`

            return (
              <article className="editor-card" key={cardKey}>
                <div className="card-header compact">
                  <div className="stack-tight">
                    <h4>{product.title || `Product ${index + 1}`}</h4>
                    <p className="muted editor-subline">
                      ID: {product.id || '-'} • {product.currency || '-'} {Number.isFinite(product.price) ? product.price : 0}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-small"
                    onClick={() => setExpandedProducts((prev) => ({ ...prev, [stateKey]: !expanded }))}
                  >
                    {expanded ? 'Collapse' : 'Edit'}
                  </button>
                </div>

                {!expanded ? null : (
                  <>
                    <div className="form-grid">
                      <label>
                        <span>ID</span>
                        <input
                          type="text"
                          value={product.id || ''}
                          disabled={!canWrite}
                          onChange={(event) =>
                            onChange((prev) => ({
                              ...prev,
                              products: prev.products.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, id: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </label>

                      <label>
                        <span>Title</span>
                        <input
                          type="text"
                          value={product.title || ''}
                          disabled={!canWrite}
                          onChange={(event) =>
                            onChange((prev) => ({
                              ...prev,
                              products: prev.products.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, title: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </label>

                      <label>
                        <span>Badge (optional)</span>
                        <input
                          type="text"
                          value={product.badge || ''}
                          disabled={!canWrite}
                          onChange={(event) =>
                            onChange((prev) => ({
                              ...prev,
                              products: prev.products.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, badge: optionalValue(event.target.value) } : item,
                              ),
                            }))
                          }
                        />
                      </label>

                      <label>
                        <span>Price</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={Number.isFinite(product.price) ? product.price : 0}
                          disabled={!canWrite}
                          onChange={(event) =>
                            onChange((prev) => ({
                              ...prev,
                              products: prev.products.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      price: Math.max(0, Number.parseFloat(event.target.value || '0') || 0),
                                    }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </label>

                      <label>
                        <span>Currency</span>
                        <input
                          type="text"
                          value={product.currency || ''}
                          disabled={!canWrite}
                          onChange={(event) =>
                            onChange((prev) => ({
                              ...prev,
                              products: prev.products.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, currency: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </label>

                      <label>
                        <span>Image URL</span>
                        <input
                          type="text"
                          value={product.image || ''}
                          disabled={!canWrite}
                          onChange={(event) =>
                            onChange((prev) => ({
                              ...prev,
                              products: prev.products.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, image: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </label>

                      <label className="file-upload-label">
                        <span>Upload Product Image (media/store)</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={!canWrite || uploadingAssetKey === uploadKey}
                          onChange={async (event) => {
                            const uploadFile = event.target.files?.[0]
                            event.target.value = ''
                            if (!uploadFile) {
                              return
                            }

                            await onUploadImage('images/store', uploadFile, uploadKey, (url) =>
                              onChange((prev) => ({
                                ...prev,
                                products: prev.products.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, image: url } : item,
                                ),
                              })),
                            )
                          }}
                        />
                      </label>

                      <label>
                        <span>Checkout URL (optional)</span>
                        <input
                          type="url"
                          value={product.checkoutUrl || ''}
                          disabled={!canWrite}
                          onChange={(event) =>
                            onChange((prev) => ({
                              ...prev,
                              products: prev.products.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      checkoutUrl: optionalValue(event.target.value),
                                    }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </label>

                      <label>
                        <span>Stripe Price ID (optional)</span>
                        <input
                          type="text"
                          value={product.stripePriceId || ''}
                          disabled={!canWrite}
                          onChange={(event) =>
                            onChange((prev) => ({
                              ...prev,
                              products: prev.products.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      stripePriceId: optionalValue(event.target.value),
                                    }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </label>

                      <label className="inline-toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(product.enabled)}
                          disabled={!canWrite}
                          onChange={(event) =>
                            onChange((prev) => ({
                              ...prev,
                              products: prev.products.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, enabled: event.target.checked } : item,
                              ),
                            }))
                          }
                        />
                        <span>Enabled</span>
                      </label>
                    </div>

                    <label>
                      <span>Description</span>
                      <textarea
                        value={product.description || ''}
                        disabled={!canWrite}
                        onChange={(event) =>
                          onChange((prev) => ({
                            ...prev,
                            products: prev.products.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, description: event.target.value } : item,
                            ),
                          }))
                        }
                        className="json-small"
                      />
                    </label>

                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={!canWrite}
                      onClick={() =>
                        onChange((prev) => ({
                          ...prev,
                          products: prev.products.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                    >
                      Remove Product
                    </button>
                  </>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export function VisualContentEditorPanel({ files, sectionPermission = 'write', onNotify, onDirtyChange }) {
  const [activeFile, setActiveFile] = useState('links.json')
  const [drafts, setDrafts] = useState({})
  const [savedDrafts, setSavedDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadingAssetKey, setUploadingAssetKey] = useState('')
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [pendingFile, setPendingFile] = useState('')

  const visualFiles = useMemo(
    () =>
      VISUAL_FILE_ORDER.map((name) => files.find((entry) => entry.file === name)).filter(
        (entry) => entry && entry.permission !== 'none',
      ),
    [files],
  )

  const filePermissions = useMemo(() => {
    const map = {}
    for (const entry of visualFiles) {
      map[entry.file] = entry.permission
    }
    return map
  }, [visualFiles])

  useEffect(() => {
    if (visualFiles.length < 1) {
      setActiveFile('')
      return
    }

    setActiveFile((prev) => (visualFiles.some((entry) => entry.file === prev) ? prev : visualFiles[0].file))
  }, [visualFiles])

  useEffect(() => {
    if (visualFiles.length < 1) {
      setLoading(false)
      setDrafts({})
      setSavedDrafts({})
      return
    }

    let cancelled = false

    async function loadAll() {
      setLoading(true)
      setError('')

      try {
        const payloads = await Promise.all(
          visualFiles.map((entry) => api.getVisualContent(entry.file).then((payload) => [entry.file, payload.content])),
        )

        if (cancelled) {
          return
        }

        const nextDrafts = Object.fromEntries(payloads)
        setDrafts(nextDrafts)
        setSavedDrafts(JSON.parse(JSON.stringify(nextDrafts)))
      } catch (apiError) {
        if (!cancelled) {
          setError(apiError.message || 'Failed loading visual editor content.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadAll()

    return () => {
      cancelled = true
    }
  }, [visualFiles])

  const activeDraft = activeFile ? drafts[activeFile] : null
  const savedDraft = activeFile ? savedDrafts[activeFile] : null
  const dirty = JSON.stringify(activeDraft || null) !== JSON.stringify(savedDraft || null)
  const canWrite = filePermissions[activeFile] === 'write' && sectionPermission === 'write'

  useEffect(() => {
    onDirtyChange?.(dirty)
    return () => onDirtyChange?.(false)
  }, [dirty, onDirtyChange])

  useEffect(() => {
    if (!dirty) {
      return undefined
    }

    const onBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  function updateDraft(fileName, updater) {
    setDrafts((prev) => {
      const current = prev[fileName]
      if (!current) {
        return prev
      }

      const nextValue = typeof updater === 'function' ? updater(current) : updater
      return {
        ...prev,
        [fileName]: nextValue,
      }
    })
  }

  function updateActiveDraft(updater) {
    updateDraft(activeFile, updater)
  }

  async function uploadImage(folder, file, key, applyUrl) {
    if (!file) {
      return
    }

    setUploadingAssetKey(key)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      const payload = await api.uploadMedia(formData)
      applyUrl(payload.url)
      onNotify({ kind: 'success', message: 'Media uploaded and linked.' })
    } catch (apiError) {
      onNotify({ kind: 'error', message: apiError.message || 'Upload failed.' })
    } finally {
      setUploadingAssetKey('')
    }
  }

  async function saveActiveFile() {
    if (!activeFile || !canWrite) {
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = await api.saveVisualContent(activeFile, { json: activeDraft })
      const nextContent = payload.content

      setDrafts((prev) => ({
        ...prev,
        [activeFile]: nextContent,
      }))

      setSavedDrafts((prev) => ({
        ...prev,
        [activeFile]: JSON.parse(JSON.stringify(nextContent)),
      }))

      onNotify({ kind: 'success', message: `${activeFile} published.` })
    } catch (apiError) {
      setError(apiError.message || 'Failed publishing visual editor changes.')
    } finally {
      setSaving(false)
    }
  }

  function resetActiveFile() {
    if (!activeFile || !savedDrafts[activeFile]) {
      return
    }

    setDrafts((prev) => ({
      ...prev,
      [activeFile]: JSON.parse(JSON.stringify(savedDrafts[activeFile])),
    }))
    setError('')
  }

  function requestSwitchFile(fileName) {
    if (!fileName || fileName === activeFile) {
      return
    }

    if (dirty) {
      setPendingFile(fileName)
      setShowLeaveModal(true)
      return
    }

    setActiveFile(fileName)
  }

  function confirmSwitchFile() {
    if (pendingFile) {
      resetActiveFile()
      setActiveFile(pendingFile)
    }

    setPendingFile('')
    setShowLeaveModal(false)
  }

  if (visualFiles.length < 1) {
    return (
      <section className="card">
        <h2>Visual Content Editor</h2>
        <p className="muted">No visual editor files are available with your current permissions.</p>
      </section>
    )
  }

  return (
    <div className="stack-lg">
      <section className="card stack">
        <div className="card-header">
          <div>
            <h2>Visual Content Editor</h2>
            <p className="muted">Edit links, blog, and store with a form-based workflow.</p>
          </div>

          <div className="button-row">
            <button type="button" className="btn" onClick={resetActiveFile} disabled={!dirty || loading || saving}>
              Revert
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveActiveFile}
              disabled={!canWrite || !dirty || loading || saving}
            >
              {saving ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="view-tabs compact-tabs">
          {visualFiles.map((entry) => (
            <button
              key={entry.file}
              type="button"
              className={`btn ${entry.file === activeFile ? 'btn-primary' : ''}`}
              onClick={() => requestSwitchFile(entry.file)}
            >
              {entry.file}
            </button>
          ))}
        </div>

        <p className="muted">
          Permission: <strong>{filePermissions[activeFile]}</strong> • Section: <strong>{sectionPermission}</strong> •{' '}
          {dirty ? 'Unsaved changes' : 'Saved'}
        </p>
      </section>

      {loading ? <p className="muted">Loading editor data...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error && activeFile === 'links.json' ? (
        <LinksEditor
          value={activeDraft}
          canWrite={canWrite}
          onChange={(updater) => updateActiveDraft(updater)}
        />
      ) : null}

      {!loading && !error && activeFile === 'blog.json' ? (
        <BlogEditor
          value={activeDraft}
          canWrite={canWrite}
          onChange={(updater) => updateActiveDraft(updater)}
          onUploadImage={uploadImage}
          uploadingAssetKey={uploadingAssetKey}
        />
      ) : null}

      {!loading && !error && activeFile === 'store.json' ? (
        <StoreEditor
          value={activeDraft}
          canWrite={canWrite}
          onChange={(updater) => updateActiveDraft(updater)}
          onUploadImage={uploadImage}
          uploadingAssetKey={uploadingAssetKey}
        />
      ) : null}

      {showLeaveModal ? (
        <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Discard changes">
          <div
            className="modal-backdrop"
            onClick={() => {
              setPendingFile('')
              setShowLeaveModal(false)
            }}
          />
          <section className="modal-card">
            <h3>Unsaved Changes</h3>
            <p>Changes in this visual editor section are not published yet. Leaving now will discard them.</p>
            <div className="button-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setPendingFile('')
                  setShowLeaveModal(false)
                }}
              >
                Stay
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmSwitchFile}>
                Leave Without Publishing
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
