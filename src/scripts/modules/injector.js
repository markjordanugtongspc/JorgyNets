// START: injectComponent - Fetches and injects reusable HTML component partials into containers
export async function injectComponent(selector, componentPath) {
  const container = document.querySelector(selector)
  if (!container) return null

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
