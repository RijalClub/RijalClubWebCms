import { useEffect, useMemo, useState } from 'react'
import {
  RotateCcw, Send, Plus, Trash2, Search, ChevronDown, ChevronRight,
  Link2, Share2, Bell, BookOpen, ShoppingBag, CreditCard, AlertTriangle,
  FileText, ImageIcon,
} from 'lucide-react'

import { api } from '../lib/api'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select } from './ui/select'
import { Textarea } from './ui/textarea'
import { Switch } from './ui/switch'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { DialogContent, DialogFooter } from './ui/dialog'

const VISUAL_FILE_ORDER = ['links.json', 'blog.json', 'store.json']

const LINK_RESOURCE_ICONS = [
  'book-open', 'brain', 'handshake', 'hand-heart', 'message-circle', 'play-circle', 'link',
]

function optionalValue(value) {
  const trimmed = String(value || '').trim()
  return trimmed ? trimmed : undefined
}

function toLines(value) {
  if (!Array.isArray(value) || value.length < 1) return ''
  return value.join('\n')
}

function fromLines(value) {
  return String(value || '').split('\n').map((e) => e.trim()).filter(Boolean)
}

function toTags(value) {
  if (!Array.isArray(value) || value.length < 1) return ''
  return value.join(', ')
}

function fromTags(value) {
  return String(value || '').split(',').map((e) => e.trim()).filter(Boolean)
}

function createLinksQuickLink() {
  return { id: `link-${Date.now()}`, title: 'New link', subtitle: 'Link subtitle', url: 'https://example.com', icon: 'link', featured: false }
}
function createLinksSocial() {
  return { platform: 'platform', url: 'https://example.com' }
}
function createResourceSection() {
  return { id: `section-${Date.now()}`, title: 'New section', icon: 'link', description: undefined }
}
function createResourceLink() {
  return { id: `resource-${Date.now()}`, title: 'New resource', subtitle: 'Resource subtitle', url: 'https://example.com', sectionId: 'general' }
}
function createBlogPost() {
  return {
    id: `post-${Date.now()}`, title: 'New post', publishedAt: new Date().toISOString().slice(0, 10),
    coverImage: 'https://raw.githubusercontent.com/RijalClub/RijalClubWebMedia/main/assets/images/blog/fitness-post-importance.svg',
    coverAlt: 'Blog cover image', excerpt: 'Write a short summary for this post.', tags: ['Fitness'],
    paragraphs: ['Write your post here.'], checklist: undefined, html: undefined,
  }
}
function createStoreProduct() {
  return {
    id: `product-${Date.now()}`, title: 'New product', description: 'Describe this product.', badge: undefined,
    price: 0, currency: 'GBP',
    image: 'https://raw.githubusercontent.com/RijalClub/RijalClubWebMedia/main/assets/images/store/store-hoodie.png',
    enabled: true, checkoutUrl: undefined, stripePriceId: undefined,
  }
}

