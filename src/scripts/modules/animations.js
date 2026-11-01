// START: AnimationsManager - Parent OOP coordinator for UI, skeleton loading, and numerical telemetry animations
export class AnimationsManager {
  constructor() {
    this.counter = new this.MoneyCounter(this)
    this.refreshAnimator = new this.AutoExpandRefresh(this)
    this.skeleton = new this.SkeletonManager(this)
    this.toast = new this.ToastManager(this)
    this.shake = new this.InputShakeManager(this)
  }

  // START: AnimationsManager.init - Bootstraps all registered animation subchildren
  init() {
    this.skeleton.init()
    this.refreshAnimator.init()
  }
  // END: AnimationsManager.init - Animations initialized

  // START: SkeletonManager - Manages Flowbite loading skeleton placeholders across KPI cards, charts, and tables
  SkeletonManager = class {
    constructor(parent) {
      this.parent = parent
    }

    // START: SkeletonManager.init - Simulates realistic telemetry fetch then reveals loaded content
    init() {
      // Simulate realistic telemetry fetch duration (600ms), then reveal content and run rolling MoneyCounter
      setTimeout(() => {
        this.revealAll()
      }, 650)
    }

    // START: SkeletonManager.revealAll - Fades out pulse skeleton elements and smoothly shows real cards & charts
    revealAll() {
      // 1. Reveal KPI Card Elements (titles, badges, descriptions, watermark icons)
      const kpiItems = [
        { skel: 'revenue-title-skeleton', real: 'revenue-title' },
        { skel: 'revenue-badge-skeleton', real: 'revenue-badge' },
        { skel: 'revenue-amount-skeleton', real: 'revenue-amount' },
        { skel: 'revenue-amount-skeleton', real: 'stat-total' },
        { skel: 'revenue-desc-skeleton', real: 'revenue-desc' },
        { skel: 'revenue-icon-skeleton', real: 'revenue-icon-loaded' },
        { skel: 'terminals-title-skeleton', real: 'terminals-title' },
        { skel: 'terminals-badge-skeleton', real: 'terminals-badge' },
        { skel: 'terminals-count-skeleton', real: 'terminals-count' },
        { skel: 'terminals-count-skeleton', real: 'stat-count' },
        { skel: 'terminals-desc-skeleton', real: 'terminals-desc' },
        { skel: 'terminals-icon-skeleton', real: 'terminals-icon-loaded' },
        { skel: 'monthly-title-skeleton', real: 'monthly-title' },
        { skel: 'monthly-badge-skeleton', real: 'monthly-badge' },
        { skel: 'monthly-amount-skeleton', real: 'monthly-amount' },
        { skel: 'monthly-amount-skeleton', real: 'stat-avg' },
        { skel: 'monthly-desc-skeleton', real: 'monthly-desc' },
        { skel: 'monthly-icon-skeleton', real: 'monthly-icon-loaded' },
      ]

      kpiItems.forEach(({ skel, real }) => {
        const skelEl = document.getElementById(skel)
        const realEl = document.getElementById(real)
        if (skelEl) skelEl.classList.add('hidden')
        if (realEl) realEl.classList.remove('hidden')
      })

      // 2. Reveal Charts (Sales chart & Status Donut chart)
      const salesSkel = document.getElementById('sales-chart-skeleton')
      const salesContent = document.getElementById('sales-chart-content')
      if (salesSkel) salesSkel.classList.add('hidden')
      if (salesContent) salesContent.classList.remove('hidden')

      const statusSkel = document.getElementById('status-chart-skeleton')
      const statusContent = document.getElementById('status-chart-content')
      if (statusSkel) statusSkel.classList.add('hidden')
      if (statusContent) statusContent.classList.remove('hidden')

      // 3. Reveal Fleet Table, Quick Card & Logs Card
      const fleetSkel = document.getElementById('fleet-skeleton')
      const fleetContent = document.getElementById('fleet-content')
      if (fleetSkel) fleetSkel.classList.add('hidden')
      if (fleetContent) fleetContent.classList.remove('hidden')

      const quickSkel = document.getElementById('quick-skeleton')
      const quickReal = document.getElementById('quick-real-wrapper')
      if (quickSkel) quickSkel.classList.add('hidden')
      if (quickReal) quickReal.classList.remove('hidden')

      const logsSkel = document.getElementById('logs-skeleton')
      const logsReal = document.getElementById('logs-real-wrapper')
      if (logsSkel) logsSkel.classList.add('hidden')
      if (logsReal) logsReal.classList.remove('hidden')

      // 4. Reveal Sidebar Navigation Contents (Keeping sidebar-body intact)
      const sidebarSkel = document.getElementById('sidebar-skeleton')
      const sidebarReal = document.getElementById('sidebar-real-wrapper')
      if (sidebarSkel) sidebarSkel.classList.add('hidden')
      if (sidebarReal) sidebarReal.classList.remove('hidden')

      // 5. Reveal Habwa Table & Habwa Summary Cards
      const habwaTableSkel = document.getElementById('table-skeleton')
      const habwaTableReal = document.getElementById('table-real')
      if (habwaTableSkel) habwaTableSkel.classList.add('hidden')
      if (habwaTableReal) habwaTableReal.classList.remove('hidden')

      // 6. Trigger the rolling MoneyCounter animation for the KPI amounts with a smooth delay after skeleton finish
      setTimeout(() => {
        this.parent.counter.init()
      }, 250)
    }
    // END: SkeletonManager.revealAll - All skeletons transitioned
  }
  // END: SkeletonManager - Subchild ready

