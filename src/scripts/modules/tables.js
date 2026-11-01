// START: TableManager - Parent OOP coordinator for Pisonet Habwa logs & Bills deductions, interactive data tables, filters, and off-canvas drawers
import { AnimationsManager } from './animations.js'
import { userAccountManager } from './auth.js'
import { habwaApi, billsApi, requestsApi, usersApi, storageManager } from '../../api/index.js'

export class TableManager {
  constructor(mode = 'habwa') {
    this.mode = mode // 'habwa', 'bills', 'requests', or 'owners'
    this.animations = new AnimationsManager()
    
    // Live Supabase Telemetry Records
    this.billsRecords = []

    this.masterHabwaRecords = []
    this.requestsRecords = []
    this.ownersRecords = []

    // Detect if page is in User Portal (/users/ path or logged-in client role)
    const sessionRole = storageManager.session.getRole()
    this.isUserPortal = window.location.pathname.includes('/users/') || (sessionRole && sessionRole !== '0')
    this.currentOwnerName = storageManager.session.getUser() || 'Kuya Jorgy'
    this.currentUserId = storageManager.session.getUserId()

    this.habwaUserRecords = []
    this.billsUserRecords = []
    this.requestsUserRecords = []

    this.records = []

    // State management
    this.searchQuery = ''
    this.selectedOwner = 'all'
    this.selectedCategory = 'all'
    this.selectedDate = 'all' // 'all', 'today', 'week', 'month', or 'custom'
    this.selectedCustomDate = ''
    this.selectedStatus = 'all' // 'all', 'pending', 'approved', 'declined', 'active', 'inactive'
    this.sortKey = this.mode === 'owners' ? 'name' : 'date'
    this.sortOrder = this.mode === 'owners' ? 'asc' : 'desc'
    this.currentPage = 1
    this.rowsPerPage = 10
    this.selectedIds = new Set()

    // Subchildren instances (OOP pattern)
    this.habwa = new this.HabwaController(this)
    this.bills = new this.BillsController(this)
    this.requests = new this.RequestsController(this)
    this.owners = new this.OwnersController(this)
    this.filter = new this.FilterController(this)
    this.pagination = new this.PaginationController(this)
    this.selection = new this.SelectionController(this)
    this.drawer = null
  }

  // Live query loader connecting directly to Supabase Backend
  async loadFromSupabase() {
    try {
      const currentUid = this.currentUserId || storageManager.session.getUserId()

      if (this.mode === 'bills') {
        const res = this.isUserPortal && currentUid
          ? await billsApi.getByOwner(currentUid)
          : await billsApi.getAll()

        if (res.success && Array.isArray(res.data)) {
          this.billsRecords = res.data.map((b) => ({
            id: b.ref_code,
            dbId: b.id,
            category: b.category,
            desc: b.description,
            owner: (b.owner_ids && b.owner_ids.length > 1) ? 'ALL' : 'Unit Owner',
            owner_ids: b.owner_ids || [],
            roles: ['1', '2', '3'],
            amount: Number(b.total_amount),
            shares: '',
            detailedBreakdown: Array.isArray(b.detailed_breakdown) ? b.detailed_breakdown : [],
            date: b.bill_date,
            timestamp: b.created_at || '',
            attendant: b.attendant,
            status: b.status,
            notes: b.notes || ''
          }))
          this.records = this.billsRecords
        }
      } else if (this.mode === 'requests') {
        const res = this.isUserPortal && currentUid
          ? await requestsApi.getByOwner(currentUid)
          : await requestsApi.getAll()

        if (res.success && Array.isArray(res.data)) {
          this.requestsRecords = res.data.map((r) => ({
            id: r.ref_code,
            dbId: r.id,
            owner: r.users?.full_name || 'Unit Owner',
            ownerShort: (r.users?.full_name || '').split('(')[0].trim(),
            owner_id: r.owner_id,
            roleId: '1',
            avatar: r.users?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            profitLeft: Number(r.pool_value || 0),
            category: r.category,
            amount: Number(r.amount),
            status: r.status,
            date: r.request_date,
            timestamp: r.created_at || '',
            submittedDate: r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : r.request_date,
            source: 'Web App',
            note: r.note || '',
            receiptPhoto: r.receipt_photo_url,
            hasSignature: Boolean(r.signature_url),
            signature: r.signature_url,
            signatureName: (r.users?.full_name || '').split('(')[0].trim(),
            policy: r.policy_label || 'Standard Policy',
            policyCheck: r.policy_check || 'Within limit',
            adminNote: r.admin_note
          }))
          this.records = this.requestsRecords
        }
      } else if (this.mode === 'owners') {
        const res = await usersApi.getAll()
        if (res.success && Array.isArray(res.data)) {
          this.ownersRecords = res.data.map((u) => ({
            id: u.id,
            role_id: u.role_id,
            name: u.full_name,
            username: u.username,
            phone: u.phone || '+63 917-000-0000',
            category: u.category,
            units: u.units,
            role: u.roles?.label || (u.role_id === 0 ? 'Admin' : 'Owner'),
            status: u.status,
            dateCreated: u.created_at ? u.created_at.slice(0, 10) : '',
            avatar: u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          }))
          this.records = this.ownersRecords
        }
      } else {
        // Habwa Mode
        const res = this.isUserPortal && currentUid
          ? await habwaApi.getByOwner(currentUid)
          : await habwaApi.getAll()

        if (res.success && Array.isArray(res.data)) {
          this.masterHabwaRecords = res.data.map((h) => ({
            id: h.ref_code,
            dbId: h.id,
            desc: h.description,
            owner: h.users?.full_name || 'Unit Owner',
            owner_id: h.owner_id,
            category: h.category,
            amount: Number(h.amount),
            coins: h.coins_breakdown || '',
            date: h.harvested_at ? h.harvested_at.slice(0, 10) : '',
            timestamp: h.harvested_at || '',
            attendant: h.attendant,
            status: h.status
          }))
          this.records = this.masterHabwaRecords
        }
      }
    } catch {
      this.records = []
    }
  }

  // START: TableManager.init - Bootstraps all table subcomponents and listeners
  async init(drawerManager = null) {
    if (drawerManager) {
      this.drawer = drawerManager
    }
    await this.loadFromSupabase()
    if (this.mode === 'bills') {
      this.bills.init()
    } else if (this.mode === 'requests') {
      this.requests.init()

      // Set up realtime sync so admin immediately sees new requests created by owners
      if (this.isUserPortal && this.currentUserId) {
        requestsApi.subscribeToOwnerRequests(this.currentUserId, async () => {
          await this.loadFromSupabase()
          this.render()
        })
      } else {
        requestsApi.subscribeToAllRequests(async () => {
          await this.loadFromSupabase()
          this.render()
        })
      }
    } else if (this.mode === 'owners') {
      this.owners.init()
    } else {
      this.habwa.init()
    }
    this.filter.init()
    this.pagination.init()
    this.selection.init()
    this.bindSummaryToggle()
    this.render()
  }
  // END: TableManager.init - Bootstrapping complete

  // START: TableManager.bindSummaryToggle - Handles temporary toggling of summary-cards on/off
  bindSummaryToggle() {
    const toggleBtn = document.getElementById('summary-toggle')
    const summaryCards = document.getElementById('summary-cards')
    if (!toggleBtn || !summaryCards) return

    const icon = toggleBtn.querySelector('svg')
    const label = document.getElementById('summary-toggle-label')

    const updateToggleState = (isHidden) => {
      toggleBtn.setAttribute('aria-expanded', (!isHidden).toString())
      if (isHidden) {
        // Inactive / Hidden state: light neutral background, dark legible text
        toggleBtn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600', 'dark:bg-blue-600', 'dark:text-white', 'dark:border-blue-600')
        toggleBtn.classList.add('bg-slate-100', 'text-slate-700', 'border-slate-300', 'dark:bg-slate-800', 'dark:text-slate-300', 'dark:border-slate-700')
        if (icon) {
          icon.classList.remove('text-white')
          icon.classList.add('text-slate-500', 'dark:text-slate-400')
        }
      } else {
        // Active / Visible state: solid blue filled with crisp white text
        toggleBtn.classList.remove('bg-slate-100', 'text-slate-700', 'border-slate-300', 'dark:bg-slate-800', 'dark:text-slate-300', 'dark:border-slate-700')
        toggleBtn.classList.add('bg-blue-600', 'text-white', 'border-blue-600', 'dark:bg-blue-600', 'dark:text-white', 'dark:border-blue-600')
        if (icon) {
          icon.classList.remove('text-slate-500', 'dark:text-slate-400')
          icon.classList.add('text-white')
        }
      }
    }

    toggleBtn.addEventListener('click', () => {
      const isHidden = summaryCards.classList.toggle('hidden')
      updateToggleState(isHidden)
    })
  }
  // END: TableManager.bindSummaryToggle - Toggle bound