/* ── Field helper ── */
function Field({ label, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

/* ── Collapsible item card ── */
function ItemCard({ title, subtitle, expanded, onToggle, onRemove, canWrite, children }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-secondary/50 cursor-pointer">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {expanded && (
        <div className="border-t border-border p-3 space-y-4 bg-muted/20">
          {children}
          {canWrite && (
            <Button variant="destructive" size="sm" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Links Editor
   ══════════════════════════════════════════════════════ */
function LinksEditor({ value, canWrite, onChange }) {
  if (!value) return null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-3"><CardTitle className="text-sm flex items-center gap-2"><Link2 className="h-4 w-4" /> Core</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Heading"><Input type="text" value={value.heading || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, heading: e.target.value }))} /></Field>
            <Field label="Description"><Input type="text" value={value.description || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, description: e.target.value }))} /></Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Link2 className="h-4 w-4" /> Quick Links</CardTitle>
            <Button variant="outline" size="sm" disabled={!canWrite} onClick={() => onChange((p) => ({ ...p, quickLinks: [...(p.quickLinks || []), createLinksQuickLink()] }))}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          {(value.quickLinks || []).map((link, index) => (
            <div key={`${link.id || 'link'}-${index}`} className="rounded-lg border border-border p-3 space-y-3 bg-muted/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Field label="ID"><Input type="text" value={link.id || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, quickLinks: p.quickLinks.map((i, idx) => idx === index ? { ...i, id: e.target.value } : i) }))} /></Field>
                <Field label="Title"><Input type="text" value={link.title || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, quickLinks: p.quickLinks.map((i, idx) => idx === index ? { ...i, title: e.target.value } : i) }))} /></Field>
                <Field label="Subtitle"><Input type="text" value={link.subtitle || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, quickLinks: p.quickLinks.map((i, idx) => idx === index ? { ...i, subtitle: e.target.value } : i) }))} /></Field>
                <Field label="URL"><Input type="url" value={link.url || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, quickLinks: p.quickLinks.map((i, idx) => idx === index ? { ...i, url: e.target.value } : i) }))} /></Field>
                <Field label="Icon"><Input type="text" value={link.icon || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, quickLinks: p.quickLinks.map((i, idx) => idx === index ? { ...i, icon: e.target.value } : i) }))} /></Field>
                <div className="flex items-end gap-3 pb-0.5">
                  <div className="flex items-center gap-2">
                    <Switch checked={Boolean(link.featured)} onChange={(v) => onChange((p) => ({ ...p, quickLinks: p.quickLinks.map((i, idx) => idx === index ? { ...i, featured: v } : i) }))} disabled={!canWrite} />
                    <Label className="text-xs">Featured</Label>
                  </div>
                </div>
              </div>
              {canWrite && <Button variant="destructive" size="sm" onClick={() => onChange((p) => ({ ...p, quickLinks: p.quickLinks.filter((_, idx) => idx !== index) }))}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Share2 className="h-4 w-4" /> Social Links</CardTitle>
            <Button variant="outline" size="sm" disabled={!canWrite} onClick={() => onChange((p) => ({ ...p, socials: [...(p.socials || []), createLinksSocial()] }))}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          {(value.socials || []).map((social, index) => (
            <div key={`${social.platform || 'social'}-${index}`} className="rounded-lg border border-border p-3 space-y-3 bg-muted/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Platform"><Input type="text" value={social.platform || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, socials: p.socials.map((i, idx) => idx === index ? { ...i, platform: e.target.value } : i) }))} /></Field>
                <Field label="URL"><Input type="url" value={social.url || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, socials: p.socials.map((i, idx) => idx === index ? { ...i, url: e.target.value } : i) }))} /></Field>
              </div>
              {canWrite && <Button variant="destructive" size="sm" onClick={() => onChange((p) => ({ ...p, socials: p.socials.filter((_, idx) => idx !== index) }))}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> Adhan Alert</CardTitle>
            {!value.adhanAlert && <Button variant="outline" size="sm" disabled={!canWrite} onClick={() => onChange((p) => ({ ...p, adhanAlert: { enabled: false, title: 'Adhan alert', description: 'Play a short adhan reminder.', audioUrl: '/audio/adhan.mp3', autoPlayWindowSeconds: 30 } }))}>Enable</Button>}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {value.adhanAlert ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch checked={Boolean(value.adhanAlert.enabled)} onChange={(v) => onChange((p) => ({ ...p, adhanAlert: { ...p.adhanAlert, enabled: v } }))} disabled={!canWrite} />
                <Label className="text-xs">Enabled</Label>
              </div>
              <Field label="Title"><Input type="text" value={value.adhanAlert.title || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, adhanAlert: { ...p.adhanAlert, title: e.target.value } }))} /></Field>
              <Field label="Description"><Input type="text" value={value.adhanAlert.description || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, adhanAlert: { ...p.adhanAlert, description: e.target.value } }))} /></Field>
              <Field label="Audio URL / Path"><Input type="text" value={value.adhanAlert.audioUrl || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, adhanAlert: { ...p.adhanAlert, audioUrl: e.target.value } }))} /></Field>
              <Field label="Autoplay window (s)"><Input type="number" min={1} max={300} value={value.adhanAlert.autoPlayWindowSeconds || 30} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, adhanAlert: { ...p.adhanAlert, autoPlayWindowSeconds: Number(e.target.value || 30) } }))} /></Field>
            </div>
          ) : <p className="text-sm text-muted-foreground">Not enabled.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" /> Resource Sections</CardTitle>
            <Button variant="outline" size="sm" disabled={!canWrite} onClick={() => onChange((p) => ({ ...p, resourceSections: [...(p.resourceSections || []), createResourceSection()] }))}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          {(value.resourceSections || []).map((section, index) => (
            <div key={`${section.id || 'section'}-${index}`} className="rounded-lg border border-border p-3 space-y-3 bg-muted/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Field label="ID"><Input type="text" value={section.id || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, resourceSections: p.resourceSections.map((i, idx) => idx === index ? { ...i, id: e.target.value } : i) }))} /></Field>
                <Field label="Title"><Input type="text" value={section.title || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, resourceSections: p.resourceSections.map((i, idx) => idx === index ? { ...i, title: e.target.value } : i) }))} /></Field>
                <Field label="Icon">
                  <Select value={section.icon || 'link'} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, resourceSections: p.resourceSections.map((i, idx) => idx === index ? { ...i, icon: e.target.value } : i) }))}>
                    {LINK_RESOURCE_ICONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                  </Select>
                </Field>
                <Field label="Description"><Input type="text" value={section.description || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, resourceSections: p.resourceSections.map((i, idx) => idx === index ? { ...i, description: optionalValue(e.target.value) } : i) }))} /></Field>
              </div>
              {canWrite && <Button variant="destructive" size="sm" onClick={() => onChange((p) => ({ ...p, resourceSections: p.resourceSections.filter((_, idx) => idx !== index) }))}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" /> Resources</CardTitle>
            <Button variant="outline" size="sm" disabled={!canWrite} onClick={() => onChange((p) => ({ ...p, resources: [...(p.resources || []), createResourceLink()] }))}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          {(value.resources || []).map((resource, index) => (
            <div key={`${resource.id || 'resource'}-${index}`} className="rounded-lg border border-border p-3 space-y-3 bg-muted/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Field label="ID"><Input type="text" value={resource.id || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, resources: p.resources.map((i, idx) => idx === index ? { ...i, id: e.target.value } : i) }))} /></Field>
                <Field label="Title"><Input type="text" value={resource.title || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, resources: p.resources.map((i, idx) => idx === index ? { ...i, title: e.target.value } : i) }))} /></Field>
                <Field label="Subtitle"><Input type="text" value={resource.subtitle || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, resources: p.resources.map((i, idx) => idx === index ? { ...i, subtitle: e.target.value } : i) }))} /></Field>
                <Field label="URL"><Input type="url" value={resource.url || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, resources: p.resources.map((i, idx) => idx === index ? { ...i, url: e.target.value } : i) }))} /></Field>
                <Field label="Section ID"><Input type="text" value={resource.sectionId || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, resources: p.resources.map((i, idx) => idx === index ? { ...i, sectionId: e.target.value } : i) }))} /></Field>
              </div>
              {canWrite && <Button variant="destructive" size="sm" onClick={() => onChange((p) => ({ ...p, resources: p.resources.filter((_, idx) => idx !== index) }))}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Blog Editor
   ══════════════════════════════════════════════════════ */
function BlogEditor({ value, canWrite, onChange, onUploadImage, uploadingAssetKey }) {
  const [postModes, setPostModes] = useState({})
  const [expandedPosts, setExpandedPosts] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const posts = value?.posts || []
  const filteredPosts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return posts.map((post, index) => ({ post, index }))
    return posts.map((post, index) => ({ post, index })).filter(({ post }) => {
      const haystack = [post.id, post.title, Array.isArray(post.tags) ? post.tags.join(' ') : ''].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [posts, searchTerm])

  if (!value) return null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-3"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Core</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Kicker"><Input type="text" value={value.kicker || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, kicker: e.target.value }))} /></Field>
            <Field label="Title"><Input type="text" value={value.title || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, title: e.target.value }))} /></Field>
            <Field label="Description"><Input type="text" value={value.description || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, description: e.target.value }))} /></Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Posts ({posts.length})</CardTitle>
            <Button variant="outline" size="sm" disabled={!canWrite} onClick={() => {
              const np = createBlogPost(); const ni = posts.length
              setExpandedPosts((p) => ({ ...p, [String(ni)]: true }))
              onChange((p) => ({ ...p, posts: [...(p.posts || []), np] }))
            }}>
              <Plus className="h-3.5 w-3.5" /> Add Post
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by ID, title, or tags" className="pl-9" />
          </div>

          {filteredPosts.length < 1 && <p className="text-sm text-muted-foreground py-4 text-center">No posts match your search.</p>}

          {filteredPosts.map(({ post, index }) => {
            const stateKey = String(index)
            const cardKey = `${post.id || 'post'}-${index}`
            const mode = postModes[cardKey] || (post.html ? 'html' : 'structured')
            const expanded = Boolean(expandedPosts[stateKey])
            const uploadKey = `blog-${post.id || index}`
            const summaryTags = Array.isArray(post.tags) ? post.tags.join(', ') : ''

            return (
              <ItemCard
                key={cardKey}
                title={post.title || `Post ${index + 1}`}
                subtitle={`ID: ${post.id || '-'} \u00B7 ${post.publishedAt || 'No date'}${summaryTags ? ` \u00B7 ${summaryTags}` : ''}`}
                expanded={expanded}
                onToggle={() => setExpandedPosts((p) => ({ ...p, [stateKey]: !expanded }))}
                onRemove={() => onChange((p) => ({ ...p, posts: p.posts.filter((_, idx) => idx !== index) }))}
                canWrite={canWrite}
              >
                <div className="flex gap-1">
                  <Button variant={mode === 'structured' ? 'default' : 'outline'} size="sm" onClick={() => setPostModes((p) => ({ ...p, [cardKey]: 'structured' }))}>Structured</Button>
                  <Button variant={mode === 'html' ? 'default' : 'outline'} size="sm" onClick={() => setPostModes((p) => ({ ...p, [cardKey]: 'html' }))}>HTML</Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Field label="ID"><Input type="text" value={post.id || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, posts: p.posts.map((i, idx) => idx === index ? { ...i, id: e.target.value } : i) }))} /></Field>
                  <Field label="Title"><Input type="text" value={post.title || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, posts: p.posts.map((i, idx) => idx === index ? { ...i, title: e.target.value } : i) }))} /></Field>
                  <Field label="Published At"><Input type="date" value={post.publishedAt || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, posts: p.posts.map((i, idx) => idx === index ? { ...i, publishedAt: e.target.value } : i) }))} /></Field>
                  <Field label="Cover Alt"><Input type="text" value={post.coverAlt || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, posts: p.posts.map((i, idx) => idx === index ? { ...i, coverAlt: e.target.value } : i) }))} /></Field>
                  <Field label="Cover Image URL"><Input type="text" value={post.coverImage || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, posts: p.posts.map((i, idx) => idx === index ? { ...i, coverImage: e.target.value } : i) }))} /></Field>
                  <Field label="Upload Cover">
                    <Input type="file" accept="image/*" disabled={!canWrite || uploadingAssetKey === uploadKey}
                      onChange={async (e) => {
                        const f = e.target.files?.[0]; e.target.value = ''
                        if (!f) return
                        await onUploadImage('images/blog', f, uploadKey, (url) => onChange((p) => ({ ...p, posts: p.posts.map((i, idx) => idx === index ? { ...i, coverImage: url } : i) })))
                      }} />
                  </Field>
                  <Field label="Tags (comma separated)" className="sm:col-span-2 lg:col-span-3">
                    <Input type="text" value={toTags(post.tags)} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, posts: p.posts.map((i, idx) => idx === index ? { ...i, tags: fromTags(e.target.value) } : i) }))} />
                  </Field>
                </div>

                <Field label="Excerpt">
                  <Textarea value={post.excerpt || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, posts: p.posts.map((i, idx) => idx === index ? { ...i, excerpt: e.target.value } : i) }))} className="min-h-[80px]" />
                </Field>

                {mode === 'html' ? (
                  <Field label="Post HTML (optional)">
                    <Textarea value={post.html || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, posts: p.posts.map((i, idx) => idx === index ? { ...i, html: optionalValue(e.target.value) } : i) }))} className="font-mono text-xs min-h-[200px]" />
                  </Field>
                ) : (
                  <>
                    <Field label="Paragraphs (one per line)">
                      <Textarea value={toLines(post.paragraphs)} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, posts: p.posts.map((i, idx) => idx === index ? { ...i, paragraphs: fromLines(e.target.value) } : i) }))} className="min-h-[200px]" />
                    </Field>
                    <Field label="Checklist (one per line, optional)">
                      <Textarea value={toLines(post.checklist)} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, posts: p.posts.map((i, idx) => idx === index ? { ...i, checklist: (() => { const l = fromLines(e.target.value); return l.length > 0 ? l : undefined })() } : i) }))} className="min-h-[80px]" />
                    </Field>
                  </>
                )}
              </ItemCard>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Store Editor
   ══════════════════════════════════════════════════════ */