  // START: AutoExpandRefresh - Smooth morphing expansion of refresh button into emerald 'Reload Data' on hover with spinning reload animation
  AutoExpandRefresh = class {
    constructor(parent) {
      this.parent = parent
    }

    // START: AutoExpandRefresh.init - Binds hover, click, and leave smooth transitions
    init() {
      const btn = document.getElementById('dash-refresh')
      const label = document.getElementById('refresh-label')
      const icon = document.getElementById('dash-refresh-icon')
      if (!btn) return

      let isBusy = false
      let hoverTimeout = null

      // Smoothly expand on hover: shift icon aside to the left, play reload spin animation, fill emerald, and transition font from gray to white
      const expand = () => {
        if (hoverTimeout) clearTimeout(hoverTimeout)

        // 1. Play reloading/refreshing spin animation
        icon?.classList.add('rotate-[360deg]')

        // 2. Set aside to the left & fill with emerald button color
        btn.classList.remove('w-9', 'p-0', 'justify-center', 'bg-transparent', 'border-slate-300', 'dark:border-slate-700')
        btn.classList.add('w-36', 'px-3', 'justify-start', 'space-x-2', 'bg-emerald-600', 'border-emerald-500', 'shadow-md', 'shadow-emerald-500/20')

        // 3. First reveal text in gray font, then smoothly transition into white font
        if (label) {
          label.classList.remove('max-w-0', 'opacity-0', 'text-white')
          label.classList.add('max-w-[90px]', 'opacity-100', 'text-slate-400')
        }

        hoverTimeout = setTimeout(() => {
          if (label && (btn.matches(':hover') || isBusy)) {
            // Smoothly cross-fade font color from gray to white
            label.classList.remove('text-slate-400')
            label.classList.add('text-white')
          }
        }, 120)
      }

      // Smoothly return/discard to normal rounded SVG icon when not hovering
      const collapse = () => {
        if (isBusy) return
        if (hoverTimeout) clearTimeout(hoverTimeout)

        // 1. Hide text label and return font color to gray
        if (label) {
          label.classList.remove('max-w-[90px]', 'opacity-100', 'text-white', 'font-black')
          label.classList.add('max-w-0', 'opacity-0', 'text-slate-400', 'font-bold')
        }

        // 2. Stop reload spin & return icon to normal centered position
        icon?.classList.remove('rotate-[360deg]')

        // 3. Return button to compact rounded SVG icon with empty stroke
        btn.classList.remove('w-36', 'px-3', 'justify-start', 'space-x-2', 'bg-emerald-600', 'border-emerald-500', 'shadow-md', 'shadow-emerald-500/20', 'ring-2', 'ring-emerald-300', 'scale-105', 'bg-emerald-700')
        btn.classList.add('w-9', 'p-0', 'justify-center', 'bg-transparent', 'border-slate-300', 'dark:border-slate-700')
      }

      // Hover In: Trigger reload animation, shift left, fill emerald, reveal white text
      btn.addEventListener('mouseenter', expand)
      btn.addEventListener('focus', expand)

      // Hover Out / Mouse Leave: Always smoothly discard and return to normal rounded SVG
      btn.addEventListener('mouseleave', collapse)
      btn.addEventListener('blur', collapse)

      // Hover + Click: Smoothly pulse bolder emerald, extra spin, replay loading skeleton and rolling money counter
      btn.addEventListener('click', () => {
        isBusy = true
        expand()
        // Spin icon again
        icon?.classList.remove('rotate-[360deg]')
        void icon?.offsetWidth // trigger reflow for smooth re-spin
        icon?.classList.add('rotate-[360deg]')

        btn.classList.add('scale-105', 'ring-2', 'ring-emerald-300', 'bg-emerald-700')
        label?.classList.add('font-black')

        // Re-trigger MoneyCounter animation on refresh
        this.parent.counter.init()

        setTimeout(() => {
          btn.classList.remove('scale-105', 'ring-2', 'ring-emerald-300', 'bg-emerald-700')
          label?.classList.remove('font-black')
          isBusy = false

          // Smoothly discard if the user is no longer hovering
          if (!btn.matches(':hover')) {
            collapse()
          }
        }, 900)
      })
    }
    // END: AutoExpandRefresh.init - Animation initialized
  }
  // END: AutoExpandRefresh - Subchild ready

