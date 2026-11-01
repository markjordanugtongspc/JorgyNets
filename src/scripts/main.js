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
    await pageModule.init()
  }
}
// END: initializeApp - Initialization completed