function StoreEditor({ value, canWrite, onChange, onUploadImage, uploadingAssetKey }) {
  const [expandedProducts, setExpandedProducts] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const products = value?.products || []
  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return products.map((product, index) => ({ product, index }))
    return products.map((product, index) => ({ product, index })).filter(({ product }) => {
      const haystack = [product.id, product.title, product.badge, product.currency, product.description].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [products, searchTerm])

  if (!value) return null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-3"><CardTitle className="text-sm flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Store Core</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Title"><Input type="text" value={value.title || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, title: e.target.value }))} /></Field>
            <Field label="Description"><Input type="text" value={value.description || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, description: e.target.value }))} /></Field>
            <Field label="Closed Message"><Input type="text" value={value.closedMessage || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, closedMessage: e.target.value }))} /></Field>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Switch checked={Boolean(value.isOpen)} onChange={(v) => onChange((p) => ({ ...p, isOpen: v }))} disabled={!canWrite} />
            <Label className="text-xs">Store Open</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3"><CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4" /> Stripe</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch checked={Boolean(value?.stripe?.enabled)} onChange={(v) => onChange((p) => ({ ...p, stripe: { ...p.stripe, enabled: v } }))} disabled={!canWrite} />
              <Label className="text-xs">Enabled</Label>
            </div>
            <Field label="Publishable Key"><Input type="text" value={value?.stripe?.publishableKey || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, stripe: { ...p.stripe, publishableKey: optionalValue(e.target.value) } }))} /></Field>
            <Field label="Checkout Endpoint"><Input type="url" value={value?.stripe?.checkoutEndpoint || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, stripe: { ...p.stripe, checkoutEndpoint: optionalValue(e.target.value) } }))} /></Field>
            <Field label="Success URL"><Input type="url" value={value?.stripe?.successUrl || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, stripe: { ...p.stripe, successUrl: optionalValue(e.target.value) } }))} /></Field>
            <Field label="Cancel URL"><Input type="url" value={value?.stripe?.cancelUrl || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, stripe: { ...p.stripe, cancelUrl: optionalValue(e.target.value) } }))} /></Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Products ({products.length})</CardTitle>
            <Button variant="outline" size="sm" disabled={!canWrite} onClick={() => {
              const np = createStoreProduct(); const ni = products.length
              setExpandedProducts((p) => ({ ...p, [String(ni)]: true }))
              onChange((p) => ({ ...p, products: [...(p.products || []), np] }))
            }}>
              <Plus className="h-3.5 w-3.5" /> Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by ID, title, badge, currency, or description" className="pl-9" />
          </div>

          {filteredProducts.length < 1 && <p className="text-sm text-muted-foreground py-4 text-center">No products match your search.</p>}

          {filteredProducts.map(({ product, index }) => {
            const stateKey = String(index)
            const expanded = Boolean(expandedProducts[stateKey])
            const uploadKey = `store-${product.id || index}`

            return (
              <ItemCard
                key={`${product.id || 'product'}-${index}`}
                title={product.title || `Product ${index + 1}`}
                subtitle={`ID: ${product.id || '-'} \u00B7 ${product.currency || '-'} ${Number.isFinite(product.price) ? product.price : 0}`}
                expanded={expanded}
                onToggle={() => setExpandedProducts((p) => ({ ...p, [stateKey]: !expanded }))}
                onRemove={() => onChange((p) => ({ ...p, products: p.products.filter((_, idx) => idx !== index) }))}
                canWrite={canWrite}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Field label="ID"><Input type="text" value={product.id || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, products: p.products.map((i, idx) => idx === index ? { ...i, id: e.target.value } : i) }))} /></Field>
                  <Field label="Title"><Input type="text" value={product.title || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, products: p.products.map((i, idx) => idx === index ? { ...i, title: e.target.value } : i) }))} /></Field>
                  <Field label="Badge"><Input type="text" value={product.badge || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, products: p.products.map((i, idx) => idx === index ? { ...i, badge: optionalValue(e.target.value) } : i) }))} /></Field>
                  <Field label="Price"><Input type="number" min={0} step="0.01" value={Number.isFinite(product.price) ? product.price : 0} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, products: p.products.map((i, idx) => idx === index ? { ...i, price: Math.max(0, Number.parseFloat(e.target.value || '0') || 0) } : i) }))} /></Field>
                  <Field label="Currency"><Input type="text" value={product.currency || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, products: p.products.map((i, idx) => idx === index ? { ...i, currency: e.target.value } : i) }))} /></Field>
                  <Field label="Image URL"><Input type="text" value={product.image || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, products: p.products.map((i, idx) => idx === index ? { ...i, image: e.target.value } : i) }))} /></Field>
                  <Field label="Upload Image">
                    <Input type="file" accept="image/*" disabled={!canWrite || uploadingAssetKey === uploadKey}
                      onChange={async (e) => {
                        const f = e.target.files?.[0]; e.target.value = ''
                        if (!f) return
                        await onUploadImage('images/store', f, uploadKey, (url) => onChange((p) => ({ ...p, products: p.products.map((i, idx) => idx === index ? { ...i, image: url } : i) })))
                      }} />
                  </Field>
                  <Field label="Checkout URL"><Input type="url" value={product.checkoutUrl || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, products: p.products.map((i, idx) => idx === index ? { ...i, checkoutUrl: optionalValue(e.target.value) } : i) }))} /></Field>
                  <Field label="Stripe Price ID"><Input type="text" value={product.stripePriceId || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, products: p.products.map((i, idx) => idx === index ? { ...i, stripePriceId: optionalValue(e.target.value) } : i) }))} /></Field>
                  <div className="flex items-end gap-3 pb-0.5">
                    <Switch checked={Boolean(product.enabled)} onChange={(v) => onChange((p) => ({ ...p, products: p.products.map((i, idx) => idx === index ? { ...i, enabled: v } : i) }))} disabled={!canWrite} />
                    <Label className="text-xs">Enabled</Label>
                  </div>
                </div>
                <Field label="Description">
                  <Textarea value={product.description || ''} disabled={!canWrite} onChange={(e) => onChange((p) => ({ ...p, products: p.products.map((i, idx) => idx === index ? { ...i, description: e.target.value } : i) }))} className="min-h-[80px]" />
                </Field>
              </ItemCard>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Main Visual Content Editor Panel
   ══════════════════════════════════════════════════════ */
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
    () => VISUAL_FILE_ORDER.map((name) => files.find((e) => e.file === name)).filter((e) => e && e.permission !== 'none'),
    [files],
  )

  const filePermissions = useMemo(() => {
    const map = {}
    for (const entry of visualFiles) map[entry.file] = entry.permission
    return map
  }, [visualFiles])

  useEffect(() => {
    if (visualFiles.length < 1) { setActiveFile(''); return }
    setActiveFile((prev) => (visualFiles.some((e) => e.file === prev) ? prev : visualFiles[0].file))
  }, [visualFiles])

  useEffect(() => {
    if (visualFiles.length < 1) { setLoading(false); setDrafts({}); setSavedDrafts({}); return }
    let cancelled = false
    async function loadAll() {
      setLoading(true); setError('')
      try {
        const payloads = await Promise.all(visualFiles.map((e) => api.getVisualContent(e.file).then((p) => [e.file, p.content])))
        if (cancelled) return
        const nextDrafts = Object.fromEntries(payloads)
        setDrafts(nextDrafts)
        setSavedDrafts(JSON.parse(JSON.stringify(nextDrafts)))
      } catch (apiError) {
        if (!cancelled) setError(apiError.message || 'Failed loading visual editor content.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadAll()
    return () => { cancelled = true }
  }, [visualFiles])

  const activeDraft = activeFile ? drafts[activeFile] : null
  const savedDraft = activeFile ? savedDrafts[activeFile] : null
  const dirty = JSON.stringify(activeDraft || null) !== JSON.stringify(savedDraft || null)
  const canWrite = filePermissions[activeFile] === 'write' && sectionPermission === 'write'

  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false) }, [dirty, onDirtyChange])

  useEffect(() => {
    if (!dirty) return undefined
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  function updateDraft(fileName, updater) {
    setDrafts((prev) => {
      const current = prev[fileName]
      if (!current) return prev
      return { ...prev, [fileName]: typeof updater === 'function' ? updater(current) : updater }
    })
  }

  function updateActiveDraft(updater) { updateDraft(activeFile, updater) }

  async function uploadImage(folder, file, key, applyUrl) {
    if (!file) return
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
    if (!activeFile || !canWrite) return
    setSaving(true); setError('')
    try {
      const payload = await api.saveVisualContent(activeFile, { json: activeDraft })
      const nextContent = payload.content
      setDrafts((p) => ({ ...p, [activeFile]: nextContent }))
      setSavedDrafts((p) => ({ ...p, [activeFile]: JSON.parse(JSON.stringify(nextContent)) }))
      onNotify({ kind: 'success', message: `${activeFile} published.` })
    } catch (apiError) {
      setError(apiError.message || 'Failed publishing visual editor changes.')
    } finally {
      setSaving(false)
    }
  }

  function resetActiveFile() {
    if (!activeFile || !savedDrafts[activeFile]) return
    setDrafts((p) => ({ ...p, [activeFile]: JSON.parse(JSON.stringify(savedDrafts[activeFile])) }))
    setError('')
  }

  function requestSwitchFile(fileName) {
    if (!fileName || fileName === activeFile) return
    if (dirty) { setPendingFile(fileName); setShowLeaveModal(true); return }
    setActiveFile(fileName)
  }

  function confirmSwitchFile() {
    if (pendingFile) { resetActiveFile(); setActiveFile(pendingFile) }
    setPendingFile(''); setShowLeaveModal(false)
  }

  if (visualFiles.length < 1) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No visual editor files are available with your current permissions.</p>
      </Card>
    )
  }

  const FILE_ICONS = { 'links.json': Link2, 'blog.json': FileText, 'store.json': ShoppingBag }

  return (
    <div className="space-y-4">
      {/* Header card with file tabs */}
      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base">Visual Content Editor</CardTitle>
              <CardDescription>Edit links, blog, and store with a form-based workflow.</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={resetActiveFile} disabled={!dirty || loading || saving}>
                <RotateCcw className="h-3.5 w-3.5" /> Revert
              </Button>
              <Button size="sm" onClick={saveActiveFile} disabled={!canWrite || !dirty || loading || saving}>
                <Send className="h-3.5 w-3.5" />
                {saving ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {/* File tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {visualFiles.map((entry) => {
              const Icon = FILE_ICONS[entry.file] || FileText
              return (
                <button
                  key={entry.file}
                  type="button"
                  onClick={() => requestSwitchFile(entry.file)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                    entry.file === activeFile
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {entry.file}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>Permission: <strong className="text-foreground">{filePermissions[activeFile]}</strong></span>
            <span>&middot;</span>
            <span>Section: <strong className="text-foreground">{sectionPermission}</strong></span>
            <span>&middot;</span>
            <span className={cn(dirty ? 'text-amber-500' : 'text-primary')}>
              {dirty ? 'Unsaved changes' : 'Saved'}
            </span>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading editor data...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && activeFile === 'links.json' && (
        <LinksEditor value={activeDraft} canWrite={canWrite} onChange={(updater) => updateActiveDraft(updater)} />
      )}

      {!loading && !error && activeFile === 'blog.json' && (
        <BlogEditor value={activeDraft} canWrite={canWrite} onChange={(updater) => updateActiveDraft(updater)} onUploadImage={uploadImage} uploadingAssetKey={uploadingAssetKey} />
      )}

      {!loading && !error && activeFile === 'store.json' && (
        <StoreEditor value={activeDraft} canWrite={canWrite} onChange={(updater) => updateActiveDraft(updater)} onUploadImage={uploadImage} uploadingAssetKey={uploadingAssetKey} />
      )}

      {showLeaveModal && (
        <DialogContent title="Unsaved Changes" description="Changes in this visual editor section are not published yet. Leaving now will discard them." onClose={() => { setPendingFile(''); setShowLeaveModal(false) }}>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPendingFile(''); setShowLeaveModal(false) }}>Stay</Button>
            <Button variant="destructive" onClick={confirmSwitchFile}>Leave Without Publishing</Button>
          </DialogFooter>
        </DialogContent>
      )}
    </div>
  )
}
