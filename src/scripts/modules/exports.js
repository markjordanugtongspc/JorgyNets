// START: ExportsManager - Manages live document print layout preview, custom filtering, and pagination
import { AnimationsManager } from './animations.js'
import { injectComponent } from './injector.js'
import { habwaApi, billsApi, requestsApi, storageManager } from '../../api/index.js'

export class ExportsManager {
  constructor(drawerManager = null) {
    this.drawerManager = drawerManager
    this.animations = new AnimationsManager()

    const sessionRole = sessionStorage.getItem('jn_session_role')
    this.isUserPortal = window.location.pathname.includes('/users/') || (sessionRole && sessionRole !== '0')
    this.currentOwnerName = sessionStorage.getItem('jn_session_user') || 'Kuya Jorgy'

    // Default Filter Criteria
    this.currentFilters = {
      scope: this.isUserPortal ? 'My Combined Ledger' : 'ALL SYSTEM DATA (Full Combined Ledger)',
      owner: this.isUserPortal ? this.currentOwnerName : 'ALL OWNERS (Full Fleet)',
      units: 'ALL PISONET UNITS',
      startDate: '',
      endDate: ''
    }

    // Live Telemetry Records initialized empty (wiped mock data)
    this.masterRecords = []
  }

  // START: ExportsManager.init - Injects print sheet component, binds events, and renders live preview
  async init() {
    await this.mountPrintComponent()
    await this.loadFromSupabase()
    this.bindEvents()
    this.renderPreview()
  }
  // END: ExportsManager.init

