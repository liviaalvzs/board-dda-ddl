const LEAFLET_VERSION = '1.9.4'
const LEAFLET_CSS_SRI =
  'sha512-hvdOYkEpXKd5Iy2C7Bh6C03VqL7JB9D0V8H5Q1f7D6wJ8V8Z5Z6gP6y5r6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y='
const LEAFLET_JS_SRI =
  'sha512-h8Akkz6i6v8Z5Z6gP6y5r6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6y6='

let loadPromise: Promise<any> | null = null

export function loadLeaflet(): Promise<any> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    if ((window as any).L) {
      resolve((window as any).L)
      return
    }

    const cssLink = document.createElement('link')
    cssLink.rel = 'stylesheet'
    cssLink.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`
    cssLink.crossOrigin = 'anonymous'
    cssLink.integrity = LEAFLET_CSS_SRI

    const script = document.createElement('script')
    script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`
    script.crossOrigin = 'anonymous'
    script.integrity = LEAFLET_JS_SRI

    script.onload = () => {
      if ((window as any).L) {
        resolve((window as any).L)
      } else {
        reject(new Error('Leaflet loaded but window.L is not available'))
      }
    }

    script.onerror = () => {
      cssLink.remove()
      script.remove()
      loadPromise = null
      reject(new Error('Failed to load Leaflet script from CDN'))
    }

    cssLink.onerror = () => {
      cssLink.remove()
      script.remove()
      loadPromise = null
      reject(new Error('Failed to load Leaflet CSS from CDN'))
    }

    document.head.appendChild(cssLink)
    document.head.appendChild(script)
  })

  return loadPromise
}

export default loadLeaflet
