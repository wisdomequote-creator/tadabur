import { useEffect } from 'react'
import { Head } from 'vite-react-ssg'

interface PageHeadProps {
  title: string
  description?: string
  canonical?: string
  /** article for surah pages, website otherwise */
  ogType?: 'website' | 'article'
  noindex?: boolean
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Single source of truth for per-route head.
 *
 * - Prerender (SSG): <Head> feeds react-helmet-async, which vite-react-ssg reads
 *   to bake the correct <title>/meta/canonical into each static HTML file.
 * - Client: react-helmet-async does not reliably update the head on navigation
 *   in this setup, so we also sync it imperatively in an effect. The effect only
 *   runs in the browser, so SSR output stays clean (no duplicates).
 */
export default function PageHead({
  title,
  description,
  canonical,
  ogType = 'website',
  noindex = false,
}: PageHeadProps) {
  useEffect(() => {
    document.title = title
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:type', ogType)
    if (description) {
      upsertMeta('name', 'description', description)
      upsertMeta('property', 'og:description', description)
    }
    if (canonical) upsertLink('canonical', canonical)
  }, [title, description, canonical, ogType])

  return (
    <Head>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={canonical} />}
      {noindex && <meta name="robots" content="noindex" />}
      <meta property="og:title" content={title} />
      <meta property="og:type" content={ogType} />
      {description && <meta property="og:description" content={description} />}
    </Head>
  )
}