  // START: ExportsManager.loadFromSupabase - Queries live records across habwa, bills, and requests
  async loadFromSupabase() {
    try {
      const currentUid = sessionStorage.getItem('jn_session_uid') || storageManager.session.getUserId()

      const [habwaRes, billsRes, reqRes] = await Promise.all([
        this.isUserPortal && currentUid ? habwaApi.getByOwner(currentUid) : habwaApi.getAll(),
        this.isUserPortal && currentUid ? billsApi.getByOwner(currentUid) : billsApi.getAll(),
        this.isUserPortal && currentUid ? requestsApi.getByOwner(currentUid) : requestsApi.getAll()
      ])

      const records = []
      if (habwaRes.success && Array.isArray(habwaRes.data)) {
        habwaRes.data.forEach((h) => {
          const unitDigits = (h.users?.units || '1 Unit').replace(/[^0-9]/g, '')
          records.push({
            id: h.ref_code,
            category: 'Coin Revenue & Habwa',
            desc: h.description || 'Pisonet Coin Harvest Deposit',
            owner: h.users ? `${h.users.full_name} (${unitDigits ? unitDigits + ' Units' : '1 Unit'})` : 'Unit Owner',
            units: unitDigits ? `Unit ${unitDigits}` : 'All Units',
            amount: Number(h.amount),
            type: 'credit',
            date: h.harvested_at ? h.harvested_at.slice(0, 10) : '2026-11-03',
            attendant: h.attendant || 'Admin Leo',
            status: h.status || 'Audited'
          })
        })
      }
      if (billsRes.success && Array.isArray(billsRes.data)) {
        billsRes.data.forEach((b) => {
          let userAmount = Number(b.total_amount)
          if (this.isUserPortal && currentUid) {
            const breakdown = Array.isArray(b.detailed_breakdown) ? b.detailed_breakdown : []
            const userShare = breakdown.find((item) => item.owner_id === currentUid)
            if (userShare && userShare.shareAmount) {
              userAmount = Number(userShare.shareAmount)
            } else if (b.owner_ids && b.owner_ids.includes(currentUid)) {
              userAmount = Number(b.total_amount) / (b.owner_ids.length || 1)
            }
          }
          records.push({
            id: b.ref_code,
            category: 'Operational Bills',
            desc: b.category ? `${b.category}${b.description ? ': ' + b.description : ''}` : (b.description || 'Operational Expense'),
            owner: (b.owner_ids && b.owner_ids.length > 1) ? `ALL (${b.owner_ids.length} OWNERS)` : (b.detailed_breakdown?.[0]?.name || 'Unit Owner'),
            units: 'All Units',
            amount: -Math.abs(userAmount),
            type: 'debit',
            date: b.bill_date || '2026-11-03',
            attendant: b.attendant || 'Admin Leo',
            status: b.status || 'Audited'
          })
        })
      }
      if (reqRes.success && Array.isArray(reqRes.data)) {
        reqRes.data.forEach((r) => {
          const unitDigits = (r.users?.units || '1 Unit').replace(/[^0-9]/g, '')
          records.push({
            id: r.ref_code,
            category: 'Owner Expense Requests',
            desc: r.category || 'Advance / Withdrawal Request',
            owner: r.users ? `${r.users.full_name} (${unitDigits ? unitDigits + ' Units' : '1 Unit'})` : 'Unit Owner',
            units: unitDigits ? `Unit ${unitDigits}` : 'All Units',
            amount: -Math.abs(Number(r.amount)),
            type: 'debit',
            date: r.request_date || '2026-11-03',
            attendant: 'Attendant Verified',
            status: r.status || 'Pending'
          })
        })
      }

      this.masterRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date))
    } catch (err) {
      console.warn('Exports loadFromSupabase error:', err)
    }
  }
  // END: ExportsManager.loadFromSupabase

  // START: ExportsManager.mountPrintComponent - Injects custom print layout from /src/components/exports.html
  async mountPrintComponent() {
    const container = document.getElementById('exports-container-card')
    if (!container) return

    // Inject reusable exports.html template
    await injectComponent('#exports-container-card', '/src/components/exports.html')
  }
  // END: ExportsManager.mountPrintComponent

  // START: ExportsManager.bindEvents - Binds page-level print and download buttons
  bindEvents() {
    // Top action triggers
    document.getElementById('print-btn')?.addEventListener('click', () => {
      window.print()
    })

    document.getElementById('csv-btn')?.addEventListener('click', () => {
      const fileName = `JorgyNets_Export_${new Date().toISOString().slice(0, 10)}.csv`
      this.triggerDownload('csv', fileName)
    })

    document.getElementById('json-btn')?.addEventListener('click', () => {
      const fileName = `JorgyNets_Export_${new Date().toISOString().slice(0, 10)}.json`
      this.triggerDownload('json', fileName)
    })
  }
  // END: ExportsManager.bindEvents

  // START: ExportsManager.updatePreviewFilters - Called by drawer controllers when filters change
  updatePreviewFilters(filters) {
    this.currentFilters = { ...this.currentFilters, ...filters }
    this.renderPreview()
  }
  // END: ExportsManager.updatePreviewFilters

  // START: ExportsManager.filterRecords - Selects and filters telemetry items according to configured scope and owner
  filterRecords() {
    const { scope, owner, units, startDate, endDate } = this.currentFilters

    return this.masterRecords.filter(item => {
      // 1. Filter by Scope
      let matchScope = true
      if (scope) {
        const s = scope.toLowerCase()
        if (s.includes('all') || s.includes('combined')) {
          matchScope = true
        } else if (s.includes('bill') || s.includes('deduction')) {
          matchScope = item.category === 'Operational Bills'
        } else if (s.includes('habwa') || s.includes('revenue') || s.includes('coin')) {
          matchScope = item.category === 'Coin Revenue & Habwa'
        } else if (s.includes('request') || s.includes('advance')) {
          matchScope = item.category === 'Owner Expense Requests'
        }
      }

      // 2. Filter by Owner
      let matchOwner = true
      if (owner && !owner.toUpperCase().includes('ALL OWNERS')) {
        const ownerClean = owner.split('(')[0].trim().toLowerCase()
        matchOwner = item.owner.toLowerCase().includes(ownerClean) || item.owner.toUpperCase().includes('ALL')
      }

      // 3. Filter by Units
      let matchUnits = true
      if (units && !units.toUpperCase().includes('ALL')) {
        const unitNumber = units.replace(/[^0-9]/g, '').trim()
        matchUnits = item.units.includes(unitNumber) || item.units.toLowerCase().includes('all')
      }

      // 4. Filter by Date Range
      let matchDate = true
      if (startDate && item.date < startDate) matchDate = false
      if (endDate && item.date > endDate) matchDate = false

      return matchScope && matchOwner && matchUnits && matchDate
    })
  }
  // END: ExportsManager.filterRecords

  // START: ExportsManager.renderPreview - Renders metadata, summary cards, and paginated tables (10 per page)
  renderPreview() {
    const filtered = this.filterRecords()

    // 1. Update Document Metadata Header
    const paramScope = document.getElementById('param-scope')
    const paramOwner = document.getElementById('param-owner')
    const paramUnits = document.getElementById('param-units')
    const paramRange = document.getElementById('param-range')
    const genTimestamp = document.getElementById('gen-timestamp')
    const creditYear = document.getElementById('credit-year')

    if (paramScope) paramScope.textContent = this.currentFilters.scope
    if (paramOwner) paramOwner.textContent = this.currentFilters.owner
    if (paramUnits) paramUnits.textContent = this.currentFilters.units
    if (paramRange) paramRange.textContent = `${this.currentFilters.startDate} ~ ${this.currentFilters.endDate}`
    
    // Format timestamp: October 31, 2026, 10:02 PM GMT +08 (12-hour format)
    const now = new Date()
    const options = {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }
    const formattedDate = new Intl.DateTimeFormat('en-US', options).format(now)
    if (genTimestamp) genTimestamp.textContent = `${formattedDate} GMT +08`
    if (creditYear) creditYear.textContent = now.getFullYear().toString()

    // 2. Compute Summary Ribbon Values
    let grossHarvest = 0
    let totalDeductions = 0

    filtered.forEach(item => {
      if (item.amount > 0) {
        grossHarvest += item.amount
      } else {
        totalDeductions += Math.abs(item.amount)
      }
    })

    const netPayout = grossHarvest - totalDeductions

    const totalRevEl = document.getElementById('total-revenue')
    const totalDedEl = document.getElementById('total-deductions')
    const totalNetEl = document.getElementById('total-net')
    const totalUnitsEl = document.getElementById('total-units')

    if (totalRevEl) totalRevEl.textContent = `₱${grossHarvest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    if (totalDedEl) totalDedEl.textContent = `-₱${totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    if (totalNetEl) totalNetEl.textContent = `₱${netPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    if (totalUnitsEl) totalUnitsEl.textContent = `${filtered.length} Entries Audited`

    // 3. Render Continuous Flowbite Stripped Column Table (Doomscrolling on screen, 10-row page break on print)
    const container = document.getElementById('preview-table-container')
    if (!container) return

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-400 dark:text-slate-500">
          <p class="text-xs font-semibold">No records found for the selected scope and date parameters.</p>
        </div>
      `
      return
    }

    container.innerHTML = `
      <!-- Flowbite Stripped Column Table Matching Habwa & Bills -->
      <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300">
        <table id="export-preview-table" class="w-full text-xs text-left rtl:text-right text-slate-600 dark:text-slate-300 print:text-slate-800 bg-dirty-white dark:bg-slate-900 print:bg-white">
          
          <!-- Table Thead with Alternating Stripped Column Shading Matching Habwa -->
          <thead class="text-[11px] text-slate-700 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-800 bg-dirty-white dark:bg-slate-900 print:bg-slate-100">
            <tr>
              <!-- Col 1: Transaction ID -->
              <th scope="col" class="px-4 py-3 font-bold select-none font-averta">
                Txn ID
              </th>

              <!-- Col 2: Category & Details (Stripped Soft Tint) -->
              <th scope="col" class="px-4 py-3 font-bold bg-slate-200/50 dark:bg-slate-800/40 print:bg-slate-200/50 select-none font-averta">
                Category & Details
              </th>

              <!-- Col 3: Owner & Units -->
              <th scope="col" class="px-4 py-3 font-bold select-none font-averta">
                Owner / Units
              </th>

              <!-- Col 4: Amount (Stripped Soft Tint) -->
              <th scope="col" class="px-4 py-3 font-bold bg-slate-200/50 dark:bg-slate-800/40 print:bg-slate-200/50 text-right select-none font-averta">
                Amount (₱)
              </th>

              <!-- Col 5: Date & Auditor (Centered) -->
              <th scope="col" class="px-4 py-3 font-bold text-center select-none font-averta">
                Date & Auditor
              </th>
            </tr>
          </thead>

          <!-- Table Tbody: Continuous Doomscrolling on Screen, Breaks every 10 rows on Print via CSS -->
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
            ${filtered.map((item, idx) => {
              const isCredit = item.amount > 0
              const amountClass = isCredit
                ? 'text-emerald-600 dark:text-emerald-400 print:text-emerald-700 font-bold'
                : 'text-rose-600 dark:text-rose-400 print:text-rose-700 font-bold'
              const formattedAmount = `${isCredit ? '+' : '-'}₱${Math.abs(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

              return `
                <tr class="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition print:hover:bg-transparent">
                  <!-- Col 1: ID -->
                  <td class="px-3.5 py-2.5 print:px-2 print:py-1.5 font-mono font-bold text-slate-800 dark:text-slate-200 print:text-slate-900 whitespace-nowrap text-xs print:text-[10px]">
                    ${item.id}
                  </td>

                  <!-- Col 2: Category & Description (Stripped soft tint) -->
                  <td class="px-3.5 py-2.5 print:px-2 print:py-1.5 bg-slate-100/50 dark:bg-slate-800/30 print:bg-slate-100/40 max-w-[240px]">
                    <span class="font-bold text-slate-800 dark:text-slate-200 print:text-slate-900 block leading-tight text-xs print:text-[10px]">${item.category}</span>
                    <div class="text-[10px] print:text-[9px] text-slate-500 dark:text-slate-400 print:text-slate-600 leading-snug break-words mt-0.5">${item.desc}</div>
                  </td>

                  <!-- Col 3: Owner & Units -->
                  <td class="px-3.5 py-2.5 print:px-2 print:py-1.5 max-w-[200px]">
                    <span class="font-semibold text-slate-800 dark:text-slate-200 print:text-slate-900 block leading-tight text-xs print:text-[10px]">${item.owner}</span>
                    <div class="text-[10px] print:text-[9px] text-slate-400 print:text-slate-500 leading-snug break-words mt-0.5">${item.units}</div>
                  </td>

                  <!-- Col 4: Amount (Stripped soft tint) -->
                  <td class="px-3.5 py-2.5 print:px-2 print:py-1.5 bg-slate-100/50 dark:bg-slate-800/30 print:bg-slate-100/40 text-right font-money whitespace-nowrap text-xs print:text-[10px] ${amountClass}">
                    ${formattedAmount}
                  </td>

                  <!-- Col 5: Date & Auditor (Centered) -->
                  <td class="px-3.5 py-2.5 print:px-2 print:py-1.5 text-center whitespace-nowrap">
                    <span class="font-medium text-slate-700 dark:text-slate-300 print:text-slate-800 font-mono text-[11px] print:text-[10px] block">${item.date}</span>
                    <div class="text-[10px] print:text-[9px] text-slate-400 print:text-slate-500 leading-tight mt-0.5">${item.attendant} • ${item.status}</div>
                  </td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Preview Footer Record Count Summary -->
      <div class="flex items-center justify-between pt-2 text-[11px] text-slate-400 print:text-slate-500">
        <span class="font-semibold">Compiled ${filtered.length} total ledger entries for preview</span>
        <span class="font-bold text-blue-600 dark:text-blue-400 print:text-slate-700 uppercase tracking-wider">Official Ledger Record</span>
      </div>
    `
  }
  // END: ExportsManager.renderPreview

  // START: ExportsManager.triggerDownload - Handles client-side CSV and JSON export generation
  triggerDownload(format, fileName) {
    const records = this.filterRecords()

    let content = ''
    let mimeType = ''

    if (format === 'json') {
      content = JSON.stringify({
        metadata: {
          title: 'JorgyNets Fleet Telemetry Export',
          scope: this.currentFilters.scope,
          owner: this.currentFilters.owner,
          units: this.currentFilters.units,
          dateRange: `${this.currentFilters.startDate} to ${this.currentFilters.endDate}`,
          generatedAt: new Date().toISOString(),
          recordCount: records.length,
          developer: 'Mark Jordan Ugtong',
          copyrightYear: new Date().getFullYear()
        },
        records: records
      }, null, 2)
      mimeType = 'application/json'
    } else {
      const header = 'Transaction ID,Category,Description,Owner,Units,Amount,Type,Date,Attendant,Status\n'
      const rows = records.map(r =>
        `"${r.id}","${r.category}","${r.desc.replace(/"/g, '""')}","${r.owner}","${r.units}",${r.amount},"${r.type}","${r.date}","${r.attendant}","${r.status}"`
      ).join('\n')
      content = header + rows
      mimeType = 'text/csv'
    }

    const blob = new Blob([content], { type: mimeType })
    const downloadUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(downloadUrl)

    this.animations.toast?.show(`Downloaded "${fileName}" successfully!`)
  }
  // END: ExportsManager.triggerDownload
}
// END: ExportsManager
