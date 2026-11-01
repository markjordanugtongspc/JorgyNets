// START: DashboardManager - Manages telemetry data, live Supabase records, and interactive calendar date filtering
import { habwaApi, billsApi, requestsApi, usersApi, storageManager } from '../../api/index.js'

export class DashboardManager {
  constructor() {
    this.habwaRecords = []
    this.billsRecords = []
    this.requestsRecords = []
    this.chartsInstance = null

    // Calendar state
    this.selectedDate = new Date()
    this.viewMonth = this.selectedDate.getMonth()
    this.viewYear = this.selectedDate.getFullYear()

    const sessionRole = storageManager.session.getRole()
    this.isUserPortal = window.location.pathname.includes('/users/') || (sessionRole && sessionRole !== '0')
    this.currentUserId = storageManager.session.getUserId()
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
  // END: DashboardManager.syncLogsCardMaxHeight

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

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
        dropdown.classList.add('hidden')
        arrow?.classList.remove('rotate-180')
      }
    })

    prevBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.viewMonth--
      if (this.viewMonth < 0) {
        this.viewMonth = 11
        this.viewYear--
      }
      this.renderCalendarGrid()
    })

    nextBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.viewMonth++
      if (this.viewMonth > 11) {
        this.viewMonth = 0
        this.viewYear++
      }
      this.renderCalendarGrid()
    })

    octBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.selectDate(new Date(2026, 9, 4))
      dropdown.classList.add('hidden')
      arrow?.classList.remove('rotate-180')
    })

    todayBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.selectDate(new Date())
      dropdown.classList.add('hidden')
      arrow?.classList.remove('rotate-180')
    })

    this.updateDateDisplay()
  }
  // END: DashboardManager.initCalendar

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

    const firstDayIndex = new Date(this.viewYear, this.viewMonth, 1).getDay()
    const totalDays = new Date(this.viewYear, this.viewMonth + 1, 0).getDate()

    let html = ''
    for (let i = 0; i < firstDayIndex; i++) {
      html += '<span class="p-1.5 text-slate-300 dark:text-slate-700"></span>'
    }

    const today = new Date()
    for (let day = 1; day <= totalDays; day++) {
      const isSelected =
        this.selectedDate.getDate() === day &&
        this.selectedDate.getMonth() === this.viewMonth &&
        this.selectedDate.getFullYear() === this.viewYear

      const isToday =
        today.getDate() === day &&
        today.getMonth() === this.viewMonth &&
        today.getFullYear() === this.viewYear

      let btnClass = 'p-1.5 rounded-lg font-medium transition cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800'
      if (isSelected) {
        btnClass = 'p-1.5 rounded-lg font-bold bg-blue-600 text-white shadow-xs cursor-pointer'
      } else if (isToday) {
        btnClass += ' text-blue-600 dark:text-blue-400 font-bold border border-blue-500/30'
      } else {
        btnClass += ' text-slate-700 dark:text-slate-300'
      }

      html += `<button type="button" class="${btnClass}" data-cal-day="${day}">${day}</button>`
    }

    gridEl.innerHTML = html

    gridEl.querySelectorAll('[data-cal-day]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const day = parseInt(btn.getAttribute('data-cal-day'), 10)
        this.selectDate(new Date(this.viewYear, this.viewMonth, day))
        document.getElementById('date-calendar-dropdown')?.classList.add('hidden')
        document.getElementById('date-arrow')?.classList.remove('rotate-180')
      })
    })
  }

  selectDate(date) {
    this.selectedDate = date
    this.viewMonth = date.getMonth()
    this.viewYear = date.getFullYear()
    this.updateDateDisplay()
    this.applyDateFilter()
  }

  updateDateDisplay() {
    const label = document.getElementById('date-label')
    if (!label) return
    const options = { year: 'numeric', month: 'long', day: 'numeric' }
    label.textContent = this.selectedDate.toLocaleDateString('en-US', options)
  }

  // START: DashboardManager.loadData - Fetches live telemetry from Supabase
  async loadData() {
    try {
      const currentUid = this.currentUserId || storageManager.session.getUserId()

      const [habwaRes, billsRes, reqRes] = await Promise.all([
        this.isUserPortal && currentUid ? habwaApi.getByOwner(currentUid) : habwaApi.getAll(),
        this.isUserPortal && currentUid ? billsApi.getByOwner(currentUid) : billsApi.getAll(),
        this.isUserPortal && currentUid ? requestsApi.getByOwner(currentUid) : requestsApi.getAll()
      ])

      this.habwaRecords = habwaRes.success ? (habwaRes.data || []) : []
      this.billsRecords = billsRes.success ? (billsRes.data || []) : []
      this.requestsRecords = reqRes.success ? (reqRes.data || []) : []

      this.applyDateFilter()
    } catch {
      // Fallback gracefully
    }
  }

  // START: DashboardManager.applyDateFilter - Recomputes live KPI cards and fleet table
  applyDateFilter() {
    const revEl = document.getElementById('revenue-amount')
    const termEl = document.getElementById('terminals-count') || document.getElementById('terminals-amount')
    const monthlyEl = document.getElementById('monthly-amount')
    const statusMeta = document.getElementById('status-percent-meta')
    const fleetTitle = document.getElementById('fleet-title')

    // Filter habwa and bills according to selected month or all-time if empty
    const selectedMonth = this.selectedDate.getMonth()
    const selectedYear = this.selectedDate.getFullYear()

    let filteredHabwa = this.habwaRecords.filter((h) => {
      if (!h.harvested_at) return true
      const d = new Date(h.harvested_at)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
    })
    // If no records in chosen month, fallback to full dataset so stats aren't blank
    if (filteredHabwa.length === 0) {
      filteredHabwa = this.habwaRecords
    }

    let filteredBills = this.billsRecords.filter((b) => {
      if (!b.bill_date) return true
      const d = new Date(b.bill_date)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
    })
    if (filteredBills.length === 0) {
      filteredBills = this.billsRecords
    }

    // Gross Revenue
    const grossRevenue = filteredHabwa.reduce((sum, h) => sum + (Number(h.amount) || 0), 0)

    // Deductions: Bills + ONLY Approved Requests (Pending requests do NOT deduct!)
    let billsTotal = 0
    if (this.isUserPortal) {
      const uid = this.currentUserId || storageManager.session.getUserId()
      filteredBills.forEach((b) => {
        const breakdown = Array.isArray(b.detailed_breakdown) ? b.detailed_breakdown : []
        const userShare = breakdown.find((item) => item.owner_id === uid)
        if (userShare && userShare.shareAmount) {
          billsTotal += Number(userShare.shareAmount || 0)
        } else if (b.owner_ids && b.owner_ids.length > 0 && b.owner_ids.includes(uid)) {
          billsTotal += Number(b.total_amount || 0) / b.owner_ids.length
        }
      })
    } else {
      billsTotal = filteredBills.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0)
    }

    // Approved requests only
    const approvedRequests = this.requestsRecords.filter((r) => r.status === 'Approved')
    const approvedReqTotal = approvedRequests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

    const totalDeductions = billsTotal + approvedReqTotal
    const netProfit = Math.max(0, grossRevenue - totalDeductions)
    const deductionRatio = grossRevenue > 0 ? ((totalDeductions / grossRevenue) * 100).toFixed(1) : '0.0'

    // Update KPI Card UI values & data-count-money attributes to prevent counter resets
    if (revEl) {
      revEl.setAttribute('data-count-money', grossRevenue)
      revEl.textContent = `₱${Math.ceil(grossRevenue).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
    }
    if (termEl) {
      termEl.setAttribute('data-count-money', totalDeductions)
      termEl.textContent = `-₱${Math.ceil(totalDeductions).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
    }
    if (monthlyEl) {
      monthlyEl.setAttribute('data-count-money', netProfit)
      monthlyEl.textContent = `₱${Math.ceil(netProfit).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
    }

    // If MoneyCounter is accessible and cards are already revealed, animate the counters to live Supabase amounts
    const counter = window.animationsManager?.counter
    if (counter && revEl && !revEl.classList.contains('hidden')) {
      counter.animate(revEl, grossRevenue, '₱', '', 0, 800)
      if (termEl) counter.animate(termEl, totalDeductions, '-₱', '', 0, 800)
      if (monthlyEl) counter.animate(monthlyEl, netProfit, '₱', '', 0, 800)
    }

    if (statusMeta) {
      statusMeta.innerHTML = `
        <div class="flex items-center space-x-1.5">
          <span class="w-2 h-2 rounded-full ${Number(deductionRatio) > 80 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}"></span>
          <span class="text-slate-500 font-medium text-[11px]">Deduction Ratio:</span>
        </div>
        <div class="flex items-center space-x-1">
          <span class="font-extrabold ${Number(deductionRatio) > 80 ? 'text-rose-600' : 'text-emerald-600'} font-money text-xs">${deductionRatio}%</span>
          <span class="text-[10px] text-slate-400 font-medium">(₱${Math.ceil(totalDeductions).toLocaleString()} / ₱${Math.ceil(grossRevenue).toLocaleString()})</span>
        </div>
      `
    }

    if (fleetTitle) {
      fleetTitle.textContent = `Live Telemetry Audit (${this.selectedDate.toLocaleDateString('en-US')})`
    }

    // Update #logs-card with live database numbers
    this.updateLogsCard(grossRevenue, totalDeductions, netProfit)

    // Sync ApexCharts Annual Sales Trends with live Supabase habwa and bills
    if (this.chartsInstance && typeof this.chartsInstance.updateSalesBreakdown === 'function') {
      this.chartsInstance.updateSalesBreakdown(this.habwaRecords, this.billsRecords, selectedYear)
    }

    // Sync ApexCharts Donut with live Supabase expense categories
    if (this.chartsInstance && typeof this.chartsInstance.updateExpensesBreakdown === 'function') {
      this.chartsInstance.updateExpensesBreakdown(filteredBills, grossRevenue, totalDeductions)
    }

    // Filter requests according to selected month or all-time if empty
    let filteredRequests = this.requestsRecords.filter((r) => {
      if (!r.created_at) return true
      const d = new Date(r.created_at)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
    })
    if (filteredRequests.length === 0) {
      filteredRequests = this.requestsRecords
    }

    // Render live Supabase transactions in #fleet-table
    this.renderFleetTable(filteredHabwa, filteredBills, filteredRequests)
  }

  // START: DashboardManager.updateLogsCard - Populates telemetry breakdown in logs-card
  updateLogsCard(grossRevenue, totalDeductions, netProfit) {
    const habwaAmt = document.getElementById('logs-habwa-amt')
    const deductAmt = document.getElementById('logs-deduct-amt')
    const netAmt = document.getElementById('logs-net-amt')
    const auditedDate = document.getElementById('logs-audited-date')
    const statusIndicator = document.getElementById('logs-status-indicator')

    if (habwaAmt) {
      habwaAmt.textContent = `+₱${Math.ceil(grossRevenue).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
    }
    if (deductAmt) {
      deductAmt.textContent = `-₱${Math.ceil(totalDeductions).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
    }
    if (netAmt) {
      netAmt.textContent = `₱${Math.ceil(netProfit).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
    }
    if (auditedDate) {
      auditedDate.textContent = `Audited: ${this.selectedDate.toLocaleDateString('en-US')}`
    }
    if (statusIndicator) {
      const isBalanced = netProfit >= 0
      statusIndicator.textContent = isBalanced
        ? `Status: Balanced (₱${Math.ceil(netProfit).toLocaleString('en-PH')} Net)`
        : `Status: Deficit (-₱${Math.ceil(Math.abs(netProfit)).toLocaleString('en-PH')} Net)`
      statusIndicator.className = `font-semibold ${isBalanced ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`
    }
  }

  // START: DashboardManager.getCategoryBadge - Resolves uniform category tag badge styles matching Habwa, Bills, and Requests tables
  getCategoryBadge(category = '', type = 'bill') {
    const cat = (category || '').trim()
    const catLower = cat.toLowerCase()

    if (type === 'habwa' || catLower.includes('habwa')) {
      return {
        name: cat || 'Habwa Deposit',
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
      }
    }

    if (type === 'request') {
      if (catLower.includes('mama') || catLower.includes('personal') || catLower.includes('withdrawal')) {
        return {
          name: cat || 'Personal Deduction',
          badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
        }
      }
      if (catLower.includes('panda') || catLower.includes('food') || catLower.includes('meal') || catLower.includes('delivery')) {
        return {
          name: cat || 'Food Delivery',
          badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-300 dark:border-orange-700'
        }
      }
      if (catLower.includes('emergency') || catLower.includes('advance') || catLower.includes('cash')) {
        return {
          name: cat || 'Cash Advance',
          badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
        }
      }
      if (catLower.includes('hardware') || catLower.includes('chute') || catLower.includes('maintenance')) {
        return {
          name: cat || 'Chute Spare',
          badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
        }
      }
      if (catLower.includes('grocer') || catLower.includes('store') || catLower.includes('supplies')) {
        return {
          name: cat || 'Store Supplies',
          badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-300 dark:border-teal-700'
        }
      }
      if (catLower.includes('grab') || catLower.includes('transpo') || catLower.includes('taxi')) {
        return {
          name: cat || 'Transportation',
          badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700'
        }
      }
      if (catLower.includes('med') || catLower.includes('pharmacy')) {
        return {
          name: cat || 'Medicine',
          badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
        }
      }
      return {
        name: cat || 'Request Deduction',
        badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
      }
    }

    // Bills categories
    if (catLower.includes('elec') || catLower.includes('veco') || catLower.includes('power')) {
      return {
        name: cat || 'VECO ELECTRICITY',
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
      }
    }
    if (catLower.includes('pldt') || catLower.includes('converge') || catLower.includes('internet') || catLower.includes('fiber')) {
      return {
        name: cat || 'PLDT FIBR INTERNET',
        badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-700'
      }
    }
    if (catLower.includes('water')) {
      return {
        name: cat || 'WATER UTILITY',
        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
      }
    }
    if (catLower.includes('chute') || catLower.includes('repair') || catLower.includes('maintenance')) {
      return {
        name: cat || 'COIN CHUTE CLEANING & REPAIRS',
        badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
      }
    }
    if (catLower.includes('switch') || catLower.includes('network') || catLower.includes('hardware')) {
      return {
        name: cat || 'NETWORK SWITCH UPGRADE',
        badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
      }
    }

    return {
      name: cat || 'Utility Bill',
      badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
    }
  }

  // START: DashboardManager.renderFleetTable - Renders live Supabase transactions
  renderFleetTable(habwaList = [], billsList = [], requestsList = []) {
    const tbody = document.querySelector('#fleet-table tbody')
    if (!tbody) return

    const combined = [
      ...habwaList.map((h) => {
        const badge = this.getCategoryBadge(h.category || 'Habwa Deposit', 'habwa')
        return {
          date: h.harvested_at ? h.harvested_at.slice(0, 10) : '2026-10-04',
          desc: `${h.description || 'Coin Box Habwa'} • ${h.users?.full_name || 'Unit Owner'}`,
          category: badge.name,
          badgeClass: badge.badgeClass,
          amount: Number(h.amount || 0),
          isCredit: true
        }
      }),
      ...billsList.map((b) => {
        const badge = this.getCategoryBadge(b.category || 'Utility Bill', 'bill')
        return {
          date: b.bill_date || '2026-10-04',
          desc: b.description || 'Operational Utility Deduction',
          category: badge.name,
          badgeClass: badge.badgeClass,
          amount: Number(b.total_amount || 0),
          isCredit: false
        }
      }),
      ...requestsList.map((r) => {
        const badge = this.getCategoryBadge(r.category || 'Request Deduction', 'request')
        const ownerName = r.users?.full_name || 'Unit Owner'
        return {
          date: r.created_at ? r.created_at.slice(0, 10) : (r.date || '2026-10-04'),
          desc: `${r.ref_code ? `${r.ref_code} • ` : ''}${ownerName} (${r.status || 'Pending'})`,
          category: badge.name,
          badgeClass: badge.badgeClass,
          amount: Number(r.amount || 0),
          isCredit: false
        }
      })
    ].sort((a, b) => new Date(b.date) - new Date(a.date))

    if (combined.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="px-4 py-8 text-center text-slate-400">
            <svg class="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <p class="font-semibold text-xs text-slate-600 dark:text-slate-300">No Transactions Found</p>
            <p class="text-[11px] text-slate-400 mt-0.5">Habwa, Bills, and Requests added through drawers will appear here dynamically.</p>
          </td>
        </tr>
      `
      return
    }

    tbody.innerHTML = combined.slice(0, 8).map((item) => `
      <tr class="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition">
        <td class="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
          ${item.date}
        </td>
        <td class="px-3 py-2.5 font-bold text-slate-900 dark:text-white">
          ${item.desc}
        </td>
        <td class="px-3 py-2.5">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${item.badgeClass}">${item.category}</span>
        </td>
        <td class="px-3 py-2.5 text-right font-bold ${item.isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} font-money whitespace-nowrap">
          ${item.isCredit ? '+' : '-'}₱${Math.ceil(item.amount).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
        </td>
      </tr>
    `).join('')
  }

  bindEvents() {
    const refreshBtn = document.getElementById('dash-refresh')
    refreshBtn?.addEventListener('click', async () => {
      refreshBtn.querySelector('svg')?.classList.add('animate-spin')
      await this.loadData()
      setTimeout(() => {
        refreshBtn.querySelector('svg')?.classList.remove('animate-spin')
      }, 500)
    })
  }
}