  // START: MoneyCounter - Subchild handling smooth rolling money counting animations for Philippine Pesos (₱) and numerical telemetry
  MoneyCounter = class {
    constructor(parent) {
      this.parent = parent
    }

    // START: MoneyCounter.init - Searches elements with [data-count-money] and triggers rolling counter with custom delay
    init(scope = document) {
      const targets = scope.querySelectorAll('[data-count-money]')
      targets.forEach((el, index) => {
        const rawTarget = parseFloat(el.getAttribute('data-count-money') || '0')
        const decimals = el.getAttribute('data-decimals') !== null ? parseInt(el.getAttribute('data-decimals'), 10) : 2
        const target = this.normalizeTarget(rawTarget, decimals)
        const prefix = el.getAttribute('data-prefix') ?? '₱'
        const suffix = el.getAttribute('data-suffix') || ''
        const baseDuration = parseInt(el.getAttribute('data-duration') || '1200', 10)
        const delay = parseInt(el.getAttribute('data-delay') || '0', 10) || (index * 40) // Staggered micro-delay

        setTimeout(() => {
          this.animate(el, target, prefix, suffix, decimals, baseDuration)
        }, delay)
      })
    }
    // END: MoneyCounter.init - Rolling counters scanned

    // START: MoneyCounter.normalizeTarget - Keeps exact 2-decimals (e.g., .73, .86), rounding up only near-whole edge cases (.99+)
    normalizeTarget(val, decimals = 2) {
      if (decimals === 0) return Math.ceil(val)
      const whole = Math.floor(val)
      const fractional = Math.round((val - whole) * 100) / 100
      // If fractional is .99 or above, round up to whole integer
      if (fractional >= 0.99) {
        return whole + 1
      }
      // Otherwise preserve exact 2-decimal precision (e.g. .73, .86, .50)
      return Math.round(val * 100) / 100
    }
    // END: MoneyCounter.normalizeTarget

    // START: MoneyCounter.animate - Smoothly counts numbers from zero to target value with easing
    animate(element, rawTarget, prefix = '₱', suffix = '', decimals = 2, duration = 1200) {
      let startTimestamp = null
      const startValue = 0
      const target = this.normalizeTarget(rawTarget, decimals)

      const formatVal = (val) => {
        const normalized = this.normalizeTarget(val, decimals)
        return `${prefix}${normalized.toLocaleString('en-PH', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}${suffix}`
      }

      // If target is 0 and current element already has content, format immediately
      if (target === 0) {
        element.textContent = formatVal(0)
        return
      }

      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp
        const progress = Math.min((timestamp - startTimestamp) / duration, 1)
        // Ease-out cubic animation formula
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const current = startValue + (target - startValue) * easeOut

        element.textContent = formatVal(current)

        if (progress < 1) {
          window.requestAnimationFrame(step)
        } else {
          element.textContent = formatVal(target)
        }
      }

      window.requestAnimationFrame(step)
    }
    // END: MoneyCounter.animate - Finished count animation
  }
  // END: MoneyCounter - Subchild ready

  // START: ToastManager - Flowbite top indicator toast with smooth drop-in and fade-out animation
  ToastManager = class {
    constructor(parent) {
      this.parent = parent
    }

    // START: ToastManager.show - Displays floating bottom-right indicator toast with variant styling
    show(message = 'Successfully updated!', type = 'success', duration = 3000, callback = null) {
      // Remove any existing toast
      const existing = document.getElementById('indicator-toast')
      if (existing) existing.remove()

      const toast = document.createElement('div')
      toast.id = 'indicator-toast'
      toast.className =
        'fixed bottom-5 right-5 z-[70] flex items-center w-full max-w-sm p-4 text-slate-800 bg-white rounded-2xl shadow-2xl border border-slate-200 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-800 font-poppins transition-all duration-300 translate-x-12 opacity-0'

      // Icon and color badge per type
      let iconBadgeHtml = `
        <div class="inline-flex items-center justify-center shrink-0 w-8 h-8 text-emerald-500 bg-emerald-100 rounded-xl dark:bg-emerald-950/80 dark:text-emerald-400">
          <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 12">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5.917 5.724 10.5 15 1.5"/>
          </svg>
          <span class="sr-only">Success check icon</span>
        </div>
      `

      if (type === 'delete' || type === 'error') {
        iconBadgeHtml = `
          <div class="inline-flex items-center justify-center shrink-0 w-8 h-8 text-rose-500 bg-rose-100 rounded-xl dark:bg-rose-950/80 dark:text-rose-400">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span class="sr-only">Delete icon</span>
          </div>
        `
      } else if (type === 'warning') {
        iconBadgeHtml = `
          <div class="inline-flex items-center justify-center shrink-0 w-8 h-8 text-amber-500 bg-amber-100 rounded-xl dark:bg-amber-950/80 dark:text-amber-400">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span class="sr-only">Warning icon</span>
          </div>
        `
      }

      toast.innerHTML = `
        ${iconBadgeHtml}
        <div class="ms-3 text-xs font-bold font-averta text-slate-900 dark:text-white">${message}</div>
        <button id="toast-close" type="button" class="ms-auto -mx-1.5 -my-1.5 bg-white text-slate-400 hover:text-slate-900 rounded-lg focus:ring-2 focus:ring-slate-300 p-1.5 hover:bg-slate-100 inline-flex items-center justify-center h-8 w-8 dark:text-slate-500 dark:hover:text-white dark:bg-slate-900 dark:hover:bg-slate-800 cursor-pointer transition" aria-label="Close">
          <span class="sr-only">Close</span>
          <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
          </svg>
        </button>
      `

      document.body.appendChild(toast)

      // Animate entry: slide smoothly from bottom-right
      requestAnimationFrame(() => {
        toast.classList.remove('translate-x-12', 'opacity-0')
        toast.classList.add('translate-x-0', 'opacity-100')
      })

      const dismiss = () => {
        toast.classList.remove('translate-x-0', 'opacity-100')
        toast.classList.add('translate-x-12', 'opacity-0')
        setTimeout(() => {
          toast.remove()
          if (callback) callback()
        }, 300)
      }

      toast.querySelector('#toast-close')?.addEventListener('click', dismiss)

      setTimeout(() => {
        if (document.body.contains(toast)) {
          dismiss()
        }
      }, duration)
    }

    // START: ToastManager.showUndo - Displays interactive 3-second countdown toast with circular timer and UNDO button at bottom-right
    showUndo(message, onUndo = null, onExpire = null, duration = 3) {
      // Remove any existing toast
      const existing = document.getElementById('indicator-toast')
      if (existing) existing.remove()

      let remaining = duration
      const circumference = 2 * Math.PI * 12 // r=12 => ~75.4
      let isUndone = false

      const toast = document.createElement('div')
      toast.id = 'indicator-toast'
      toast.className =
        'fixed bottom-5 right-5 z-[70] flex items-center w-full max-w-md p-4 text-slate-800 bg-white rounded-2xl shadow-2xl border border-rose-200 dark:text-slate-100 dark:bg-slate-900 dark:border-rose-900/60 font-poppins transition-all duration-300 translate-x-12 opacity-0'

      toast.innerHTML = `
        <!-- Circular Animated Countdown Indicator -->
        <div class="relative inline-flex items-center justify-center shrink-0 w-9 h-9 text-rose-500">
          <svg class="w-9 h-9 -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="12" stroke-width="2.5" class="stroke-slate-200 dark:stroke-slate-800 fill-none" />
            <circle id="toast-circle" cx="16" cy="16" r="12" stroke-width="2.5" stroke-dasharray="${circumference}" stroke-dashoffset="0" stroke-linecap="round" class="stroke-rose-500 fill-none transition-all duration-1000 ease-linear" />
          </svg>
          <span id="toast-countdown-num" class="absolute text-[11px] font-black font-money text-rose-600 dark:text-rose-400 leading-none">
            ${remaining}
          </span>
        </div>

        <!-- Message Body -->
        <div class="ms-3 flex-1 text-xs font-semibold text-slate-900 dark:text-white truncate">
          ${message}
        </div>

        <!-- Action Buttons: UNDO & Dismiss -->
        <div class="ms-3 flex items-center space-x-1.5 shrink-0">
          <button id="toast-undo" type="button" class="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm transition cursor-pointer">
            Undo
          </button>
          <button id="toast-close" type="button" class="bg-transparent text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center h-7 w-7 transition cursor-pointer" aria-label="Close">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
            </svg>
          </button>
        </div>
      `

      document.body.appendChild(toast)

      // Animate entry: slide smoothly from top-right
      requestAnimationFrame(() => {
        toast.classList.remove('translate-x-12', 'opacity-0')
        toast.classList.add('translate-x-0', 'opacity-100')
      })

      const dismiss = (callback = null) => {
        clearInterval(timerInterval)
        toast.classList.remove('translate-x-0', 'opacity-100')
        toast.classList.add('translate-x-12', 'opacity-0')
        setTimeout(() => {
          toast.remove()
          if (callback) callback()
        }, 300)
      }

      // Countdown ticker interval
      const circleEl = toast.querySelector('#toast-circle')
      const numEl = toast.querySelector('#toast-countdown-num')

      const timerInterval = setInterval(() => {
        remaining -= 1
        if (numEl) numEl.textContent = remaining

        if (circleEl) {
          const offset = circumference - (remaining / duration) * circumference
          circleEl.style.strokeDashoffset = offset
        }

        if (remaining <= 0) {
          clearInterval(timerInterval)
          if (!isUndone) {
            dismiss(() => {
              if (onExpire) onExpire()
            })
          }
        }
      }, 1000)

      // Undo button clicked
      toast.querySelector('#toast-undo')?.addEventListener('click', () => {
        isUndone = true
        clearInterval(timerInterval)
        dismiss(() => {
          if (onUndo) onUndo()
        })
      })

      // Close dismiss button
      toast.querySelector('#toast-close')?.addEventListener('click', () => {
        clearInterval(timerInterval)
        dismiss(() => {
          if (!isUndone && onExpire) onExpire()
        })
      })
    }
    // END: ToastManager.showUndo
  }
  // END: ToastManager - Subchild ready

  // START: InputShakeManager - OOP subchild for smooth sudden-shake error animations on inputs and wrappers
  InputShakeManager = class {
    constructor(parent) {
      this.parent = parent
    }

    /**
     * Triggers a smooth sudden-shake animation on an element, changes borders and labels to rose,
     * and automatically reverts back cleanly when animation finishes or user starts typing.
     * @param {HTMLElement|string} target - Element or selector to shake (e.g. #pass-wrapper or #user-field)
     * @param {HTMLElement|string|null} labelTarget - Label element or selector (e.g. for="pass-field" or for="user-field")
     * @param {number} duration - Duration in milliseconds (default 600ms)
     */
    shake(target, labelTarget = null, duration = 650) {
      const el = typeof target === 'string' ? document.querySelector(target) : target
      const label = typeof labelTarget === 'string' ? document.querySelector(labelTarget) : labelTarget

      if (!el) return

      // Find the inner input element if wrapper was passed
      const inputEl = el.tagName === 'INPUT' ? el : el.querySelector('input')

      // Clear any previous ongoing animation or timeout
      if (el._shakeTimeout) {
        clearTimeout(el._shakeTimeout)
      }

      // Add sudden-shake animation class and rose error border styling
      el.classList.remove('animate-sudden-shake')
      // Force reflow for restart
      void el.offsetWidth
      el.classList.add('animate-sudden-shake')

      // Border and focus ring styling in Tailwind rose colors
      if (el.tagName === 'INPUT') {
        el.classList.add('!border-rose-500', '!ring-rose-500', '!ring-2', 'dark:!border-rose-500')
      } else {
        el.classList.add('!border-rose-500', '!ring-2', '!ring-rose-500', 'rounded-lg')
        if (inputEl) {
          inputEl.classList.add('!border-rose-500', '!ring-rose-500', '!ring-2', 'dark:!border-rose-500')
        }
      }

      // Turn label font red/rose
      if (label) {
        label.classList.add('!text-rose-600', 'dark:!text-rose-400')
      }

      const resetStyles = () => {
        el.classList.remove('animate-sudden-shake')
        if (el.tagName === 'INPUT') {
          el.classList.remove('!border-rose-500', '!ring-rose-500', '!ring-2', 'dark:!border-rose-500')
        } else {
          el.classList.remove('!border-rose-500', '!ring-2', '!ring-rose-500')
          if (inputEl) {
            inputEl.classList.remove('!border-rose-500', '!ring-rose-500', '!ring-2', 'dark:!border-rose-500')
          }
        }
        if (label) {
          label.classList.remove('!text-rose-600', 'dark:!text-rose-400')
        }
      }

      // Automatically reset when user types or focuses
      if (inputEl && !inputEl._hasShakeResetListener) {
        inputEl._hasShakeResetListener = true
        inputEl.addEventListener('input', resetStyles, { once: true })
      }

      // Revert after timeout
      el._shakeTimeout = setTimeout(() => {
        el.classList.remove('animate-sudden-shake')
      }, duration)
    }
  }
  // END: InputShakeManager
}
// END: AnimationsManager - Animations module ready
