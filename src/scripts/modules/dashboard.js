// START: DashboardManager - Manages telemetry data, live Supabase records, and interactive calendar date filtering
export class DashboardManager {
  constructor() {
    this.logs = []
    this.chartsInstance = null
    // Default to mock data date: October 4, 2026
    this.selectedDate = new Date(2026, 9, 4)
    this.viewMonth = 9 // 0-indexed: 9 = October
    this.viewYear = 2026
  }

  // START: DashboardManager.init - Bootstraps dashboard data, calendar picker, and charts binding
  async init(charts = null) {
    this.chartsInstance = charts
    this.initCalendar()
    this.bindEvents()
    this.syncLogsCardMaxHeight()
    window.addEventListener('resize', () => this.syncLogsCardMaxHeight())
    await this.loadData()
  }
  // END: DashboardManager.init - Dashboard ready

  // START: DashboardManager.syncLogsCardMaxHeight - Allows logs-card to size naturally below quick-card
  syncLogsCardMaxHeight() {
    const logsCard = document.getElementById('logs-card')
    if (logsCard) logsCard.style.maxHeight = 'none'
  }
  // END: DashboardManager.syncLogsCardMaxHeight - Ceiling limit synced

  // START: DashboardManager.initCalendar - Builds Flowbite calendar picker UI and date switching logic
  initCalendar() {
    const trigger = document.getElementById('dash-date')
    const dropdown = document.getElementById('date-calendar-dropdown')
    const arrow = document.getElementById('date-arrow')
    const prevBtn = document.getElementById('cal-prev')
    const nextBtn = document.getElementById('cal-next')
    const octBtn = document.getElementById('cal-oct-btn')
    const todayBtn = document.getElementById('cal-today-btn')

    if (!trigger || !dropdown) return

    // Toggle calendar dropdown visibility
    trigger.addEventListener('click', (e) => {
      e.stopPropagation()
      const isHidden = dropdown.classList.contains('hidden')
      if (isHidden) {
        dropdown.classList.remove('hidden')
        arrow?.classList.add('rotate-180')
        this.renderCalendarGrid()
      } else {
        dropdown.classList.add('hidden')
        arrow?.classList.remove('rotate-180')
      }
    })

    // Click outside to dismiss calendar dropdown
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
        dropdown.classList.add('hidden')
        arrow?.classList.remove('rotate-180')
      }
    })

    // Month Navigation: Previous
    prevBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.viewMonth--
      if (this.viewMonth < 0) {
        this.viewMonth = 11
        this.viewYear--
      }
      this.renderCalendarGrid()
    })

    // Month Navigation: Next
    nextBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.viewMonth++
      if (this.viewMonth > 11) {
        this.viewMonth = 0
        this.viewYear++
      }
      this.renderCalendarGrid()
    })

    // Shortcut: October 2026 (Live Mock Data)
    octBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.selectDate(new Date(2026, 9, 4))
      dropdown.classList.add('hidden')
      arrow?.classList.remove('rotate-180')
    })

    // Shortcut: Current Today's Date
    todayBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.selectDate(new Date())
      dropdown.classList.add('hidden')
      arrow?.classList.remove('rotate-180')
    })

    this.updateDateDisplay()
  }
  // END: DashboardManager.initCalendar - Calendar initialized

  // START: DashboardManager.renderCalendarGrid - Generates month days grid inside dropdown
  renderCalendarGrid() {
    const monthYearEl = document.getElementById('cal-month-year')
    const gridEl = document.getElementById('cal-days-grid')
    if (!monthYearEl || !gridEl) return

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    monthYearEl.textContent = `${monthNames[this.viewMonth]} ${this.viewYear}`

    // Compute first day of month and total days
    const firstDayIndex = new Date(this.viewYear, this.viewMonth, 1).getDay()
    const totalDays = new Date(this.viewYear, this.viewMonth + 1, 0).getDate()
    const prevMonthDays = new Date(this.viewYear, this.viewMonth, 0).getDate()

    let html = ''

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i
      html += `<div class="p-1.5 text-slate-300 dark:text-slate-600 cursor-not-allowed select-none">${dayNum}</div>`
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const isSelected =
        this.selectedDate.getDate() === day &&
        this.selectedDate.getMonth() === this.viewMonth &&
        this.selectedDate.getFullYear() === this.viewYear

      const isOct2026Active = this.viewMonth === 9 && this.viewYear === 2026 && day === 4

      let dayClasses = 'p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer font-medium'
      if (isSelected) {
        dayClasses = 'p-1.5 rounded-lg bg-emerald-600 text-white font-bold shadow-xs cursor-pointer'
      } else if (isOct2026Active) {
        dayClasses = 'p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer'
      }

      html += `<button type="button" data-cal-day="${day}" class="${dayClasses}">${day}</button>`
    }

    gridEl.innerHTML = html

    // Bind click to each day button
    gridEl.querySelectorAll('[data-cal-day]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const day = parseInt(btn.getAttribute('data-cal-day'), 10)
        this.selectDate(new Date(this.viewYear, this.viewMonth, day))
        const dropdown = document.getElementById('date-calendar-dropdown')
        const arrow = document.getElementById('date-arrow')
        dropdown?.classList.add('hidden')
        arrow?.classList.remove('rotate-180')
      })
    })
  }
  // END: DashboardManager.renderCalendarGrid - Calendar grid rendered

  // START: DashboardManager.selectDate - Applies user's selected date and updates all stats + charts
  selectDate(date) {
    this.selectedDate = date
    this.viewMonth = date.getMonth()
    this.viewYear = date.getFullYear()
    this.updateDateDisplay()
    this.applyDateFilter()
  }
  // END: DashboardManager.selectDate - Date applied

  // START: DashboardManager.updateDateDisplay - Updates button label with formatted current selected date
  updateDateDisplay() {
    const label = document.getElementById('date-label')
    if (!label) return
    const options = { year: 'numeric', month: 'long', day: 'numeric' }
    label.textContent = this.selectedDate.toLocaleDateString('en-US', options)
  }
  // END: DashboardManager.updateDateDisplay - Date label synced

  // START: DashboardManager.applyDateFilter - Dynamically updates stats and charts based on date
  applyDateFilter() {
    const isOct2026 = this.selectedDate.getMonth() === 9 && this.selectedDate.getFullYear() === 2026
    const revEl = document.getElementById('revenue-amount')
    const termEl = document.getElementById('terminals-amount')
    const monthlyEl = document.getElementById('monthly-amount')
    const fleetWrap = document.getElementById('fleet-card')
    const fleetTitle = document.getElementById('fleet-title')
    const statusMeta = document.getElementById('status-percent-meta')

    // Update ApexCharts double-line and donut distributions
    if (this.chartsInstance && typeof this.chartsInstance.setDateFilter === 'function') {
      this.chartsInstance.setDateFilter(this.selectedDate.getMonth(), this.selectedDate.getFullYear())
    }

    if (isOct2026) {
      // Restore October 2026 telemetry numbers
      if (revEl) revEl.textContent = '₱12,042.00'
      if (termEl) termEl.textContent = '₱11,067.00'
      if (monthlyEl) monthlyEl.textContent = '₱975.00'

      if (statusMeta) {
        statusMeta.innerHTML = `
          <div class="flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span class="text-slate-500 font-medium text-[11px]">Deduction Ratio:</span>
          </div>
          <div class="flex items-center space-x-1">
            <span class="font-extrabold text-rose-600 font-money text-xs">91.9%</span>
            <span class="text-[10px] text-slate-400 font-medium">(₱11,067 / ₱12,042)</span>
          </div>
        `
      }

      if (fleetTitle) {
        fleetTitle.textContent = 'Habwa & Utilities Expense Audit'
      }
      this.restoreFleetTable()
    } else {
      // Date has no mock sample data: stats are all totally ZERO
      if (revEl) revEl.textContent = '₱0'
      if (termEl) termEl.textContent = '₱0'
      if (monthlyEl) monthlyEl.textContent = '₱0'

      if (statusMeta) {
        statusMeta.innerHTML = `
          <div class="flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-slate-300"></span>
            <span class="text-slate-500 font-medium text-[11px]">Deduction Ratio:</span>
          </div>
          <div class="flex items-center space-x-1">
            <span class="font-extrabold text-slate-400 font-money text-xs">0.0%</span>
            <span class="text-[10px] text-slate-400 font-medium">(No records logged)</span>
          </div>
        `
      }

      if (fleetTitle) {
        fleetTitle.textContent = `Audit Logs (${this.selectedDate.toLocaleDateString('en-US')})`
      }

      // Empty audit state for unrecorded dates
      const tbody = document.querySelector('#fleet-table tbody')
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="px-4 py-8 text-center text-slate-400">
              <svg class="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <p class="font-semibold text-xs text-slate-600 dark:text-slate-300">No Habwa or Expense Records Found</p>
              <p class="text-[11px] text-slate-400 mt-0.5">There is no mock sample data for this selected date. Select October 2026 to view historical records.</p>
            </td>
          </tr>
        `
      }
    }
  }
  // END: DashboardManager.applyDateFilter - Filter executed

  // START: DashboardManager.restoreFleetTable - Restores complete October 4 mock rows
  restoreFleetTable() {
    const tbody = document.querySelector('#fleet-table tbody')
    if (!tbody) return
    tbody.innerHTML = `
      <tr class="hover:bg-slate-100">
        <td class="px-3 py-2.5 font-medium text-slate-700">10/04/2026</td>
        <td class="px-3 py-2.5 font-bold text-slate-900">PISONET 1 & 2 Combined Coin Drop Collection</td>
        <td class="px-3 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">Habwa Deposit</span></td>
        <td class="px-3 py-2.5 text-right font-bold text-emerald-600 font-money">+₱5,689</td>
      </tr>
      <tr class="hover:bg-slate-100">
        <td class="px-3 py-2.5 font-medium text-slate-700">10/04/2026</td>
        <td class="px-3 py-2.5 font-bold text-slate-900">PISONET 3 Coin Drop Collection</td>
        <td class="px-3 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">Habwa Deposit</span></td>
        <td class="px-3 py-2.5 text-right font-bold text-emerald-600 font-money">+₱5,332</td>
      </tr>
      <tr class="hover:bg-slate-100">
        <td class="px-3 py-2.5 font-medium text-slate-700">10/04/2026</td>
        <td class="px-3 py-2.5 font-bold text-slate-900">PISONET 4 Coin Drop Collection</td>
        <td class="px-3 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">Habwa Deposit</span></td>
        <td class="px-3 py-2.5 text-right font-bold text-emerald-600 font-money">+₱1,021</td>
      </tr>
      <tr class="hover:bg-slate-100">
        <td class="px-3 py-2.5 font-medium text-slate-700">10/04/2026</td>
        <td class="px-3 py-2.5 font-bold text-slate-900">PC-4 Return to Owner Deduction</td>
        <td class="px-3 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">Direct Return</span></td>
        <td class="px-3 py-2.5 text-right font-bold text-rose-600 font-money">-₱1,021</td>
      </tr>
      <tr class="hover:bg-slate-100">
        <td class="px-3 py-2.5 font-medium text-slate-700">10/04/2026</td>
        <td class="px-3 py-2.5 font-bold text-slate-900">Electricity & Power Utility Allocation</td>
        <td class="px-3 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">Utility Bill</span></td>
        <td class="px-3 py-2.5 text-right font-bold text-rose-600 font-money">-₱5,240</td>
      </tr>
      <tr class="hover:bg-slate-100">
        <td class="px-3 py-2.5 font-medium text-slate-700">10/04/2026</td>
        <td class="px-3 py-2.5 font-bold text-slate-900">PLDT Home Fiber Internet Connectivity</td>
        <td class="px-3 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-100 text-teal-800">ISP Telecom</span></td>
        <td class="px-3 py-2.5 text-right font-bold text-rose-600 font-money">-₱1,806</td>
      </tr>
      <tr class="hover:bg-slate-100">
        <td class="px-3 py-2.5 font-medium text-slate-700">10/04/2026</td>
        <td class="px-3 py-2.5 font-bold text-slate-900">Other / Miscellaneous Operational Overhead</td>
        <td class="px-3 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">Operations</span></td>
        <td class="px-3 py-2.5 text-right font-bold text-rose-600 font-money">-₱3,000</td>
      </tr>
      <tr class="hover:bg-slate-100">
        <td class="px-3 py-2.5 font-medium text-slate-700">10/04/2026</td>
        <td class="px-3 py-2.5 font-bold text-slate-900">Optical Gaming Mouse & Keyboard Replacement (Unit 2)</td>
        <td class="px-3 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800">Hardware</span></td>
        <td class="px-3 py-2.5 text-right font-bold text-slate-500 font-money">₱0 (Stock)</td>
      </tr>
      <tr class="hover:bg-slate-100">
        <td class="px-3 py-2.5 font-medium text-slate-700">10/04/2026</td>
        <td class="px-3 py-2.5 font-bold text-slate-900">Coin Slot Electronic Sensor Cleaning & Calibration</td>
        <td class="px-3 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800">Maintenance</span></td>
        <td class="px-3 py-2.5 text-right font-bold text-slate-500 font-money">₱0 (Self)</td>
      </tr>
      <tr class="hover:bg-slate-100">
        <td class="px-3 py-2.5 font-medium text-slate-700">10/04/2026</td>
        <td class="px-3 py-2.5 font-bold text-slate-900">Cat6 Gigabit LAN Cable Crimp & RJ45 Termination</td>
        <td class="px-3 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-100 text-teal-800">Network</span></td>
        <td class="px-3 py-2.5 text-right font-bold text-slate-500 font-money">₱0 (Internal)</td>
      </tr>
      <tr class="hover:bg-slate-100">
        <td class="px-3 py-2.5 font-medium text-slate-700">10/04/2026</td>
        <td class="px-3 py-2.5 font-bold text-slate-900">Attendant Refreshment & Snack Token Allowance</td>
        <td class="px-3 py-2.5"><span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800">Allowance</span></td>
        <td class="px-3 py-2.5 text-right font-bold text-slate-500 font-money">₱0 (Included)</td>
      </tr>
    `
  }
  // END: DashboardManager.restoreFleetTable - Rows restored

  // START: DashboardManager.bindEvents - Attaches refresh event listener
  bindEvents() {
    const refreshBtn = document.getElementById('dash-refresh')
    refreshBtn?.addEventListener('click', () => {
      this.applyDateFilter()
      this.loadData()
    })
  }
  // END: DashboardManager.bindEvents - Event listeners bound

  // START: DashboardManager.loadData - Fetches live records from Supabase
  async loadData() {
    const container = document.getElementById('dash-log-list')
    if (!container) return

    container.innerHTML = `<p class="text-sm text-gray-500 py-4 text-center animate-pulse">Querying live Supabase data...</p>`

    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        this.renderFallback(container, error.message)
        return
      }

      this.logs = data || []
      this.render(container)
    } catch (err) {
      this.renderFallback(container, err.message)
    }
  }
  // END: DashboardManager.loadData - Records fetched and rendered

  // START: DashboardManager.handleQuickAdd - Inserts telemetry coin drop event into Supabase
  async handleQuickAdd() {
    try {
      const { error } = await supabase
        .from('system_logs')
        .insert([{ action: 'Pisonet Coin Drop (₱5)', status: 'Success' }])

      if (error) throw error
      await this.loadData()
    } catch (err) {
      console.warn('Supabase Insert:', err.message)
      alert(`Insert Note: ${err.message}`)
    }
  }
  // END: DashboardManager.handleQuickAdd - Coin drop logged

  // START: DashboardManager.render - Displays logs in the telemetry feed
  render(container) {
    if (this.logs.length === 0) {
      container.innerHTML = `<p class="text-sm text-gray-400 py-4 text-center">No records found. Supabase is connected!</p>`
      return
    }

    container.innerHTML = this.logs.map(log => `
      <div class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
        <span class="text-sm font-medium text-gray-900 dark:text-white">${log.action}</span>
        <span class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold">${log.status}</span>
      </div>
    `).join('')
  }
  // END: DashboardManager.render - Feed updated

  // START: DashboardManager.renderFallback - Displays informative status alert
  renderFallback(container, message) {
    container.innerHTML = `
      <div class="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs">
        <p class="font-bold text-blue-900 dark:text-blue-300 mb-1">Direct Supabase HTTPS REST Active</p>
        <p class="text-blue-700 dark:text-blue-400">Notice: ${message}.</p>
        <p class="text-gray-500 dark:text-gray-400 mt-2">When deploying to Vercel, set your <code>VITE_SUPABASE_ANON_KEY</code> in Vercel Environment Variables.</p>
      </div>
    `
  }
  // END: DashboardManager.renderFallback - Fallback rendered
}
// END: DashboardManager - Dashboard manager module ready