  // START: TableManager.getFilteredData - Applies search, owner filter, and sort order
  getFilteredData() {
    if (this.mode === 'owners') {
      let result = this.records.filter((item) => {
        const query = this.searchQuery.trim().toLowerCase()
        const matchesSearch =
          !query ||
          item.name?.toLowerCase().includes(query) ||
          item.username?.toLowerCase().includes(query) ||
          item.phone?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query) ||
          item.units?.toLowerCase().includes(query) ||
          item.id?.toLowerCase().includes(query) ||
          item.status?.toLowerCase().includes(query)

        const matchesCategory =
          this.selectedCategory === 'all' || item.category === this.selectedCategory

        const matchesStatus =
          this.selectedStatus === 'all' ||
          (item.status && item.status.toLowerCase() === this.selectedStatus.toLowerCase())

        return matchesSearch && matchesCategory && matchesStatus
      })

      result.sort((a, b) => {
        // Always pin Admin (role_id === 0) to the very top
        if (a.role_id === 0 && b.role_id !== 0) return -1
        if (b.role_id === 0 && a.role_id !== 0) return 1

        let valA = a[this.sortKey] || a.name || ''
        let valB = b[this.sortKey] || b.name || ''
        if (typeof valA === 'string') {
          valA = valA.toLowerCase()
          valB = valB.toLowerCase()
        }
        if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1
        return 0
      })

      return result
    }

