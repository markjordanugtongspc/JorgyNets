import '../style.css'
import 'flowbite'
import { themeController } from './modules/theme.js'
import { injectComponent } from './modules/injector.js'

import { AuthManager } from './modules/auth.js'

// START: initializeApp - Bootstraps theme, dynamic layout slots, and page module
export async function initializeApp(pageModule) {
  themeController.init()

  // Inject reusable layout components if component slots are present on current page
  await injectComponent('#sidebar-slot', '/src/components/sidebar.html')
  await injectComponent('#settings-slot', '/src/components/settings.html')

  // Programmatic helper to open/close settings modal cleanly without console warnings
  const settingsModal = document.getElementById('settings-modal')
  const openSettingsModal = () => {
    if (!settingsModal) return
    settingsModal.classList.remove('hidden')
    settingsModal.classList.add('flex')
    document.body.classList.add('overflow-hidden')
  }
  const closeSettingsModal = () => {
    if (!settingsModal) return
    settingsModal.classList.add('hidden')
    settingsModal.classList.remove('flex')
    document.body.classList.remove('overflow-hidden')
  }

  document.getElementById('nav-sys-settings')?.addEventListener('click', (e) => {
    e.preventDefault()
    openSettingsModal()
  })
  document.getElementById('quick-settings')?.addEventListener('click', (e) => {
    e.preventDefault()
    openSettingsModal()
  })
  document.getElementById('close-modal')?.addEventListener('click', (e) => {
    e.preventDefault()
    closeSettingsModal()
  })
  document.getElementById('cancel-settings')?.addEventListener('click', (e) => {
    e.preventDefault()
    closeSettingsModal()
  })
  settingsModal?.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettingsModal()
    }
  })

  // Re-bind theme button listener if present
  document.getElementById('theme-btn')?.addEventListener('click', () => {
    themeController.toggle()
  })

  // Settings Modal Theme Switcher Bindings
  const syncSettingsThemeUI = () => {
    const isDark = themeController.getTheme() === 'dark'
    const lightCheck = document.getElementById('light-check')
    const darkCheck = document.getElementById('dark-check')
    const lightBtn = document.getElementById('theme-light-btn')
    const darkBtn = document.getElementById('theme-dark-btn')

    if (lightCheck && darkCheck) {
      if (isDark) {
        darkCheck.classList.remove('hidden')
        lightCheck.classList.add('hidden')
        darkBtn?.classList.add('border-blue-500', 'ring-2', 'ring-blue-500/30')
        lightBtn?.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500/30')
      } else {
        lightCheck.classList.remove('hidden')
        darkCheck.classList.add('hidden')
        lightBtn?.classList.add('border-blue-500', 'ring-2', 'ring-blue-500/30')
        darkBtn?.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500/30')
      }
    }
  }

  syncSettingsThemeUI()

  document.getElementById('theme-light-btn')?.addEventListener('click', () => {
    themeController.apply('light')
    syncSettingsThemeUI()
  })

  document.getElementById('theme-dark-btn')?.addEventListener('click', () => {
    themeController.apply('dark')
    syncSettingsThemeUI()
  })

  // Global Logout binding for user profile dropdown
  document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault()
    AuthManager.logout()
  })

  // Smoothly reveal sidebar real wrapper if not handled by dashboard animation
  setTimeout(() => {
    const sidebarSkel = document.getElementById('sidebar-skeleton')
    const sidebarReal = document.getElementById('sidebar-real-wrapper')
    if (sidebarSkel && sidebarReal) {
      sidebarSkel.classList.add('hidden')
      sidebarReal.classList.remove('hidden')
    }
  }, 400)

  // Route-based active sidebar navigation item styling
  const path = window.location.pathname
  const dashLink = document.getElementById('nav-dashboard')
  const dashOutline = document.getElementById('dash-icon-outline')
  const dashSolid = document.getElementById('dash-icon-solid')
  const salesToggle = document.getElementById('sales-toggle')
  const salesOutline = document.getElementById('sales-icon-outline')
  const salesSolid = document.getElementById('sales-icon-solid')
  const habwaLink = document.getElementById('nav-habwa-logs')
  const exportsLink = document.getElementById('nav-exports')

  const ownersLink = document.getElementById('nav-users')
  const usersOutline = document.getElementById('users-icon-outline')
  const usersSolid = document.getElementById('users-icon-solid')
  const exportsOutline = document.getElementById('exports-icon-outline')
  const exportsSolid = document.getElementById('exports-icon-solid')

  if (path.includes('habwa')) {
    // 1. Deactivate dashboard link (shows outline by default, solid on hover)
    if (dashLink) {
      dashLink.className = 'flex items-center px-3 py-2.5 text-slate-400 hover:text-blue-300 hover:bg-slate-800/80 rounded-lg group transition'
    }

    // 2. Parent Dropdown (Financials & Bills): static blue tone background and text
    if (salesToggle) {
      salesToggle.className = 'flex items-center w-full justify-between px-3 py-2.5 text-blue-400 font-bold bg-blue-600/20 hover:bg-blue-600/30 rounded-lg border border-blue-500/50 shadow-md shadow-blue-600/10 group transition cursor-pointer'
      salesOutline?.classList.add('hidden')
      salesSolid?.classList.remove('hidden')
      salesSolid?.classList.add('block')
    }

    // 3. Dropdown sub-option (Monthly Habwa Logs): shallow container jar (|_____|) with cut/short upright edges
    if (habwaLink) {
      habwaLink.className = 'relative w-full flex items-center justify-between px-2.5 py-1 text-blue-200 bg-blue-600/20 border-b border-blue-400/60 rounded-b-md font-semibold shadow-xs group text-xs transition leading-tight after:content-[""] after:absolute after:left-0 after:bottom-0 after:w-[1px] after:h-2 after:bg-blue-400/60 before:content-[""] before:absolute before:right-0 before:bottom-0 before:w-[1px] before:h-2 before:bg-blue-400/60'
    }
  } else if (path.includes('bills')) {
    // 1. Deactivate dashboard link
    if (dashLink) {
      dashLink.className = 'flex items-center px-3 py-2.5 text-slate-400 hover:text-blue-300 hover:bg-slate-800/80 rounded-lg group transition'
    }

    // 2. Parent Dropdown (Financials & Bills): static blue tone background and text
    if (salesToggle) {
      salesToggle.className = 'flex items-center w-full justify-between px-3 py-2.5 text-blue-400 font-bold bg-blue-600/20 hover:bg-blue-600/30 rounded-lg border border-blue-500/50 shadow-md shadow-blue-600/10 group transition cursor-pointer'
      salesOutline?.classList.add('hidden')
      salesSolid?.classList.remove('hidden')
      salesSolid?.classList.add('block')
    }

    // 3. Dropdown sub-option (Monthly Deductions): shallow container jar (|_____|) with cut/short upright edges
    const billsLink = document.getElementById('nav-monthly-deductions')
    if (billsLink) {
      billsLink.className = 'relative w-full flex items-center justify-between px-2.5 py-1 text-rose-200 bg-rose-600/20 border-b border-rose-400/60 rounded-b-md font-semibold shadow-xs group text-xs transition leading-tight after:content-[""] after:absolute after:left-0 after:bottom-0 after:w-[1px] after:h-2 after:bg-rose-400/60 before:content-[""] before:absolute before:right-0 before:bottom-0 before:w-[1px] before:h-2 before:bg-rose-400/60'
    }
  } else if (path.includes('requests')) {
    // 1. Deactivate dashboard link
    if (dashLink) {
      dashLink.className = 'flex items-center px-3 py-2.5 text-slate-400 hover:text-blue-300 hover:bg-slate-800/80 rounded-lg group transition'
    }

    // 2. Parent Dropdown (Financials & Bills): static blue tone background and text
    if (salesToggle) {
      salesToggle.className = 'flex items-center w-full justify-between px-3 py-2.5 text-blue-400 font-bold bg-blue-600/20 hover:bg-blue-600/30 rounded-lg border border-blue-500/50 shadow-md shadow-blue-600/10 group transition cursor-pointer'
      salesOutline?.classList.add('hidden')
      salesSolid?.classList.remove('hidden')
      salesSolid?.classList.add('block')
    }

    // 3. Dropdown sub-option (Custom Requests): shallow container jar (|_____|) with cut/short upright edges in amber accent
    const requestsLink = document.getElementById('nav-custom-requests')
    if (requestsLink) {
      requestsLink.className = 'relative w-full flex items-center justify-between px-2.5 py-1 text-amber-200 bg-amber-600/20 border-b border-amber-400/60 rounded-b-md font-semibold shadow-xs group text-xs transition leading-tight after:content-[""] after:absolute after:left-0 after:bottom-0 after:w-[1px] after:h-2 after:bg-amber-400/60 before:content-[""] before:absolute before:right-0 before:bottom-0 before:w-[1px] before:h-2 before:bg-amber-400/60'
    }
  } else if (path.includes('exports')) {
    if (dashLink) {
      dashLink.className = 'flex items-center px-3 py-2.5 text-slate-400 hover:text-blue-300 hover:bg-slate-800/80 rounded-lg group transition'
    }
    if (exportsLink) {
      exportsLink.className = 'flex items-center px-3 py-2.5 text-blue-400 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 font-semibold shadow-md shadow-blue-600/10 border border-blue-500/40 group transition'
      exportsOutline?.classList.add('hidden')
      exportsSolid?.classList.remove('hidden')
      exportsSolid?.classList.add('block')
    }
  } else if (path.includes('owners')) {
    if (dashLink) {
      dashLink.className = 'flex items-center px-3 py-2.5 text-slate-400 hover:text-blue-300 hover:bg-slate-800/80 rounded-lg group transition'
    }
    if (ownersLink) {
      ownersLink.className = 'flex items-center px-3 py-2.5 text-blue-400 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 font-semibold shadow-md shadow-blue-600/10 border border-blue-500/40 group transition'
      usersOutline?.classList.add('hidden')
      usersSolid?.classList.remove('hidden')
      usersSolid?.classList.add('block')
    }
  } else {
    // On Dashboard page: primary blue tone with solid icon always active
    if (dashLink) {
      dashLink.className = 'flex items-center px-3 py-2.5 text-blue-400 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 font-semibold shadow-md shadow-blue-600/10 border border-blue-500/40 group transition'
      dashOutline?.classList.add('hidden')
      dashSolid?.classList.remove('hidden')
      dashSolid?.classList.add('block')
    }
  }

  // User Profile card hover/tap listener: adjusts requests-card up ONLY when profile-card is interacted with
  const profileWidget = document.getElementById('user-profile-widget')
  const requestsCard = document.getElementById('requests-card')
  if (profileWidget && requestsCard) {
    const liftUp = () => requestsCard.classList.add('-translate-y-44')
    const dropDown = () => requestsCard.classList.remove('-translate-y-44')

    profileWidget.addEventListener('mouseenter', liftUp)
    profileWidget.addEventListener('mouseleave', dropDown)
    profileWidget.addEventListener('focusin', liftUp)
    profileWidget.addEventListener('focusout', dropDown)
  }

  // Sales arrow rotation toggle on click (flips between pointing down and up)
  const salesArrow = document.getElementById('sales-arrow')
  salesToggle?.addEventListener('click', () => {
    salesArrow?.classList.toggle('rotate-180')
  })

  // Initialize Flowbite UI behaviors and drawers
  if (window.initFlowbite) {
    window.initFlowbite()
  }

  // Mobile Drawer & Hamburger Visibility Controller:
  // Hides #mobile-bar when drawer is open, and restores it when drawer closes or user taps outside
  const mobileBar = document.getElementById('mobile-bar')
  const sidebar = document.getElementById('pisonet-sidebar')

  if (mobileBar && sidebar) {
    // Observe class changes on sidebar (Flowbite adds/removes translate-x-full and -translate-x-full)
    const observer = new MutationObserver(() => {
      // If sidebar is visible (does not have translate-x-full on mobile view)
      const isMobile = window.innerWidth < 640
      const isClosed = sidebar.classList.contains('translate-x-full')
      
      if (isMobile && !isClosed) {
        mobileBar.classList.add('opacity-0', 'pointer-events-none')
      } else {
        mobileBar.classList.remove('opacity-0', 'pointer-events-none')
      }
    })

    observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] })

    // Explicit tap-outside listener for mobile off-canvas drawer
    document.addEventListener('click', (e) => {
      if (window.innerWidth >= 640) return
      const isClosed = sidebar.classList.contains('translate-x-full')
      if (isClosed) return

      // If click was outside both the sidebar drawer and the hamburger toggle
      const clickedInsideSidebar = sidebar.contains(e.target)
      const clickedToggle = mobileBar.contains(e.target)

      if (!clickedInsideSidebar && !clickedToggle) {
        sidebar.classList.add('translate-x-full')
        mobileBar.classList.remove('opacity-0', 'pointer-events-none')
        // Remove Flowbite backdrop if present
        document.querySelector('[drawer-backdrop]')?.remove()
      }
    })
  }

  // Initialize page-specific OOP module (e.g. AuthManager, DashboardManager, ExportsManager)
  if (pageModule && typeof pageModule.init === 'function') {
    pageModule.init()
  }
}
// END: initializeApp - Initialization completed
