const LEAFLET_VERSION = '1.9.4'

interface CdnSource {
  url: string
  integrity: string
}

const CSS_SOURCES: CdnSource[] = [
  {
    url: `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`,
    integrity: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=',
  },
  {
    url: `https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`,
    integrity: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=',
  },
]

const JS_SOURCES: CdnSource[] = [
  {
    url: `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`,
    integrity: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=',
  },
  {
    url: `https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`,
    integrity: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=',
  },
]

function isCssLoaded(): boolean {
  for (let i = 0; i < document.styleSheets.length; i++) {
    try {
      const sheet = document.styleSheets[i]
      if (sheet.href && sheet.href.includes('leaflet')) return true
    } catch {
      // Cross-origin stylesheet — assume loaded if href matches
    }
  }
  return false
}

function isJsLoaded(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).L
}

function loadCss(sources: CdnSource[]): Promise<void> {
  if (isCssLoaded()) return Promise.resolve()

  return new Promise((resolve, reject) => {
    let index = 0

    const tryNext = () => {
      if (index >= sources.length) {
        reject(new Error('Failed to load Leaflet CSS from all CDN sources'))
        return
      }

      const source = sources[index]
      index++

      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = source.url
      link.integrity = source.integrity
      link.crossOrigin = 'anonymous'

      link.onload = () => resolve()
      link.onerror = () => {
        console.warn(`Leaflet CSS: primary CDN failed (${source.url}), trying fallback...`)
        link.remove()
        tryNext()
      }

      document.head.appendChild(link)
    }

    tryNext()
  })
}

function loadJs(sources: CdnSource[]): Promise<void> {
  if (isJsLoaded()) return Promise.resolve()

  return new Promise((resolve, reject) => {
    let index = 0

    const tryNext = () => {
      if (index >= sources.length) {
        reject(new Error('Failed to load Leaflet JS from all CDN sources'))
        return
      }

      const source = sources[index]
      index++

      const script = document.createElement('script')
      script.src = source.url
      script.integrity = source.integrity
      script.crossOrigin = 'anonymous'

      script.onload = () => {
        if (isJsLoaded()) {
          resolve()
        } else {
          console.warn(
            `Leaflet JS: script loaded from ${source.url} but window.L is undefined, trying fallback...`,
          )
          script.remove()
          tryNext()
        }
      }
      script.onerror = () => {
        console.warn(`Leaflet JS: primary CDN failed (${source.url}), trying fallback...`)
        script.remove()
        tryNext()
      }

      document.head.appendChild(script)
    }

    tryNext()
  })
}

let loadPromise: Promise<void> | null = null

export function loadLeaflet(): Promise<void> {
  if (loadPromise) return loadPromise

  if (isCssLoaded() && isJsLoaded()) {
    loadPromise = Promise.resolve()
    return loadPromise
  }

  loadPromise = (async () => {
    await loadCss(CSS_SOURCES)
    await loadJs(JS_SOURCES)
  })()

  return loadPromise
}

export default loadLeaflet