    let result = this.records.filter((item) => {
      // Search matching across multiple fields
      const query = this.searchQuery.trim().toLowerCase()
      const matchesSearch =
        !query ||
        item.desc.toLowerCase().includes(query) ||
        item.owner.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        item.attendant.toLowerCase().includes(query)

      // Owner filter matching
      const matchesOwner =
        this.selectedOwner === 'all' || item.owner.includes(this.selectedOwner)

      // Category filter matching
      const matchesCategory =
        this.selectedCategory === 'all' || item.category === this.selectedCategory

      // Date & Audit filter matching (Default is 'all' which fetches ALL logs)
      let matchesDate = true
      if (this.selectedDate === 'today') {
        const todayStr = new Date().toISOString().slice(0, 10)
        matchesDate = item.date === todayStr
      } else if (this.selectedDate === 'week') {
        const itemDate = new Date(item.date)
        const now = new Date()
        const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24)
        matchesDate = diffDays >= 0 && diffDays <= 7
      } else if (this.selectedDate === 'month') {
        const currentMonth = new Date().toISOString().slice(0, 7)
        matchesDate = item.date.startsWith(currentMonth)
      } else if (this.selectedDate === 'custom' && this.selectedCustomDate) {
        matchesDate = item.date === this.selectedCustomDate
      }

      // Status filter matching (for requests: 'all', 'pending', 'approved', 'declined')
      const matchesStatus =
        this.selectedStatus === 'all' || 
        (item.status && item.status.toLowerCase() === this.selectedStatus.toLowerCase())

      return matchesSearch && matchesOwner && matchesCategory && matchesDate && matchesStatus
    })

    // Sorting logic
    result.sort((a, b) => {
      let valA = a[this.sortKey]
      let valB = b[this.sortKey]

      if (typeof valA === 'string') {
        valA = valA.toLowerCase()
        valB = valB.toLowerCase()
      }

      if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }
  // END: TableManager.getFilteredData - Filtered records returned

  // START: TableManager.render - Main rendering method for table rows, stats, and pagination controls
  render() {
    const filtered = this.getFilteredData()
    const totalItems = filtered.length
    const totalPages = Math.ceil(totalItems / this.rowsPerPage) || 1

    // Ensure valid page bounds
    if (this.currentPage > totalPages) this.currentPage = totalPages
    if (this.currentPage < 1) this.currentPage = 1

    const startIndex = (this.currentPage - 1) * this.rowsPerPage
    const endIndex = Math.min(startIndex + this.rowsPerPage, totalItems)
    const pagedItems = filtered.slice(startIndex, endIndex)
    this.data = filtered

    // Render table rows
    if (this.mode === 'bills') {
      this.bills.renderRows(pagedItems, startIndex)
    } else if (this.mode === 'requests') {
      this.requests.renderRows(pagedItems, startIndex)
    } else if (this.mode === 'owners') {
      this.owners.renderRows(pagedItems, startIndex)
    } else {
      this.habwa.renderRows(pagedItems, startIndex)
    }

    // Direct proxy to update request status (Pending -> Approved / Declined) with optional Admin Review Note
    this.updateRequestStatus = async (id, newStatus, adminNote = '') => {
      this.requests.updateStatus(id, newStatus, adminNote)
    }

    // Render pagination display and buttons
    this.pagination.render(totalItems, startIndex, endIndex, totalPages)

    // Render summary stat counters if present
    if (this.mode === 'requests') {
      this.requests.renderSummary(filtered)
    } else if (this.mode === 'owners') {
      this.owners.renderSummary(filtered)
    } else if (this.mode !== 'bills') {
      this.renderSummary(filtered)
    }

    // Sync header checkbox selection state
    this.selection.updateMasterCheckbox(pagedItems)

    // Trigger MoneyCounter animation on newly rendered table rows with micro-delays
    if (this.animations && this.animations.counter) {
      this.animations.counter.init(document)
    }

    // Re-initialize Flowbite tooltips for the newly rendered rows
    if (window.initFlowbite) {
      window.initFlowbite()
    }
  }
  // END: TableManager.render - Table rendered

  // START: TableManager.renderSummary - Updates dynamic KPI cards with currency formatting and MoneyCounter animation
  renderSummary(items) {
    const totalHabwa = items.reduce((sum, item) => sum + item.amount, 0)
    const totalEntries = items.length
    const highestHabwa = items.length > 0 ? Math.max(...items.map((item) => item.amount)) : 0

    const totalEl = document.getElementById('stat-total')
    const countEl = document.getElementById('stat-count')
    const peakEl = document.getElementById('stat-avg')

    // If skeleton is still active on initial load, delay the counter roll until skeleton finishes
    const isSkelVisible = document.getElementById('revenue-amount-skeleton') && !document.getElementById('revenue-amount-skeleton').classList.contains('hidden')
    const delay = isSkelVisible ? 900 : 0

    setTimeout(() => {
      if (totalEl) {
        this.animations.counter.animate(totalEl, totalHabwa, '₱', '', 2, 1000)
      }
      if (countEl) {
        countEl.textContent = `${totalEntries} Log${totalEntries === 1 ? '' : 's'}`
      }
      if (peakEl) {
        this.animations.counter.animate(peakEl, highestHabwa, '₱', '', 2, 1000)
      }
    }, delay)
  }
  // END: TableManager.renderSummary - Summary updated

  // ==========================================
  // SUBCHILD CLASS: HabwaController
  // ==========================================
  // START: HabwaController - Manages table row rendering, stripped column coloring, and action icons
  HabwaController = class {
    constructor(parent) {
      this.parent = parent
    }

    // START: HabwaController.init - Binds action listeners and table events
    init() {
      const tableBody = document.getElementById('habwa-tbody')
      if (!tableBody) return

      // Event delegation for row delete, edit, and tooltip interactions
      tableBody.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('[data-action="delete"]')
        if (deleteBtn) {
          const id = deleteBtn.getAttribute('data-id')
          this.deleteEntry(id)
          return
        }

        const editBtn = e.target.closest('[data-action="edit"]')
        if (editBtn) {
          const id = editBtn.getAttribute('data-id')
          this.editEntry(id)
          return
        }

        const viewBtn = e.target.closest('[data-action="view"]')
        if (viewBtn) {
          const id = viewBtn.getAttribute('data-id')
          this.viewEntry(id)
          return
        }
      })
    }
    // END: HabwaController.init - HabwaController initialized

    // START: HabwaController.deleteEntry - Removes entry and re-renders table
    deleteEntry(id) {
      const idx = this.parent.records.findIndex((r) => r.id === id)
      if (idx !== -1) {
        this.parent.records.splice(idx, 1)
        this.parent.selectedIds.delete(id)
        this.parent.render()
      }
    }
    // END: HabwaController.deleteEntry - Entry deleted

    // START: HabwaController.editEntry - Loads entry into off-canvas drawer for editing
    editEntry(id) {
      const entry = this.parent.records.find((r) => r.id === id)
      if (entry) {
        this.parent.drawer.openEdit(entry)
      }
    }
    // END: HabwaController.editEntry - Edit drawer opened

    // START: HabwaController.viewEntry - Loads entry into view drawer for full details preview
    viewEntry(id) {
      const entry = this.parent.records.find((r) => r.id === id)
      if (entry) {
        this.parent.drawer.openView(entry)
      }
    }
    // END: HabwaController.viewEntry - View drawer opened

    // START: HabwaController.renderRows - Renders stripped-column rows with hover states
    renderRows(items, offset) {
      const tbody = document.getElementById('habwa-tbody')
      if (!tbody) return

      if (items.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
              <div class="flex flex-col items-center justify-center space-y-2">
                <svg class="w-10 h-10 text-slate-400 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="font-medium text-sm">No habwa logs match your filter criteria.</p>
                <p class="text-xs text-slate-400">Try clearing the search query or changing the owner filter.</p>
              </div>
            </td>
          </tr>
        `
        return
      }

      // Stripped column styling: Alternating columns receive a soft background tint
      // Column 1 (Checkbox): soft tint
      // Column 2 (Transaction Details): normal
      // Column 3 (Owner): soft tint
      // Column 4 (Category): normal
      // Column 5 (Amount): soft tint
      // Column 6 (Date/Tooltip): normal
      // Column 7 (Actions): soft tint
      tbody.innerHTML = items
        .map((item, idx) => {
          const isChecked = this.parent.selectedIds.has(item.id)
          const tooltipId = `tooltip-date-${item.id}`

          return `
            <tr class="border-b border-slate-200 dark:border-slate-800/80 hover:bg-blue-50/70 dark:hover:bg-slate-800/70 transition-colors duration-150">
              <!-- Col 1: Checkbox (Stripped Soft Column) -->
              <td class="w-4 p-4 bg-slate-200/50 dark:bg-slate-800/40">
                <div class="flex items-center">
                  <input id="check-${item.id}" data-id="${item.id}" type="checkbox" ${isChecked ? 'checked' : ''} class="row-checkbox w-4 h-4 text-blue-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-sm focus:ring-blue-500 cursor-pointer">
                  <label for="check-${item.id}" class="sr-only">Select ${item.id}</label>
                </div>
              </td>

              <!-- Col 2: Transaction Details (Regular Column) with auto-incrementing numbering badge -->
              <th scope="row" class="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs shrink-0 font-money">
                    ${offset + idx + 1}
                  </div>
                  <div>
                    <div class="text-xs font-bold text-slate-900 dark:text-white font-averta hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer flex items-center space-x-1.5" data-action="view" data-id="${item.id}">
                      <span>${item.desc}</span>
                      <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                    <div class="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                      <span class="font-mono font-semibold text-slate-500 dark:text-slate-400">${item.id}</span>
                      <span>•</span>
                      <span class="text-slate-500 dark:text-slate-400 font-medium">${item.coins}</span>
                    </div>
                  </div>
                </div>
              </th>

              <!-- Col 3: Owner & Pisonet Unit (Stripped Soft Column) -->
              <td class="px-6 py-4 bg-slate-200/50 dark:bg-slate-800/40">
                <div class="flex items-center space-x-2">
                  <svg class="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">${item.owner}</span>
                </div>
              </td>

              <!-- Col 4: Category (Regular Column) - Temporarily commented out for future deductions
              <td class="px-6 py-4">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                  ${item.category}
                </span>
              </td>
              -->

              <!-- Col 4: Amount (Regular Column) -->
              <td class="px-6 py-4">
                <div class="font-money text-sm font-bold text-emerald-600 dark:text-emerald-400" data-count-money="${item.amount}" data-prefix="₱" data-duration="1100" data-delay="${100 + idx * 40}">
                  ₱0.00
                </div>
                <div class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Gross Harvest
                </div>
              </td>

              <!-- Col 5: Date & Timestamp via Flowbite Tooltip (Stripped Soft Column) -->
              <td class="px-6 py-4 bg-slate-200/50 dark:bg-slate-800/40">
                <div class="relative inline-flex items-center space-x-1.5 cursor-help" data-tooltip-target="${tooltipId}">
                  <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span class="text-xs text-slate-600 dark:text-slate-300 font-medium">${item.date}</span>
                </div>

                <!-- Flowbite Tooltip Element -->
                <div id="${tooltipId}" role="tooltip" class="absolute z-50 invisible inline-block px-3 py-2 text-xs font-medium text-white transition-opacity duration-300 bg-slate-900 rounded-lg shadow-xl opacity-0 tooltip dark:bg-slate-800 border border-slate-700">
                  <div class="font-bold text-amber-300 font-averta">Recorded Timestamp</div>
                  <div class="text-[11px] text-slate-200">${item.timestamp}</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">Audited by: ${item.attendant}</div>
                  <div class="tooltip-arrow" data-popper-arrow></div>
                </div>
              </td>

              <!-- Col 6: Actions (Regular Column: View Details for Owner Portal; Edit & Delete for Admin) -->
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end space-x-1.5">
                  ${this.parent.isUserPortal ? `
                    <!-- Inspect / View Details Button (View-only for Unit Owners) -->
                    <button id="view-${item.id}" type="button" data-action="view" data-id="${item.id}" title="View Habwa Audit" class="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition cursor-pointer shadow-xs space-x-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>View</span>
                    </button>
                  ` : `
                    <!-- Edit Action Button (Solid Amber) -->
                    <button id="edit-${item.id}" type="button" data-action="edit" data-id="${item.id}" title="Edit Habwa Entry" class="p-1.5 rounded-lg text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 transition cursor-pointer shadow-xs">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span class="sr-only">Edit ${item.id}</span>
                    </button>

                    <!-- Delete Action Button (Solid Rose) -->
                    <button id="del-${item.id}" type="button" data-action="delete" data-id="${item.id}" title="Delete Record" class="p-1.5 rounded-lg text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition cursor-pointer shadow-xs">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span class="sr-only">Delete ${item.id}</span>
                    </button>
                  `}
                </div>
              </td>
            </tr>
          `
        })
        .join('')
    }
    // END: HabwaController.renderRows - Rows rendered
  }
  // END: HabwaController - Subchild ready

  // ==========================================
  // SUBCHILD CLASS: BillsController
  // ==========================================
  // START: BillsController - Manages deduction bill table rows, negative rose amounts, and owner role ID breakdowns
  BillsController = class {
    constructor(parent) {
      this.parent = parent
    }

    // START: BillsController.init - Binds action listeners and table events
    init() {
      const tableBody = document.getElementById('bills-tbody')
      if (!tableBody) return

      // Event delegation for row delete, edit, and view preview interactions
      tableBody.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('[data-action="delete"]')
        if (deleteBtn) {
          const id = deleteBtn.getAttribute('data-id')
          this.deleteEntry(id)
          return
        }

        const editBtn = e.target.closest('[data-action="edit"]')
        if (editBtn) {
          const id = editBtn.getAttribute('data-id')
          this.editEntry(id)
          return
        }

        const viewBtn = e.target.closest('[data-action="view"]')
        if (viewBtn) {
          const id = viewBtn.getAttribute('data-id')
          this.viewEntry(id)
          return
        }
      })
    }
    // END: BillsController.init - BillsController initialized

    // START: BillsController.deleteEntry - Removes entry and re-renders table
    deleteEntry(id) {
      const idx = this.parent.records.findIndex((r) => r.id === id)
      if (idx !== -1) {
        this.parent.records.splice(idx, 1)
        this.parent.selectedIds.delete(id)
        this.parent.render()
      }
    }
    // END: BillsController.deleteEntry

    // START: BillsController.editEntry - Loads entry into bills drawer for editing
    editEntry(id) {
      const entry = this.parent.records.find((r) => r.id === id)
      if (entry && this.parent.drawer) {
        this.parent.drawer.openEdit(entry)
      }
    }
    // END: BillsController.editEntry

    // START: BillsController.viewEntry - Loads entry into view drawer for full details preview
    viewEntry(id) {
      const entry = this.parent.records.find((r) => r.id === id)
      if (entry && this.parent.drawer) {
        this.parent.drawer.openView(entry)
      }
    }
    // END: BillsController.viewEntry

    // START: BillsController.renderRows - Renders deduction rows with rose negative styling and role breakdown
    renderRows(items, offset) {
      const tbody = document.getElementById('bills-tbody')
      if (!tbody) return

      if (items.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
              <div class="flex flex-col items-center justify-center space-y-2">
                <svg class="w-10 h-10 text-slate-400 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="font-medium text-sm">No monthly bill deductions match your filter criteria.</p>
                <p class="text-xs text-slate-400">Try clearing the search query or changing the allocation filter.</p>
              </div>
            </td>
          </tr>
        `
        return
      }

      tbody.innerHTML = items
        .map((item, idx) => {
          const isChecked = this.parent.selectedIds.has(item.id)
          const tooltipId = `tooltip-bill-${item.id}`

          // Render formatted role badges (e.g. 1 = -₱1,200.00 | 2 = -₱1,200.00 | 3 = -₱1,200.00)
          const sharesHtml = (item.shares || '')
            .split('|')
            .map((chunk) => {
              const trimmed = chunk.trim()
              if (!trimmed) return ''
              const [roleId, rawShare] = trimmed.split('=').map((s) => s.trim())
              const formattedShare = rawShare.startsWith('-') ? rawShare : `-${rawShare}`
              
              // Color accents per role ID (slate/sky/indigo/violet themes that represent deductions, not rose/red)
              const roleColors = {
                '1': 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20',
                '2': 'text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/20',
                '3': 'text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/20'
              }
              const colorClass = roleColors[roleId] || 'text-slate-600 dark:text-slate-300 bg-slate-500/10 border-slate-500/20'

              return `
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${colorClass}">
                  <span class="font-bold mr-1">${roleId}</span>= ${formattedShare}
                </span>
              `
            })
            .join(' ')

          return `
            <tr class="border-b border-slate-200 dark:border-slate-800/80 hover:bg-slate-50/70 dark:hover:bg-slate-800/70 transition-colors duration-150">
              <!-- Col 1: Checkbox (Stripped Soft Column) -->
              <td class="w-4 p-4 bg-slate-200/50 dark:bg-slate-800/40">
                <div class="flex items-center">
                  <input id="check-${item.id}" data-id="${item.id}" type="checkbox" ${isChecked ? 'checked' : ''} class="row-checkbox w-4 h-4 text-rose-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-sm focus:ring-rose-500 cursor-pointer">
                  <label for="check-${item.id}" class="sr-only">Select ${item.id}</label>
                </div>
              </td>

              <!-- Col 2: Bill Category & Description (Regular Column, NO BIL ID) -->
              <th scope="row" class="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold text-xs shrink-0 font-money">
                    ${offset + idx + 1}
                  </div>
                  <div>
                    <div class="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white font-averta hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer flex items-center space-x-1.5" data-action="view" data-id="${item.id}">
                      <span>${item.category}</span>
                      <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                    <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-sm font-normal">
                      ${item.desc}
                    </div>
                  </div>
                </div>
              </th>

              <!-- Col 3: Owner / Allocation Units (Stripped Soft Column) -->
              <td class="px-6 py-4 bg-slate-200/50 dark:bg-slate-800/40">
                <div class="flex items-center space-x-2">
                  <svg class="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">${item.owner}</span>
                </div>
              </td>

              <!-- Col 4: Deducted Amount & Shares (Regular Column in ROSE Negative with Breakdown Below) -->
              <td class="px-6 py-4">
                <div class="font-money text-sm font-black text-rose-600 dark:text-rose-400" data-count-money="${item.amount}" data-prefix="-₱" data-duration="1100" data-delay="${100 + idx * 40}">
                  -₱0.00
                </div>
                <div class="text-[10px] text-rose-500/80 dark:text-rose-400/80 uppercase tracking-wider font-bold">
                  Deduction
                </div>
                <!-- Owner deduction breakdown badges transferred under Deduction -->
                <div class="flex items-center flex-wrap gap-1 mt-1.5">
                  ${sharesHtml}
                </div>
              </td>

              <!-- Col 5: Date & Timestamp via Flowbite Tooltip (Stripped Soft Column) -->
              <td class="px-6 py-4 bg-slate-200/50 dark:bg-slate-800/40">
                <div class="relative inline-flex items-center space-x-1.5 cursor-help" data-tooltip-target="${tooltipId}">
                  <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span class="text-xs text-slate-600 dark:text-slate-300 font-medium">${item.date}</span>
                </div>

                <!-- Flowbite Tooltip Element -->
                <div id="${tooltipId}" role="tooltip" class="absolute z-50 invisible inline-block px-3 py-2 text-xs font-medium text-white transition-opacity duration-300 bg-slate-900 rounded-lg shadow-xl opacity-0 tooltip dark:bg-slate-800 border border-slate-700">
                  <div class="font-bold text-rose-300 font-averta">Billing Recorded</div>
                  <div class="text-[11px] text-slate-200">${item.timestamp}</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">Logged by: ${item.attendant}</div>
                  <div class="tooltip-arrow" data-popper-arrow></div>
                </div>
              </td>

              <!-- Col 6: Actions (Regular Column: View Details for Owner Portal; Edit & Delete for Admin) -->
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end space-x-1.5">
                  ${this.parent.isUserPortal ? `
                    <!-- Inspect / View Details Button (View-only for Unit Owners) -->
                    <button id="view-${item.id}" type="button" data-action="view" data-id="${item.id}" title="View Deduction Details" class="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition cursor-pointer shadow-xs space-x-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>View</span>
                    </button>
                  ` : `
                    <!-- Edit Action Button (Solid Amber) -->
                    <button id="edit-${item.id}" type="button" data-action="edit" data-id="${item.id}" title="Edit Deduction Bill" class="p-1.5 rounded-lg text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 transition cursor-pointer shadow-xs">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span class="sr-only">Edit ${item.id}</span>
                    </button>

                    <!-- Delete Action Button (Solid Rose) -->
                    <button id="del-${item.id}" type="button" data-action="delete" data-id="${item.id}" title="Delete Record" class="p-1.5 rounded-lg text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition cursor-pointer shadow-xs">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span class="sr-only">Delete ${item.id}</span>
                    </button>
                  `}
                </div>
              </td>
            </tr>
          `
        })
        .join('')
    }
    // END: BillsController.renderRows - Rows rendered
  }
  // END: BillsController - Subchild ready

  // ==========================================
  // SUBCHILD CLASS: RequestsController
  // ==========================================
  // START: RequestsController - Manages Custom Owner Deduction Requests table, status badges, approve/decline actions
  RequestsController = class {
    constructor(parent) {
      this.parent = parent
    }

    init() {
      const tableBody = document.getElementById('requests-tbody')
      if (!tableBody) return

      tableBody.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('[data-action="delete"]')
        if (deleteBtn) {
          const id = deleteBtn.getAttribute('data-id')
          this.deleteEntry(id)
          return
        }

        const viewBtn = e.target.closest('[data-action="view"]')
        if (viewBtn) {
          const id = viewBtn.getAttribute('data-id')
          this.viewEntry(id)
          return
        }

        const editBtn = e.target.closest('[data-action="edit"]')
        if (editBtn) {
          const id = editBtn.getAttribute('data-id')
          this.editEntry(id)
          return
        }

        const approveBtn = e.target.closest('[data-action="approve"]')
        if (approveBtn) {
          const id = approveBtn.getAttribute('data-id')
          const entry = this.parent.records.find((r) => r.id === id)
          if (entry && this.parent.drawer?.openReviewNote) {
            this.parent.drawer.openReviewNote(entry, 'Approved')
          } else {
            this.updateStatus(id, 'Approved')
          }
          return
        }

        const declineBtn = e.target.closest('[data-action="decline"]')
        if (declineBtn) {
          const id = declineBtn.getAttribute('data-id')
          const entry = this.parent.records.find((r) => r.id === id)
          if (entry && this.parent.drawer?.openReviewNote) {
            this.parent.drawer.openReviewNote(entry, 'Declined')
          } else {
            this.updateStatus(id, 'Declined')
          }
          return
        }
      })
    }

    editEntry(id) {
      const entry = this.parent.records.find((r) => r.id === id)
      if (entry && this.parent.drawer) {
        this.parent.drawer.openEdit(entry)
      }
    }

    deleteEntry(id) {
      const idx = this.parent.records.findIndex((r) => r.id === id || r.dbId === id)
      if (idx === -1) return
      const removed = this.parent.records[idx]
      const targetDbId = removed.dbId || id

      // Optimistically remove from view
      this.parent.records.splice(idx, 1)
      this.parent.selectedIds.delete(id)
      this.parent.render()

      // Show 5-second Undo Toast at bottom-right
      const toast = this.parent.animations?.toast
      if (toast && typeof toast.showUndo === 'function') {
        toast.showUndo(
          `Request "${removed.id || 'Entry'}" deleted`,
          () => {
            // On Undo clicked: restore entry into records and re-render
            this.parent.records.splice(idx, 0, removed)
            this.parent.render()
          },
          async () => {
            // On Expire (after 5 seconds): permanently delete from Supabase backend
            try {
              await requestsApi.delete(targetDbId)
            } catch {}
            await this.parent.loadFromSupabase()
            this.parent.render()
          },
          5
        )
      } else {
        // Fallback if toast not available
        requestsApi.delete(targetDbId).then(async () => {
          await this.parent.loadFromSupabase()
          this.parent.render()
        })
      }
    }

    viewEntry(id) {
      const entry = this.parent.records.find((r) => r.id === id)
      if (entry && this.parent.drawer) {
        this.parent.drawer.openView(entry)
      }
    }

    async updateStatus(id, newStatus, adminNote = '') {
      const entry = this.parent.records.find((r) => r.id === id || r.dbId === id)
      const targetId = entry?.dbId || id
      const adminId = storageManager.session.getUserId()

      try {
        await requestsApi.updateStatus(targetId, newStatus, adminNote, adminId)
        await this.parent.loadFromSupabase()
        this.parent.render()
        this.parent.animations?.toast?.show(`Request ${newStatus.toLowerCase()} successfully!`)
      } catch {
        if (entry) {
          entry.status = newStatus
          if (adminNote) entry.adminNote = adminNote
          this.parent.render()
        }
      }
    }

    renderSummary(items) {
      const pendingCount = items.filter((i) => i.status === 'Pending').length
      const approvedCount = items.filter((i) => i.status === 'Approved').length
      const totalAmount = items.reduce((sum, i) => sum + i.amount, 0)

      const statPending = document.getElementById('stat-pending')
      const statApproved = document.getElementById('stat-approved')
      const statTotal = document.getElementById('stat-total')

      if (statPending) statPending.textContent = `${pendingCount} Pending`
      if (statApproved) statApproved.textContent = `${approvedCount} Approved`
      if (statTotal) {
        this.parent.animations.counter.animate(statTotal, totalAmount, '₱', '', 2, 800)
      }
    }

    renderRows(items, offset) {
      const tbody = document.getElementById('requests-tbody')
      if (!tbody) return

      if (items.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
              <div class="flex flex-col items-center justify-center space-y-2">
                <svg class="w-10 h-10 text-slate-400 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p class="font-medium text-sm">No custom owner requests match your filter criteria.</p>
                <p class="text-xs text-slate-400">Try switching your category, owner, or status filter.</p>
              </div>
            </td>
          </tr>
        `
        return
      }

      tbody.innerHTML = items
        .map((item, idx) => {
          const isChecked = this.parent.selectedIds.has(item.id)
          const tooltipId = `tooltip-req-${item.id}`

          // Status badge styles
          let statusBadge = ''
          if (item.status === 'Pending') {
            statusBadge = `
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 me-1.5 animate-pulse"></span>
                Pending
              </span>
            `
          } else if (item.status === 'Approved') {
            statusBadge = `
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 me-1.5"></span>
                Approved
              </span>
            `
          } else {
            statusBadge = `
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500 me-1.5"></span>
                Declined
              </span>
            `
          }

          return `
            <tr class="border-b border-slate-200 dark:border-slate-800/80 hover:bg-slate-50/70 dark:hover:bg-slate-800/70 transition-colors duration-150">
              <!-- Col 1: Checkbox -->
              <td class="w-4 p-4 bg-slate-200/50 dark:bg-slate-800/40">
                <div class="flex items-center">
                  <input id="check-${item.id}" data-id="${item.id}" type="checkbox" ${isChecked ? 'checked' : ''} class="row-checkbox w-4 h-4 text-blue-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-sm focus:ring-blue-500 cursor-pointer">
                  <label for="check-${item.id}" class="sr-only">Select ${item.id}</label>
                </div>
              </td>

              <!-- Col 2: Owner Name & Profile (First Column, Bolder) -->
              <th scope="row" class="px-6 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                <div class="flex items-center space-x-3">
                  <img class="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700 shrink-0" src="${item.avatar}" alt="${item.owner}">
                  <div>
                    <div class="text-xs font-black text-slate-900 dark:text-white font-averta hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer flex items-center space-x-1.5" data-action="view" data-id="${item.id}">
                      <span>${item.owner}</span>
                      <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                    <div class="text-[11px] font-mono text-slate-400 mt-0.5 font-normal flex items-center space-x-1">
                      <span class="text-blue-600 dark:text-blue-400 font-semibold">${item.id}</span>
                      <span>•</span>
                      <span>${item.date}</span>
                    </div>
                  </div>
                </div>
              </th>

              <!-- Col 3: Current Profit Left (Stripped Soft Column) -->
              <td class="px-6 py-4 bg-slate-200/50 dark:bg-slate-800/40">
                <div class="font-money text-sm font-extrabold text-emerald-600 dark:text-emerald-400" data-count-money="${item.profitLeft}" data-prefix="₱" data-duration="1100" data-delay="${100 + idx * 40}">
                  ₱0.00
                </div>
                <div class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Habwa Pool Balance
                </div>
              </td>

              <!-- Col 4: Category & Status Badge -->
              <td class="px-6 py-4">
                <div class="flex items-center space-x-2">
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
                    ${item.category}
                  </span>
                  ${statusBadge}
                </div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs font-normal">
                  ${item.note || 'No specific note'}
                </div>
              </td>

              <!-- Col 5: Amount Deducted (Stripped Soft Column, Negative Rose) -->
              <td class="px-6 py-4 bg-slate-200/50 dark:bg-slate-800/40">
                <div class="font-money text-sm font-black text-rose-600 dark:text-rose-400" data-count-money="${item.amount}" data-prefix="-₱" data-duration="1100" data-delay="${120 + idx * 40}">
                  -₱0.00
                </div>
                <div class="text-[10px] text-rose-500/80 dark:text-rose-400/80 uppercase tracking-wider font-bold">
                  Requested Deduction
                </div>
              </td>

              <!-- Col 6: Actions (View Drawer Preview for Owner; Approve/Edit/Delete for Admin) -->
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end space-x-1.5">
                  ${this.parent.isUserPortal ? `
                    <!-- View Details Action Button (Owner View Only - Finalized & Signed) -->
                    <button id="view-${item.id}" type="button" data-action="view" data-id="${item.id}" title="Inspect Request" class="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition cursor-pointer shadow-xs space-x-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>View</span>
                    </button>
                  ` : `
                    <!-- Quick Approve Action Button (Disabled with off-colors if already Approved) -->
                    <button id="approve-${item.id}" type="button" data-action="approve" data-id="${item.id}" title="${item.status === 'Approved' ? 'Already Approved' : 'Approve Request'}" ${item.status === 'Approved' ? 'disabled' : ''} class="p-1.5 rounded-lg transition shadow-xs ${item.status === 'Approved' ? 'text-slate-400 bg-slate-200 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed border border-slate-300 dark:border-slate-700 opacity-60' : 'text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 cursor-pointer'}">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      <span class="sr-only">Approve ${item.id}</span>
                    </button>

                    <!-- Edit Action Button (Owner & Admin can tap to edit requested details) -->
                    <button id="edit-${item.id}" type="button" data-action="edit" data-id="${item.id}" title="Edit Request" class="p-1.5 rounded-lg text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 transition cursor-pointer shadow-xs">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span class="sr-only">Edit ${item.id}</span>
                    </button>

                    <!-- Delete Action Button (For Admin only; hidden in owner view later) -->
                    <button id="del-${item.id}" type="button" data-action="delete" data-id="${item.id}" title="Delete Record" class="p-1.5 rounded-lg text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition cursor-pointer shadow-xs">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span class="sr-only">Delete ${item.id}</span>
                    </button>
                  `}
                </div>
              </td>
            </tr>
          `
        })
        .join('')
    }
  }
  // END: RequestsController - Subchild ready

  // ==========================================
  // SUBCHILD CLASS: OwnersController
  // ==========================================
  // START: OwnersController - Manages Pisonet Owners table, credentials badges, phone recovery and actions
  OwnersController = class {
    constructor(parent) {
      this.parent = parent
    }

    init() {
      const tableBody = document.getElementById('owners-tbody')
      if (!tableBody) return

      // Bind actions on the table body using event delegation
      tableBody.addEventListener('click', (e) => {
        // View Owner
        const viewBtn = e.target.closest('[data-view-owner]')
        if (viewBtn) {
          e.preventDefault()
          const id = viewBtn.getAttribute('data-view-owner')
          const owner = this.parent.records.find((r) => r.id === id)
          if (owner && this.parent.drawer) {
            this.parent.drawer.openView(owner)
          }
          return
        }

        // Edit Owner
        const editBtn = e.target.closest('[data-edit-owner]')
        if (editBtn) {
          e.preventDefault()
          const id = editBtn.getAttribute('data-edit-owner')
          const owner = this.parent.records.find((r) => r.id === id)
          if (owner && this.parent.drawer) {
            this.parent.drawer.openEdit(owner)
          }
          return
        }

        // Quick Approve Owner
        const approveBtn = e.target.closest('[data-approve-owner]')
        if (approveBtn) {
          e.preventDefault()
          const id = approveBtn.getAttribute('data-approve-owner')
          this.approveOwner(id)
          return
        }

        // Delete Owner
        const delBtn = e.target.closest('[data-del-owner]')
        if (delBtn) {
          e.preventDefault()
          const id = delBtn.getAttribute('data-del-owner')
          this.deleteOwner(id)
          return
        }
      })

      // Batch Delete
      const batchDeleteBtn = document.getElementById('batch-delete')
      batchDeleteBtn?.addEventListener('click', async () => {
        if (this.parent.selectedIds.size === 0) return
        const ids = Array.from(this.parent.selectedIds).filter((id) => {
          const rec = this.parent.records.find((r) => r.id === id)
          return rec && rec.role_id !== 0
        })

        if (ids.length === 0) {
          this.parent.animations?.toast?.show('Cannot delete Admin accounts.')
          return
        }

        this.parent.records = this.parent.records.filter((r) => !ids.includes(r.id))
        this.parent.selectedIds.clear()
        for (const id of ids) {
          await userAccountManager.deleteUser(id)
        }
        await this.parent.loadFromSupabase()
        this.parent.render()
        this.parent.animations?.toast?.show(`Deleted ${ids.length} selected owner accounts!`)
      })
    }

    approveOwner(id) {
      const owner = this.parent.records.find((r) => r.id === id)
      if (!owner || (owner.status || '').toLowerCase() === 'approved') return
      owner.status = 'Approved'
      userAccountManager.updateUser(id, { status: 'Approved' })
      this.parent.render()
      this.parent.animations?.toast?.show(`Owner "${owner.name}" approved successfully!`)
    }

    deleteOwner(id) {
      const idx = this.parent.records.findIndex((r) => r.id === id)
      if (idx === -1) return
      const removed = this.parent.records[idx]

      // Guard: Admin account role 0 can never be deleted
      if (removed.role_id === 0) {
        this.parent.animations?.toast?.show('Admin account cannot be deleted, only modified.')
        return
      }

      // Optimistically remove from view
      this.parent.records.splice(idx, 1)
      this.parent.render()

      // Show Undo Toast
      const toast = this.parent.animations?.toast
      if (toast) {
        toast.showUndo(
          `Owner "${removed.name}" deleted`,
          () => {
            // On Undo
            this.parent.records.splice(idx, 0, removed)
            this.parent.render()
          },
          async () => {
            // On Expire
            await userAccountManager.deleteUser(id)
            await this.parent.loadFromSupabase()
            this.parent.render()
          },
          4
        )
      } else {
        userAccountManager.deleteUser(id).then(async () => {
          await this.parent.loadFromSupabase()
          this.parent.render()
        })
      }
    }

    parseUnitsCount(unitsStr) {
      if (!unitsStr) return 1
      const str = String(unitsStr).trim()
      const numbers = str.match(/\d+/g)
      if (!numbers || numbers.length === 0) return 1
      if (numbers.length >= 2) {
        const first = parseInt(numbers[0], 10)
        const last = parseInt(numbers[numbers.length - 1], 10)
        if (!isNaN(first) && !isNaN(last) && last >= first) {
          return last - first + 1
        }
        return numbers.length
      }
      return parseInt(numbers[0], 10) || 1
    }

    renderSummary(filtered) {
      const totalEl = document.getElementById('stat-total') || document.getElementById('stat-total-owners')
      const countEl = document.getElementById('stat-count') || document.getElementById('stat-active-owners')
      const avgEl = document.getElementById('stat-avg') || document.getElementById('stat-categories')

      // Exclude Admin (role_id === 0) since Admin does not have units, computers, or partner accounts
      const partnerOwners = filtered.filter((o) => o.role_id !== 0 && (o.role || '').toLowerCase() !== 'admin')

      const totalOwners = partnerOwners.length
      const approvedCount = partnerOwners.filter((o) => (o.status || '').toLowerCase() === 'approved').length
      const totalComputers = partnerOwners.reduce((sum, o) => sum + this.parseUnitsCount(o.units), 0)

      if (totalEl) {
        if (this.parent.animations?.counter) {
          this.parent.animations.counter.animate(totalEl, totalOwners, '', ' Owners', 0, 900)
        } else {
          totalEl.textContent = `${totalOwners} Owners`
        }
      }
      if (countEl) {
        if (this.parent.animations?.counter) {
          this.parent.animations.counter.animate(countEl, approvedCount, '', ' Approved', 0, 900)
        } else {
          countEl.textContent = `${approvedCount} Approved`
        }
      }
      if (avgEl) {
        if (this.parent.animations?.counter) {
          this.parent.animations.counter.animate(avgEl, totalComputers, '', ' Computers', 0, 900)
        } else {
          avgEl.textContent = `${totalComputers} Computers`
        }
      }
    }

    renderRows(items, startIndex) {
      const tbody = document.getElementById('owners-tbody')
      if (!tbody) return

      if (items.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
              <div class="flex flex-col items-center justify-center space-y-3">
                <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                </div>
                <p class="font-medium text-sm">No registered owners match your criteria.</p>
                <p class="text-xs text-slate-400">Try adjusting your search query or category filters.</p>
              </div>
            </td>
          </tr>
        `
        return
      }

      tbody.innerHTML = items
        .map((owner, idx) => {
          const isSelected = this.parent.selectedIds.has(owner.id)
          const rowBg = idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/40'

          // Category Badge Styling
          let catBadgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300/40'
          if (owner.role_id === 0) {
            catBadgeClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300/40'
          } else if (owner.category?.includes('VIP')) {
            catBadgeClass = 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300/40'
          } else if (owner.category?.includes('High-Yield')) {
            catBadgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300/40'
          } else if (owner.category?.includes('Dual')) {
            catBadgeClass = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300/40'
          }

          // Status Badge Styling for Approved, Declined, and Pending
          let statusBadgeClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400 border-emerald-500/30'
          let statusDotClass = 'bg-emerald-500'
          const st = (owner.status || '').toLowerCase()
          if (st === 'declined') {
            statusBadgeClass = 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400 border-rose-500/30'
            statusDotClass = 'bg-rose-500'
          } else if (st === 'pending') {
            statusBadgeClass = 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-400 border-amber-500/30'
            statusDotClass = 'bg-amber-500'
          }

          const isAdmin = owner.role_id === 0

          return `
            <tr id="row-${owner.id}" class="${isAdmin ? 'bg-blue-50/40 dark:bg-slate-800/80 border-l-4 border-l-blue-600' : rowBg} border-b border-slate-200/70 dark:border-slate-800/80 hover:bg-blue-50/50 dark:hover:bg-slate-800/70 transition-colors">
              <!-- Checkbox Column -->
              <td class="w-4 p-3.5 text-center">
                <input id="check-${owner.id}" type="checkbox" data-select-row="${owner.id}" ${isSelected ? 'checked' : ''} class="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 cursor-pointer">
              </td>

              <!-- Owner Profile (Avatar, Full Name & Username) - Clickable to Open View Drawer -->
              <td class="px-4 py-3 text-slate-900 dark:text-white font-medium">
                <div class="flex items-center space-x-3 cursor-pointer group/profile" data-view-owner="${owner.id}" title="Click to view owner profile">
                  <div class="relative">
                    <img src="${owner.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}" alt="${owner.name}" class="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 group-hover/profile:ring-2 group-hover/profile:ring-blue-500 transition">
                    ${isAdmin ? '<span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-xs" title="Pinned Admin">★</span>' : ''}
                  </div>
                  <div class="min-w-0">
                    <div class="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate font-averta group-hover/profile:text-blue-600 dark:group-hover/profile:text-blue-400 transition flex items-center space-x-1.5">
                      <span>${owner.name}</span>
                      ${isAdmin ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-blue-600 text-white font-averta tracking-wider">PINNED ADMIN</span>' : ''}
                      <svg class="w-3.5 h-3.5 text-slate-400 group-hover/profile:text-blue-500 shrink-0 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                    <div class="flex items-center space-x-1.5 mt-0.5">
                      <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-slate-700">
                        @${owner.username || 'user'}
                      </span>
                      <span class="text-[10px] text-slate-400 font-mono">${owner.id}</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Category & Units Count -->
              <td class="px-4 py-3">
                <div class="space-y-1">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${catBadgeClass}">
                    ${owner.category || 'VIP Gaming Rig'}
                  </span>
                  <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    ${owner.units ? (String(owner.units).includes('Unit') ? owner.units : `Units #${owner.units}`) : 'Units #1'}
                  </div>
                </div>
              </td>

              <!-- Recovery Phone Number -->
              <td class="px-4 py-3 text-xs">
                <div class="flex items-center space-x-1.5 font-mono text-slate-700 dark:text-slate-300">
                  <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                  <span class="font-semibold">${owner.phone ? (owner.phone.startsWith('+63') ? owner.phone : `+63 ${owner.phone}`) : '+63 917-000-0000'}</span>
                </div>
                <span class="text-[10px] text-slate-400 block mt-0.5">Recovery contact</span>
              </td>

              <!-- Business Started Date -->
              <td class="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                <div class="font-medium">${owner.dateCreated || new Date().toISOString().slice(0, 10)}</div>
                <span class="text-[10px] text-slate-400">Started</span>
              </td>

              <!-- Status -->
              <td class="px-4 py-3 text-xs whitespace-nowrap">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusBadgeClass}">
                  <span class="w-1.5 h-1.5 rounded-full ${statusDotClass} me-1.5"></span>
                  ${owner.status || 'Approved'}
                </span>
              </td>

              <!-- Actions (Quick Approve with check, Edit, Delete with Solid Vibrant Colors) -->
              <td class="px-4 py-3 text-xs text-right whitespace-nowrap">
                <div class="flex items-center justify-end space-x-1.5">
                  <!-- Quick Approve Action Button (Disabled with off-colors if already Approved) -->
                  <button id="approve-${owner.id}" type="button" data-approve-owner="${owner.id}" title="${(owner.status || '').toLowerCase() === 'approved' ? 'Already Approved' : 'Approve Owner Account'}" ${(owner.status || '').toLowerCase() === 'approved' ? 'disabled' : ''} class="p-1.5 rounded-lg transition shadow-xs ${(owner.status || '').toLowerCase() === 'approved' ? 'text-slate-400 bg-slate-200 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed border border-slate-300 dark:border-slate-700 opacity-60' : 'text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 cursor-pointer'}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <span class="sr-only">Approve ${owner.id}</span>
                  </button>

                  <!-- Edit Action Button (Solid Amber) -->
                  <button id="edit-${owner.id}" type="button" data-edit-owner="${owner.id}" title="Edit Owner & Credentials" class="p-1.5 rounded-lg text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 transition cursor-pointer shadow-xs">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    <span class="sr-only">Edit ${owner.id}</span>
                  </button>

                  <!-- Delete Action Button (Solid Rose, Disabled for Admin role 0) -->
                  <button id="del-${owner.id}" type="button" data-del-owner="${owner.id}" title="${owner.role_id === 0 ? 'Admin account cannot be deleted' : 'Delete Owner'}" ${owner.role_id === 0 ? 'disabled' : ''} class="p-1.5 rounded-lg transition shadow-xs ${owner.role_id === 0 ? 'text-slate-400 bg-slate-200 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed border border-slate-300 dark:border-slate-700 opacity-60' : 'text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 cursor-pointer'}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    <span class="sr-only">Delete ${owner.id}</span>
                  </button>
                </div>
              </td>
            </tr>
          `
        })
        .join('')
    }
  }
  // END: OwnersController - Subchild ready

  // ==========================================
  // SUBCHILD CLASS: FilterController
  // ==========================================
  // START: FilterController - Manages table search, owner/category dropdown filtering, and header sorting
  FilterController = class {
    constructor(parent) {
      this.parent = parent
    }

    // START: FilterController.init - Binds search input, dropdown filter items, and sortable headers
    init() {
      // 1. Search Bar listener with immediate reactive filtering
      const searchInput = document.getElementById('owners-search') || document.getElementById('requests-search') || document.getElementById('bills-search') || document.getElementById('habwa-search')
      searchInput?.addEventListener('input', (e) => {
        this.parent.searchQuery = e.target.value
        this.parent.currentPage = 1
        this.parent.render()
      })

      // Status Filter dropdown selections (for Requests page)
      const statusMenu = document.getElementById('status-filter-menu')
      statusMenu?.addEventListener('click', (e) => {
        const option = e.target.closest('[data-filter-status]')
        if (option) {
          e.preventDefault()
          const status = option.getAttribute('data-filter-status')
          this.parent.selectedStatus = status
          this.parent.currentPage = 1

          const statusLabel = document.getElementById('status-filter-label')
          if (statusLabel) {
            statusLabel.textContent = option.textContent.trim()
          }

          this.parent.render()
          statusMenu.classList.add('hidden')
        }
      })

      // 2. Filter dropdown selections (Owner / Unit)
      const filterMenu = document.getElementById('filter-menu')
      filterMenu?.addEventListener('click', (e) => {
        const option = e.target.closest('[data-filter-owner]')
        if (option) {
          e.preventDefault()
          const owner = option.getAttribute('data-filter-owner')
          this.parent.selectedOwner = owner
          this.parent.currentPage = 1

          // Update filter button text label
          const filterLabel = document.getElementById('filter-label')
          if (filterLabel) {
            filterLabel.textContent = option.textContent.trim()
          }

          this.parent.render()

          // Hide Flowbite dropdown if present
          filterMenu.classList.add('hidden')
        }
      })

      // 3. Category Filter dropdown selections
      const catMenu = document.getElementById('cat-filter-menu')
      catMenu?.addEventListener('click', (e) => {
        const option = e.target.closest('[data-filter-category]')
        if (option) {
          e.preventDefault()
          const cat = option.getAttribute('data-filter-category')
          this.parent.selectedCategory = cat
          this.parent.currentPage = 1

          const catLabel = document.getElementById('cat-filter-label')
          if (catLabel) {
            catLabel.textContent = option.textContent.trim()
          }

          this.parent.render()
          catMenu.classList.add('hidden')
        }
      })

      // 4. Date & Audit Filter dropdown selections (Default: All Logs)
      const dateMenu = document.getElementById('date-filter-menu')
      dateMenu?.addEventListener('click', (e) => {
        const option = e.target.closest('[data-filter-date]')
        if (option) {
          e.preventDefault()
          const dateFilter = option.getAttribute('data-filter-date')
          this.parent.selectedDate = dateFilter
          this.parent.selectedCustomDate = ''
          this.parent.currentPage = 1

          const dateLabel = document.getElementById('date-filter-label')
          if (dateLabel) {
            dateLabel.textContent = option.textContent.trim()
          }

          // Highlight active option
          dateMenu.querySelectorAll('[data-filter-date]').forEach((btn) => {
            btn.classList.remove('font-bold', 'text-blue-600', 'dark:text-blue-400')
            btn.classList.add('font-medium')
          })
          option.classList.remove('font-medium')
          option.classList.add('font-bold', 'text-blue-600', 'dark:text-blue-400')

          this.parent.render()
          dateMenu.classList.add('hidden')
        }
      })

      // 5. Custom Specific Date Picker Input
      const customDateInput = document.getElementById('custom-date-filter')
      customDateInput?.addEventListener('change', (e) => {
        const pickedDate = e.target.value
        if (pickedDate) {
          this.parent.selectedDate = 'custom'
          this.parent.selectedCustomDate = pickedDate
          this.parent.currentPage = 1

          const dateLabel = document.getElementById('date-filter-label')
          if (dateLabel) {
            dateLabel.textContent = pickedDate
          }

          // Reset preset active highlights
          dateMenu?.querySelectorAll('[data-filter-date]').forEach((btn) => {
            btn.classList.remove('font-bold', 'text-blue-600', 'dark:text-blue-400')
            btn.classList.add('font-medium')
          })

          this.parent.render()
          dateMenu?.classList.add('hidden')
        }
      })

      // 3. Sortable table headers
      const tableHeaders = document.querySelectorAll('[data-sort]')
      tableHeaders.forEach((th) => {
        th.addEventListener('click', (e) => {
          e.preventDefault()
          const sortKey = th.getAttribute('data-sort')
          if (this.parent.sortKey === sortKey) {
            // Toggle direction
            this.parent.sortOrder = this.parent.sortOrder === 'asc' ? 'desc' : 'asc'
          } else {
            this.parent.sortKey = sortKey
            this.parent.sortOrder = 'asc'
          }

          // Update sort icons visual feedback
          this.updateSortIndicators(sortKey)
          this.parent.render()
        })
      })
    }
    // END: FilterController.init - Filter listeners ready

    // START: FilterController.updateSortIndicators - Rotates or changes sort indicator SVGs
    updateSortIndicators(activeKey) {
      document.querySelectorAll('[data-sort]').forEach((header) => {
        const key = header.getAttribute('data-sort')
        const icon = header.querySelector('.sort-icon')
        if (!icon) return

        if (key === activeKey) {
          icon.classList.remove('opacity-40')
          icon.classList.add('opacity-100', 'text-blue-600', 'dark:text-blue-400')
          icon.style.transform = this.parent.sortOrder === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)'
        } else {
          icon.classList.remove('opacity-100', 'text-blue-600', 'dark:text-blue-400')
          icon.classList.add('opacity-40')
          icon.style.transform = 'rotate(0deg)'
        }
      })
    }
    // END: FilterController.updateSortIndicators - Sort icons synchronized
  }
  // END: FilterController - Subchild ready

  // ==========================================
  // SUBCHILD CLASS: PaginationController
  // ==========================================
  // START: PaginationController - Manages page numbers, rows-per-page dropdown, and range display
  PaginationController = class {
    constructor(parent) {
      this.parent = parent
    }

    // START: PaginationController.init - Binds page-size dropdown and prev/next buttons
    init() {
      // Prev and Next buttons
      document.getElementById('prev-btn')?.addEventListener('click', () => {
        if (this.parent.currentPage > 1) {
          this.parent.currentPage--
          this.parent.render()
        }
      })

      document.getElementById('next-btn')?.addEventListener('click', () => {
        const filtered = this.parent.getFilteredData()
        const totalPages = Math.ceil(filtered.length / this.parent.rowsPerPage)
        if (this.parent.currentPage < totalPages) {
          this.parent.currentPage++
          this.parent.render()
        }
      })

      // Rows-per-page multiplier dropdown selection
      const pageSizeMenu = document.getElementById('page-size-menu')
      pageSizeMenu?.addEventListener('click', (e) => {
        const item = e.target.closest('[data-size]')
        if (item) {
          e.preventDefault()
          const size = parseInt(item.getAttribute('data-size'), 10)
          if (!isNaN(size)) {
            this.parent.rowsPerPage = size
            this.parent.currentPage = 1
            this.parent.render()
            pageSizeMenu.classList.add('hidden')
          }
        }
      })
    }
    // END: PaginationController.init - Pagination controls bound

    // START: PaginationController.render - Updates showing range text and page buttons
    render(totalItems, startIndex, endIndex, totalPages) {
      // Update the clickable range display e.g. "Showing 1-10 of 42"
      const rangeLabel = document.getElementById('page-size-label')
      const totalCountSpan = document.getElementById('total-count')

      const displayStart = totalItems === 0 ? 0 : startIndex + 1
      const displayEnd = endIndex

      const rangeBtn = document.getElementById('page-size-btn')

      if (rangeLabel) {
        rangeLabel.textContent = `${displayStart}-${displayEnd}`
      } else if (rangeBtn) {
        rangeBtn.innerHTML = `
          <span id="page-size-label">${displayStart}-${displayEnd}</span>
          <svg class="w-3.5 h-3.5 ms-2 text-blue-200 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="m19 9-7 7-7-7" />
          </svg>
        `
      }
      if (totalCountSpan) {
        totalCountSpan.textContent = totalItems.toString()
      }

      // Prev/Next disabled states
      const prevBtn = document.getElementById('prev-btn')
      const nextBtn = document.getElementById('next-btn')

      if (prevBtn) {
        prevBtn.disabled = this.parent.currentPage <= 1
        prevBtn.classList.toggle('opacity-50', this.parent.currentPage <= 1)
        prevBtn.classList.toggle('cursor-not-allowed', this.parent.currentPage <= 1)
      }

      if (nextBtn) {
        nextBtn.disabled = this.parent.currentPage >= totalPages
        nextBtn.classList.toggle('opacity-50', this.parent.currentPage >= totalPages)
        nextBtn.classList.toggle('cursor-not-allowed', this.parent.currentPage >= totalPages)
      }

      // Page numbers container
      const numbersContainer = document.getElementById('page-numbers')
      if (!numbersContainer) return

      let pagesHtml = ''
      for (let p = 1; p <= totalPages; p++) {
        const isActive = p === this.parent.currentPage
        pagesHtml += `
          <button id="page-${p}" type="button" data-page="${p}" class="px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
            isActive
              ? 'bg-white text-blue-600 dark:bg-blue-600 dark:text-white shadow-sm'
              : 'text-blue-100 hover:bg-blue-700/80 hover:text-white dark:text-slate-300 dark:hover:bg-slate-800'
          }">
            ${p}
          </button>
        `
      }
      numbersContainer.innerHTML = pagesHtml

      // Bind click on page numbers
      numbersContainer.querySelectorAll('[data-page]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const p = parseInt(btn.getAttribute('data-page'), 10)
          if (!isNaN(p)) {
            this.parent.currentPage = p
            this.parent.render()
          }
        })
      })
    }
    // END: PaginationController.render - Pagination rendered
  }
  // END: PaginationController - Subchild ready

  // ==========================================
  // SUBCHILD CLASS: SelectionController
  // ==========================================
  // START: SelectionController - Manages select-all and individual checkbox states, plus batch action bar
  SelectionController = class {
    constructor(parent) {
      this.parent = parent
    }

    // START: SelectionController.init - Binds select-all and table row checkboxes
    init() {
      const masterCheckbox = document.getElementById('check-all')
      masterCheckbox?.addEventListener('change', (e) => {
        const isChecked = e.target.checked
        const filtered = this.parent.getFilteredData()
        const startIndex = (this.parent.currentPage - 1) * this.parent.rowsPerPage
        const endIndex = Math.min(startIndex + this.parent.rowsPerPage, filtered.length)
        const paged = filtered.slice(startIndex, endIndex)

        paged.forEach((item) => {
          if (isChecked) {
            this.parent.selectedIds.add(item.id)
          } else {
            this.parent.selectedIds.delete(item.id)
          }
        })

        this.parent.render()
        this.updateBatchBar()
      })

      // Delegated row checkbox selection for all table modes
      const tbody = document.getElementById('owners-tbody') || document.getElementById('requests-tbody') || document.getElementById('bills-tbody') || document.getElementById('habwa-tbody')
      tbody?.addEventListener('change', (e) => {
        const checkbox = e.target.closest('input[type="checkbox"]')
        if (checkbox) {
          const id = checkbox.getAttribute('data-select-row') || checkbox.getAttribute('data-id')
          if (id) {
            if (checkbox.checked) {
              this.parent.selectedIds.add(id)
            } else {
              this.parent.selectedIds.delete(id)
            }
            this.updateBatchBar()
          }
        }
      })

      // Batch action bar handlers
      document.getElementById('batch-export')?.addEventListener('click', () => {
        this.exportSelected()
      })

      document.getElementById('batch-delete')?.addEventListener('click', () => {
        this.deleteSelected()
      })

      // Table-level toolbar export and print buttons
      document.getElementById('export-btn')?.addEventListener('click', () => {
        this.downloadCsv(this.parent.getFilteredData())
      })

      document.getElementById('print-btn')?.addEventListener('click', () => {
        window.print()
      })
    }
    // END: SelectionController.init - Selection listeners ready

    // START: SelectionController.updateMasterCheckbox - Sets header checkbox checked or indeterminate state
    updateMasterCheckbox(pagedItems) {
      const master = document.getElementById('check-all')
      if (!master || pagedItems.length === 0) return

      const allChecked = pagedItems.every((item) => this.parent.selectedIds.has(item.id))
      const someChecked = pagedItems.some((item) => this.parent.selectedIds.has(item.id))

      master.checked = allChecked
      master.indeterminate = !allChecked && someChecked
      this.updateBatchBar()
    }
    // END: SelectionController.updateMasterCheckbox - Checkbox synchronized

    // START: SelectionController.updateBatchBar - Shows or hides the sticky batch actions toolbar
    updateBatchBar() {
      const bar = document.getElementById('batch-bar')
      const countLabel = document.getElementById('batch-count')
      const count = this.parent.selectedIds.size

      if (!bar) return

      if (count > 0) {
        bar.classList.remove('hidden')
        if (countLabel) countLabel.textContent = `${count} selected`
      } else {
        bar.classList.add('hidden')
      }
    }
    // END: SelectionController.updateBatchBar - Batch bar updated

    // START: SelectionController.deleteSelected - Deletes all selected records
    deleteSelected() {
      this.parent.records = this.parent.records.filter(
        (r) => !this.parent.selectedIds.has(r.id)
      )
      this.parent.selectedIds.clear()
      this.parent.render()
      this.updateBatchBar()
    }
    // END: SelectionController.deleteSelected - Selected deleted

    // START: SelectionController.exportSelected - Exports selected records to CSV
    exportSelected() {
      const items = this.parent.records.filter((r) =>
        this.parent.selectedIds.has(r.id)
      )
      this.downloadCsv(items)
    }
    // END: SelectionController.exportSelected - CSV generated

    // START: SelectionController.downloadCsv - Converts items to CSV and triggers file download
    downloadCsv(items) {
      if (!items || items.length === 0) return

      const headers = ['ID', 'Transaction Details', 'Owner', 'Category', 'Amount (PHP)', 'Date', 'Timestamp', 'Attendant', 'Coins Breakdown']
      const rows = items.map((i) => [
        `"${i.id}"`,
        `"${i.desc}"`,
        `"${i.owner}"`,
        `"${i.category}"`,
        i.amount.toFixed(2),
        `"${i.date}"`,
        `"${i.timestamp}"`,
        `"${i.attendant}"`,
        `"${i.coins}"`
      ])

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `Habwa_Logs_Export_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    // END: SelectionController.downloadCsv - Download completed
  }
  // END: SelectionController - Subchild ready

  // START: TableManager.setDrawerManager - Injects external DrawerManager instance
  setDrawerManager(drawerManager) {
    this.drawer = drawerManager
  }
  // END: TableManager.setDrawerManager
}
// END: TableManager - Table module ready
