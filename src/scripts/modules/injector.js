// START: injectComponent - Injects reusable HTML component partials into containers
import sidebarHtml from '../../components/sidebar.html?raw'
import settingsHtml from '../../components/settings.html?raw'
import exportsHtml from '../../components/exports.html?raw'
import navigationHtml from '../../components/navigation.html?raw'

const STATIC_COMPONENTS = {
  '/src/components/sidebar.html': sidebarHtml,
  '/src/components/settings.html': settingsHtml,
  '/src/components/exports.html': exportsHtml,
  '/src/components/navigation.html': navigationHtml,
  'sidebar': sidebarHtml,
  'settings': settingsHtml,
  'exports': exportsHtml,
  'navigation': navigationHtml
}

export async function injectComponent(selector, componentPath) {
  const container = document.querySelector(selector)
  if (!container) return null

  // 1. Check bundled raw HTML components (prevents 404 in production Vercel/Vite builds)
  if (STATIC_COMPONENTS[componentPath]) {
    container.innerHTML = STATIC_COMPONENTS[componentPath]
    return container
  }

  // 2. Fallback to runtime fetch
  try {
    const res = await fetch(componentPath)
    if (!res.ok) throw new Error(`HTTP ${res.status} loading ${componentPath}`)
    const html = await res.text()
    container.innerHTML = html
    return container
  } catch (err) {
    console.error(`[Component Injector] Failed to inject ${componentPath}:`, err)
    return null
  }
}
// END: injectComponent - Component HTML mounted
