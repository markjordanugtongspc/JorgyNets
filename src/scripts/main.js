import '../style.css'
import 'flowbite'
import { themeController } from './modules/theme.js'
import { injectComponent } from './modules/injector.js'

import { AuthManager } from './modules/auth.js'
import { SettingsManager } from './modules/settings.js'
export * from '../api/index.js'

// START: initializeApp - Bootstraps theme, dynamic layout slots, and page module
export async function initializeApp(pageModule) {
  // Execute Auth Guard first: instantly shield unauthorized viewers
  const authInstance = new AuthManager()
  const isAllowed = authInstance.authGuard.protect()
  if (!isAllowed) {
    return // Stop rendering anything if unauthorized redirect is in motion
  }

  themeController.init()

  // Inject reusable layout components if component slots are present on current page
  await injectComponent('#sidebar-slot', '/src/components/sidebar.html')
  await injectComponent('#settings-slot', '/src/components/settings.html')
  await injectComponent('#navigation-slot', '/src/components/navigation.html')

  // Initialize SettingsManager (OOP Coordinator for settings modal & tabs)
  const settingsManager = new SettingsManager()
  settingsManager.init()

  // Re-bind theme button listener if present
  document.getElementById('theme-btn')?.addEventListener('click', () => {
    themeController.toggle()
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

  // Route-based active sidebar navigation item styling & Role detection
  const userRole = sessionStorage.getItem('jn_session_role')
  const isClient = userRole && userRole !== '0'
  const sessionUser = sessionStorage.getItem('jn_session_user')
  const sessionHandle = sessionStorage.getItem('jn_session_handle')

  // Synchronize profile card identity in sidebar from session/localStorage
  const sideName = document.getElementById('user-fullname')
  const sideHandle = document.getElementById('user-handle')
  const dropName = document.getElementById('dropdown-user-fullname')
  const dropPhone = document.getElementById('dropdown-user-phone')
  const avatarInitials = document.getElementById('user-avatar-initials')

  const storedSettings = JSON.parse(localStorage.getItem('jn_settings') || '{}')
  const resolvedFullName = sessionUser || storedSettings.fullName || 'Jorgy Admin'
  const resolvedUsername = (sessionHandle ? sessionHandle.replace('@', '') : '') || storedSettings.username || 'admin'
  const resolvedPhone = storedSettings.phone || (isClient ? '0917-882-9102' : '0926-995-8724')

  if (sideName) sideName.textContent = resolvedFullName
  if (sideHandle) sideHandle.textContent = `@${resolvedUsername}`
  if (dropName) dropName.textContent = resolvedFullName
  if (dropPhone) dropPhone.textContent = resolvedPhone
  if (avatarInitials) {
    const initials = resolvedFullName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'JA'
    avatarInitials.textContent = initials
  }

  const path = window.location.pathname
  const dashLink = document.getElementById('nav-dashboard')

  // If user role is client (not 0), re-point sidebar links to users portal
  if (isClient) {
    if (dashLink) dashLink.setAttribute('href', '/frontend/users/dashboard/')
    const habwaNav = document.getElementById('nav-habwa-logs')
    if (habwaNav) habwaNav.setAttribute('href', '/frontend/users/habwa/')
    const billsNav = document.getElementById('nav-monthly-deductions')
    if (billsNav) billsNav.setAttribute('href', '/frontend/users/bills/')
    const reqNav = document.getElementById('nav-custom-requests')
    if (reqNav) reqNav.setAttribute('href', '/frontend/users/requests/')
    const expNav = document.getElementById('nav-exports')
    if (expNav) expNav.setAttribute('href', '/frontend/users/exports/')
  }

  // Auto-route client roles hitting admin pages to the corresponding user portal pages
  if (isClient) {
    if (path === '/frontend/pages/dashboard/' || path === '/frontend/pages/dashboard/index.html' || path === '/dashboard' || path === '/dashboard/') {
      window.location.replace('/frontend/users/dashboard/')
      return
    }
    if (path === '/frontend/pages/habwa/' || path === '/frontend/pages/habwa/index.html' || path === '/habwa' || path === '/habwa/') {
      window.location.replace('/frontend/users/habwa/')
      return
    }
    if (path === '/frontend/pages/bills/' || path === '/frontend/pages/bills/index.html' || path === '/bills' || path === '/bills/') {
      window.location.replace('/frontend/users/bills/')
      return
    }
    if (path === '/frontend/pages/requests/' || path === '/frontend/pages/requests/index.html' || path === '/requests' || path === '/requests/') {
      window.location.replace('/frontend/users/requests/')
      return
    }
    if (path === '/frontend/pages/exports/' || path === '/frontend/pages/exports/index.html' || path === '/exports' || path === '/exports/') {
      window.location.replace('/frontend/users/exports/')
      return
    }
  }

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
  const notifOutline = document.getElementById('notif-icon-outline')
  const notifSolid = document.getElementById('notif-icon-solid')
  const navUsersText = document.getElementById('nav-users-text')
  const exportsOutline = document.getElementById('exports-icon-outline')
  const exportsSolid = document.getElementById('exports-icon-solid')

  // If user role is client/user, switch Owners item to Notifications
  if (isClient) {
    if (navUsersText) navUsersText.textContent = 'Notifications'
    if (usersOutline) usersOutline.classList.add('!hidden')
    if (usersSolid) usersSolid.classList.add('!hidden')
    if (notifOutline) notifOutline.classList.remove('hidden')
    if (notifSolid) notifSolid.classList.add('hidden')

    if (ownersLink) {
      ownersLink.addEventListener('mouseenter', () => {
        notifOutline?.classList.add('hidden')
        notifSolid?.classList.remove('hidden')
      })
      ownersLink.addEventListener('mouseleave', () => {
        notifOutline?.classList.remove('hidden')
        notifSolid?.classList.add('hidden')
      })
      ownersLink.setAttribute('href', '#')
      ownersLink.addEventListener('click', (e) => {
        e.preventDefault()
        settingsManager.tabController.switchTab('notifications')
        const modal = document.getElementById('settings-modal')
        if (modal) {
          modal.classList.remove('hidden')
          modal.classList.add('flex')
          document.body.classList.add('overflow-hidden')
        }
      })
    }
  } else {
    if (notifOutline) notifOutline.classList.add('!hidden')
    if (notifSolid) notifSolid.classList.add('!hidden')
    if (usersOutline) usersOutline.classList.remove('!hidden')
    if (usersSolid) usersSolid.classList.remove('!hidden')
  }

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

  // Mobile Bottom Navigation Tab Active States (Dual theme with solid/outline icon switching matching sidebar)
  const navHome = document.getElementById('nav-home')
  const navHabwaTab = document.getElementById('nav-habwa')
  const navBillsTab = document.getElementById('nav-bills')
  const navNewBtn = document.getElementById('btn-new')
  const homeOutline = document.getElementById('home-icon-outline')
  const homeSolid = document.getElementById('home-icon-solid')
  const habwaOutline = document.getElementById('habwa-icon-outline')
  const habwaSolid = document.getElementById('habwa-icon-solid')
  const billsOutline = document.getElementById('bills-icon-outline')
  const billsSolid = document.getElementById('bills-icon-solid')

  if (path.includes('habwa')) {
    if (navHabwaTab) {
      navHabwaTab.classList.remove('text-slate-500', 'dark:text-slate-400', 'opacity-70')
      navHabwaTab.classList.add('text-emerald-600', 'dark:text-emerald-400', 'bg-emerald-50/80', 'dark:bg-emerald-950/60', 'shadow-xs', 'font-bold', '!opacity-100')
      navHabwaTab.removeAttribute('data-tooltip-target')
      document.getElementById('tooltip-habwa')?.remove()
      habwaOutline?.classList.add('hidden')
      habwaSolid?.classList.remove('hidden')
    }
  } else if (path.includes('bills')) {
    if (navBillsTab) {
      navBillsTab.classList.remove('text-slate-500', 'dark:text-slate-400', 'opacity-70')
      navBillsTab.classList.add('text-rose-600', 'dark:text-rose-400', 'bg-rose-50/80', 'dark:bg-rose-950/60', 'shadow-xs', 'font-bold', '!opacity-100')
      navBillsTab.removeAttribute('data-tooltip-target')
      document.getElementById('tooltip-bills')?.remove()
      billsOutline?.classList.add('hidden')
      billsSolid?.classList.remove('hidden')
    }
  } else if (path.includes('requests')) {
    if (navNewBtn) {
      navNewBtn.classList.add('ring-4', 'ring-blue-400/60', 'scale-105')
      navNewBtn.removeAttribute('data-tooltip-target')
      document.getElementById('tooltip-new')?.remove()
    }
  } else if (path.includes('dashboard') || path.endsWith('/users/')) {
    if (navHome) {
      navHome.classList.remove('text-slate-500', 'dark:text-slate-400', 'opacity-70')
      navHome.classList.add('text-blue-600', 'dark:text-blue-400', 'bg-blue-50/80', 'dark:bg-blue-950/60', 'shadow-xs', 'font-bold', '!opacity-100')
      navHome.removeAttribute('data-tooltip-target')
      document.getElementById('tooltip-home')?.remove()
      homeOutline?.classList.add('hidden')
      homeSolid?.classList.remove('hidden')
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

  // Mobile Navigation Distraction Auto-Hide & Drawer Visibility Controller:
  // Hides bottom navigation when scrolling or typing, and restores it when user is idle or lost focus
  const mobileNav = document.getElementById('mobile-nav')
  const sidebar = document.getElementById('pisonet-sidebar')

  if (mobileNav) {
    let scrollTimeout = null
    let isDrawerOpen = false

    const hideNav = () => {
      if (window.innerWidth < 640) {
        mobileNav.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none')
      }
    }

    const showNav = () => {
      if (window.innerWidth < 640 && !isDrawerOpen) {
        mobileNav.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none')
      }
    }

    // 1. Hide on active scroll, pop back smoothly when scrolling stops
    window.addEventListener('scroll', () => {
      if (window.innerWidth >= 640 || isDrawerOpen) return
      hideNav()
      if (scrollTimeout) clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        showNav()
      }, 400)
    }, { passive: true })

    // 2. Hide when user focuses on inputs/textareas to avoid keyboard disturbance, pop back on blur
    document.addEventListener('focusin', (e) => {
      const tag = e.target.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        hideNav()
      }
    })

    document.addEventListener('focusout', (e) => {
      const tag = e.target.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        setTimeout(showNav, 250)
      }
    })

    // 3. Tap on the bottom bar itself boosts opacity to full
    mobileNav.addEventListener('touchstart', () => {
      mobileNav.classList.remove('opacity-70')
    }, { passive: true })
  }

  if (sidebar) {
    // Observe class changes on sidebar (Flowbite adds/removes translate-x-full)
    const observer = new MutationObserver(() => {
      const isMobile = window.innerWidth < 640
      const isClosed = sidebar.classList.contains('translate-x-full')
      
      if (isMobile && !isClosed) {
        mobileNav?.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none')
      } else if (isMobile && isClosed) {
        mobileNav?.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none')
      }
    })

    observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] })

    // Explicit tap-outside listener for mobile off-canvas drawer
    document.addEventListener('click', (e) => {
      if (window.innerWidth >= 640) return
      const isClosed = sidebar.classList.contains('translate-x-full')
      if (isClosed) return

      // If click was outside both the sidebar drawer and any toggles
      const clickedInsideSidebar = sidebar.contains(e.target)
      const clickedToggle = e.target.closest('#sidebar-toggle')

      if (!clickedInsideSidebar && !clickedToggle) {
        sidebar.classList.add('translate-x-full')
        mobileNav?.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none')
        // Remove Flowbite backdrop if present
        document.querySelector('[drawer-backdrop]')?.remove()
      }
    })
  }

  // Initialize page-specific OOP module (e.g. AuthManager, DashboardManager, ExportsManager)
  if (pageModule && typeof pageModule.init === 'function') {
    await pageModule.init()
  }
}
// END: initializeApp - Initialization completed
