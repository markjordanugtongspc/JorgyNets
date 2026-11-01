import { AnimationsManager } from './animations.js'
import { userAccountManager } from './auth.js'
import { habwaApi, billsApi, requestsApi, usersApi, notificationsApi, storageManager } from '../../api/index.js'

// START: DrawerManager - Parent OOP coordinator for Flowbite Off-Canvas Drawers and action modals
export class DrawerManager {
  constructor(tableManager = null, mode = 'habwa') {
    this.tableManager = tableManager
    this.mode = mode // 'habwa', 'bills', 'requests', or 'owners'
    this.animations = new AnimationsManager()
    this.habwaDrawer = new this.HabwaDrawerController(this)
    this.billsDrawer = new this.BillsDrawerController(this)
    this.requestsDrawer = new this.RequestsDrawerController(this)
    this.ownersDrawer = new this.OwnersDrawerController(this)
    this.exportsDrawer = new this.ExportsDrawerController(this)
    this.viewDrawer = new this.HabwaViewDrawerController(this)
    this.reviewNoteDrawer = new this.ReviewNoteDrawerController(this)
  }

  // START: DrawerManager.init - Bootstraps all registered drawer subchildren
  init(tableManager = null) {
    if (tableManager) {
      this.tableManager = tableManager
    }
    if (this.mode === 'bills') {
      this.billsDrawer.init()
    } else if (this.mode === 'requests') {
      this.requestsDrawer.init()
      this.reviewNoteDrawer.init()
    } else if (this.mode === 'owners') {
      this.ownersDrawer.init()
    } else if (this.mode === 'exports') {
      this.exportsDrawer.init()
    } else {
      this.habwaDrawer.init()
    }
    this.viewDrawer.init()
  }
  // END: DrawerManager.init - All drawers initialized

  // START: DrawerManager.openCreate - Opens appropriate drawer for new log entry
  openCreate() {
    if (this.mode === 'bills') {
      this.billsDrawer.openCreate()
    } else if (this.mode === 'requests') {
      this.requestsDrawer.openCreate()
    } else if (this.mode === 'owners') {
      this.ownersDrawer.openCreate()
    } else if (this.mode === 'exports') {
      this.exportsDrawer.openCreate()
    } else {
      this.habwaDrawer.openCreate()
    }
  }
  // END: DrawerManager.openCreate

  // START: DrawerManager.openEdit - Opens drawer populated with an existing entry
  openEdit(entry) {
    if (this.mode === 'bills') {
      this.billsDrawer.openEdit(entry)
    } else if (this.mode === 'requests') {
      this.requestsDrawer.openEdit(entry)
    } else if (this.mode === 'owners') {
      this.ownersDrawer.openEdit(entry)
    } else {
      this.habwaDrawer.openEdit(entry)
    }
  }
  // END: DrawerManager.openEdit

  // START: DrawerManager.openView - Opens view drawer populated with entry preview
  openView(entry) {
    if (this.mode === 'owners') {
      this.ownersDrawer.openView(entry)
    } else {
      this.viewDrawer.openView(entry)
    }
  }
  // END: DrawerManager.openView

  // START: DrawerManager.openReviewNote - Opens admin review note drawer to approve or reject with comments for owners
  openReviewNote(entry, actionType = 'Approved') {
    this.reviewNoteDrawer?.open(entry, actionType)
  }
  // END: DrawerManager.openReviewNote

  // START: DrawerManager.lockBodyScroll - Disables scrolling on document.body when drawer or modal is active
  lockBodyScroll() {
    document.body.classList.add('overflow-hidden')
  }
  // END: DrawerManager.lockBodyScroll

  // START: DrawerManager.unlockBodyScroll - Restores body scrolling only if no drawers or modals remain open
  unlockBodyScroll() {
    const isHabwaOpen = document.getElementById('drawer-habwa')?.classList.contains('translate-x-0')
    const isBillsOpen = document.getElementById('drawer-bills')?.classList.contains('translate-x-0')
    const isReqOpen = document.getElementById('drawer-request')?.classList.contains('translate-x-0')
    const isReviewOpen = document.getElementById('drawer-review-note')?.classList.contains('translate-x-0')
    const isOwnerOpen = document.getElementById('drawer-owner')?.classList.contains('translate-x-0')
    const isOwnerViewOpen = document.getElementById('drawer-owner-view')?.classList.contains('translate-x-0') || document.getElementById('drawer-owner-view')?.classList.contains('translate-y-0')
    const isExportOpen = document.getElementById('drawer-export')?.classList.contains('translate-x-0')
    const isViewOpen = document.getElementById('drawer-view')?.classList.contains('translate-x-0') || document.getElementById('drawer-view')?.classList.contains('translate-y-0')
    const isModalOpen = document.getElementById('confirm-modal') !== null

    if (!isHabwaOpen && !isBillsOpen && !isReqOpen && !isReviewOpen && !isOwnerOpen && !isOwnerViewOpen && !isExportOpen && !isViewOpen && !isModalOpen) {
      document.body.classList.remove('overflow-hidden')
    }
  }
  // END: DrawerManager.unlockBodyScroll

  // ==========================================
  // SUBCHILD CLASS: HabwaDrawerController
  // ==========================================
  // START: HabwaDrawerController - Handles the off-canvas drawer for adding and editing Habwa entries
  HabwaDrawerController = class {
    constructor(parent) {
      this.parent = parent
      this.editingId = null
      this.editingOwnerIndex = null
      this.editingCategoryIndex = null

      // Live owner list populated directly from Supabase users table (excluding role_id 0)
      this.owners = []
      this.ownersList = []

      this.categories = [
        'Standard Pisonet',
        'VIP Gaming Rig',
        'Dual Coin Slot',
        'High-Yield Terminal',
        'Coin Slot Arcade'
      ]
    }

    // START: HabwaDrawerController.init - Binds drawer trigger buttons, amount formatter, and custom dropdowns
    init() {
      const addBtn = document.getElementById('add-btn')
      const closeBtn = document.getElementById('close-drawer')
      const cancelBtn = document.getElementById('cancel-btn')
      const form = document.getElementById('habwa-form')

      this.loadOwnersFromDb()

      // Open drawer for new entry
      addBtn?.addEventListener('click', () => {
        this.openCreate()
      })

      // Auto-open drawer if requested via URL action e.g. ?action=add or #add
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('action') === 'add' || window.location.hash === '#add') {
        setTimeout(() => this.openCreate(), 250)
      }

      // Close drawer buttons
      closeBtn?.addEventListener('click', () => this.close())
      cancelBtn?.addEventListener('click', () => this.close())

      // Form submission
      form?.addEventListener('submit', (e) => {
        e.preventDefault()
        this.saveEntry()
      })

      // Initialize subchild interactive components
      this.initAmountFormatter()
      this.initOwnerDropdown()
      if (document.getElementById('cat-btn')) {
        this.initCategoryDropdown()
      }
      this.initDatepicker()
    }
    // END: HabwaDrawerController.init - Listeners ready

    // START: HabwaDrawerController.initDatepicker - Instantiates Flowbite Datepicker instance with dynamic viewport auto-placement
    initDatepicker() {
      const dateEl = document.getElementById('habwa-date')
      if (dateEl && window.Datepicker) {
        if (dateEl._datepicker) return

        // If Flowbite already registered an instance on this element, detach cleanly
        if (typeof dateEl.datepicker === 'object' && dateEl.datepicker) {
          dateEl._datepicker = dateEl.datepicker
          this.bindDatepickerAutoFlip(dateEl, dateEl._datepicker)
          return
        }

        const pickerInstance = new window.Datepicker(dateEl, {
          autohide: true,
          format: 'yyyy-mm-dd',
          orientation: 'auto'
        })

        dateEl._datepicker = pickerInstance
        this.bindDatepickerAutoFlip(dateEl, pickerInstance)
      }
    }

    bindDatepickerAutoFlip(inputEl, pickerInstance) {
      if (!inputEl) return

      const adjustPosition = () => {
        const pickerEl = pickerInstance?.picker?.element || document.querySelector('.datepicker.dropdown.active')
        if (!pickerEl) return

        const rect = inputEl.getBoundingClientRect()
        const pickerRect = pickerEl.getBoundingClientRect()
        const calendarHeight = pickerRect.height || 310
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top

        // If space below is not enough and space above is larger, flip to top
        if (spaceBelow < calendarHeight + 10 && spaceAbove > calendarHeight) {
          const topPosition = rect.top - calendarHeight + window.scrollY - 6
          pickerEl.style.top = `${Math.max(10, topPosition)}px`
          pickerEl.classList.remove('datepicker-orient-bottom')
          pickerEl.classList.add('datepicker-orient-top')
        } else {
          // Anchor directly below input
          const topPosition = rect.bottom + window.scrollY + 6
          pickerEl.style.top = `${topPosition}px`
          pickerEl.classList.remove('datepicker-orient-top')
          pickerEl.classList.add('datepicker-orient-bottom')
        }
      }

      const throttledAdjust = () => {
        requestAnimationFrame(adjustPosition)
      }

      ['show', 'focus', 'click', 'changeMonth', 'changeYear', 'changeView'].forEach((evt) => {
        inputEl.addEventListener(evt, () => setTimeout(adjustPosition, 10))
      })

      // Observe picker view size changes (e.g. clicking year/month switch changes height)
      // to immediately re-anchor and prevent any white-space gap or clipping
      const setupPickerObserver = () => {
        const pickerEl = pickerInstance?.picker?.element || document.querySelector('.datepicker.dropdown')
        if (pickerEl && !pickerEl._hasSizeObserver) {
          pickerEl._hasSizeObserver = true
          const observer = new ResizeObserver(() => throttledAdjust())
          observer.observe(pickerEl)
          // Also listen to view clicks directly inside the picker header
          pickerEl.addEventListener('click', () => setTimeout(adjustPosition, 15))
        }
      }

      inputEl.addEventListener('focus', () => setTimeout(setupPickerObserver, 50))
      inputEl.addEventListener('click', () => setTimeout(setupPickerObserver, 50))

      // Instant dismiss on ANY scroll or wheel outside the datepicker
      const dismissPicker = (e) => {
        const pickerEl = pickerInstance?.picker?.element || document.querySelector('.datepicker.dropdown.active')
        if (pickerEl && !pickerEl.contains(e.target) && e.target !== inputEl) {
          if (typeof pickerInstance.hide === 'function') {
            pickerInstance.hide()
          }
          pickerEl.classList.remove('active', 'block')
          pickerEl.classList.add('hidden')
          inputEl.blur()
        }
      }

      // Capture all scroll and wheel events on document, window, and any scrolling container (drawers)
      window.addEventListener('scroll', dismissPicker, { capture: true, passive: true })
      document.addEventListener('scroll', dismissPicker, { capture: true, passive: true })
      document.addEventListener('wheel', dismissPicker, { capture: true, passive: true })
      document.addEventListener('touchmove', dismissPicker, { capture: true, passive: true })

      const drawerHabwa = document.getElementById('drawer-habwa')
      if (drawerHabwa) {
        drawerHabwa.addEventListener('scroll', dismissPicker, { passive: true })
      }
    }
    // END: HabwaDrawerController.initDatepicker

    // START: HabwaDrawerController.initAmountFormatter - Auto-formats numbers with commas (e.g. 1000 -> 1,000)
    initAmountFormatter() {
      const amtInput = document.getElementById('habwa-amount')
      if (!amtInput) return

      amtInput.addEventListener('input', (e) => {
        // Strip everything except numbers and a single decimal dot
        let value = e.target.value.replace(/[^0-9.]/g, '')
        const parts = value.split('.')
        let integerPart = parts[0]
        const decimalPart = parts.length > 1 ? `.${parts[1].slice(0, 2)}` : ''

        if (integerPart) {
          // Format integer portion with commas
          integerPart = parseInt(integerPart, 10).toLocaleString('en-US')
        }

        e.target.value = `${integerPart}${decimalPart}`
      })

      amtInput.addEventListener('blur', (e) => {
        const raw = parseFloat(e.target.value.replace(/,/g, '') || '0')
        if (!isNaN(raw) && raw > 0) {
          e.target.value = raw.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })
        }
      })
    }
    // END: HabwaDrawerController.initAmountFormatter

    async loadOwnersFromDb() {
      try {
        const res = await usersApi.getOwners()
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          this.ownersList = res.data
          this.owners = res.data.map((u) => `${u.full_name} (${u.units || 'Units'})`)
        } else {
          this.ownersList = []
          this.owners = []
        }
        this.renderOwnerList('')
        const hiddenInput = document.getElementById('habwa-owner')
        const ownerInput = document.getElementById('owner-btn')
        if (hiddenInput && !hiddenInput.value && this.owners[0]) {
          hiddenInput.value = this.owners[0]
          if (ownerInput) ownerInput.value = this.owners[0]
        }
      } catch {
        this.owners = []
        this.ownersList = []
      }
    }

    // START: HabwaDrawerController.initOwnerDropdown - Renders list, edit/delete options, and add action
    initOwnerDropdown() {
      const ownerInput = document.getElementById('owner-btn')
      const addOwnerBtn = document.getElementById('add-owner-btn')
      this.renderOwnerList()

      // Clicking / focusing selects all text for quick editing and ALWAYS shows all options without filtering
      ownerInput?.addEventListener('focus', () => {
        ownerInput.select()
        this.renderOwnerList('')
      })

      ownerInput?.addEventListener('click', () => {
        ownerInput.select()
        this.renderOwnerList('')
        const menu = document.getElementById('owner-menu')
        if (menu) menu.classList.remove('hidden')
      })

      // ONLY when the user actively types or removes characters, filter the dropdown
      ownerInput?.addEventListener('input', (e) => {
        const val = e.target.value
        const hiddenInput = document.getElementById('habwa-owner')
        if (hiddenInput) hiddenInput.value = val
        this.renderOwnerList(val)
        const menu = document.getElementById('owner-menu')
        if (menu) menu.classList.remove('hidden')
      })

      // Pressing enter persists newly typed custom owner
      ownerInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          const val = ownerInput.value.trim()
          if (val) this.addNewOwner(val)
          document.getElementById('owner-menu')?.classList.add('hidden')
        }
      })

      addOwnerBtn?.addEventListener('click', () => {
        const val = ownerInput?.value.trim() || 'New Unit Owner'
        this.addNewOwner(val)
      })
    }

    renderOwnerList(filter = '') {
      const listEl = document.getElementById('owner-list')
      if (!listEl) return

      const query = filter.trim().toLowerCase()
      const filtered = this.owners.filter((o) => !query || o.toLowerCase().includes(query))

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <li class="p-2 text-center text-slate-400 text-xs">
            No matching owners. Press "Add new owner" below.
          </li>
        `
        return
      }

      listEl.innerHTML = filtered
        .map((owner) => {
          const actualIdx = this.owners.indexOf(owner)
          const isEditing = this.editingOwnerIndex === actualIdx

          if (isEditing) {
            return `
              <li class="flex items-center justify-between p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 space-x-2">
                <input id="edit-owner-field" type="text" value="${owner}" class="w-full text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <div class="flex items-center space-x-1 shrink-0">
                  <button id="save-owner-btn" type="button" data-save-owner="${actualIdx}" title="Save changes" class="p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 rounded transition cursor-pointer">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button id="cancel-owner-btn" type="button" data-cancel-owner="${actualIdx}" title="Cancel" class="p-1 text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/80 rounded transition cursor-pointer">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            `
          }

          return `
            <li class="group flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer" data-owner-item="${owner}">
              <div class="flex items-center space-x-2.5 truncate flex-1" data-select-owner="${owner}">
                <div class="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                  ${owner.slice(0, 1)}
                </div>
                <span class="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">${owner}</span>
              </div>
              <button id="edit-owner-${actualIdx}" type="button" data-edit-owner="${actualIdx}" title="Edit owner title" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-600/60 rounded transition cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </li>
          `
        })
        .join('')

      // Focus and select input if currently editing
      if (this.editingOwnerIndex !== null) {
        const input = document.getElementById('edit-owner-field')
        if (input) {
          input.focus()
          input.select()
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              this.submitOwnerEdit(this.editingOwnerIndex, input.value.trim())
            } else if (e.key === 'Escape') {
              e.preventDefault()
              this.editingOwnerIndex = null
              this.renderOwnerList(filter)
            }
          })
        }
      }

      // Event delegation for selection
      listEl.querySelectorAll('[data-select-owner]').forEach((el) => {
        el.addEventListener('click', () => {
          const val = el.getAttribute('data-select-owner')
          this.selectOwner(val)
        })
      })

      // Event delegation for initiating edit
      listEl.querySelectorAll('[data-edit-owner]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          this.editingOwnerIndex = parseInt(btn.getAttribute('data-edit-owner'), 10)
          this.renderOwnerList(filter)
        })
      })

      // Event delegation for save check button
      listEl.querySelectorAll('[data-save-owner]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const idx = parseInt(btn.getAttribute('data-save-owner'), 10)
          const input = document.getElementById('edit-owner-field')
          const val = input ? input.value.trim() : ''
          this.submitOwnerEdit(idx, val)
        })
      })

      // Event delegation for cancel X button
      listEl.querySelectorAll('[data-cancel-owner]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          this.editingOwnerIndex = null
          this.renderOwnerList(filter)
        })
      })
    }

    submitOwnerEdit(index, newValue) {
      const oldName = this.owners[index]

      // If user erased/deleted text, prompt confirmation modal
      if (!newValue) {
        this.confirmDeletion(`owner "${oldName}"`, () => {
          // Temporarily stage item removal from view
          this.owners.splice(index, 1)
          this.editingOwnerIndex = null
          const hiddenInput = document.getElementById('habwa-owner')
          const ownerInput = document.getElementById('owner-btn')
          if (hiddenInput && hiddenInput.value === oldName) {
            const nextVal = this.owners[0] || ''
            hiddenInput.value = nextVal
            if (ownerInput) ownerInput.value = nextVal
          }
          this.renderOwnerList('')

          // Trigger 5-second UNDO countdown toast while drawer stays closed
          const toastManager = this.parent.animations?.toast
          if (toastManager) {
            toastManager.showUndo(
              `Deleted "${oldName}"`,
              // On Undo: restore item back into list, select it, reopen drawer
              () => {
                this.owners.splice(index, 0, oldName)
                this.selectOwner(oldName)
                this.renderOwnerList('')
                this.show()
                document.getElementById('owner-menu')?.classList.remove('hidden')
              },
              // On Expire (3 seconds ended): permanently finalized, reopen drawer
              () => {
                this.show()
              },
              3
            )
          } else {
            this.show()
          }
        }, () => {
          this.editingOwnerIndex = null
          this.renderOwnerList('')
        })
        return
      }

      // Update name
      this.owners[index] = newValue
      this.editingOwnerIndex = null

      const hiddenInput = document.getElementById('habwa-owner')
      const ownerInput = document.getElementById('owner-btn')
      if (hiddenInput && hiddenInput.value === oldName) {
        hiddenInput.value = newValue
        if (ownerInput) ownerInput.value = newValue
      }
      this.renderOwnerList('')
    }

    selectOwner(val) {
      const hiddenInput = document.getElementById('habwa-owner')
      const ownerInput = document.getElementById('owner-btn')
      if (hiddenInput) hiddenInput.value = val
      if (ownerInput) ownerInput.value = val
      document.getElementById('owner-menu')?.classList.add('hidden')
    }

    addNewOwner(name) {
      if (!name) return
      if (!this.owners.includes(name)) {
        this.owners.push(name)
        // Automatically registers into user accounts with default password @JorgyPisonets#123 and trimmed username
        userAccountManager.createUser({ name })
      }
      this.selectOwner(name)
      this.renderOwnerList('')

      // 1. Temporarily slide close the drawer
      this.close()

      // 2. Show indicator toast on top for around 3 seconds
      const toastManager = this.parent.animations?.toast
      if (toastManager) {
        toastManager.show(`Pisonet Owner "${name}" added successfully!`, 3000, () => {
          // 3. Go back and reopen the drawer
          this.show()

          // 4. Reveal the owner dropdown menu
          const menu = document.getElementById('owner-menu')
          if (menu) menu.classList.remove('hidden')

          // 5. Auto scroll down to the newly created owner and highlight it temporarily
          setTimeout(() => {
            const listEl = document.getElementById('owner-list')
            if (!listEl) return
            const target = listEl.querySelector(`[data-owner-item="${name}"]`) || listEl.lastElementChild
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              target.classList.add('bg-blue-100', 'dark:bg-blue-950', 'ring-2', 'ring-blue-500', 'transition-all', 'duration-300')
              setTimeout(() => {
                target.classList.remove('bg-blue-100', 'dark:bg-blue-950', 'ring-2', 'ring-blue-500')
              }, 2000)
            }
          }, 150)
        })
      }
    }
    // END: HabwaDrawerController.initOwnerDropdown

    // START: HabwaDrawerController.initCategoryDropdown - Renders list, edit/delete options, and add action
    initCategoryDropdown() {
      const catInput = document.getElementById('cat-btn')
      const addCatBtn = document.getElementById('add-cat-btn')
      this.renderCategoryList()

      // Clicking / focusing selects all text for quick editing and ALWAYS shows all options without filtering
      catInput?.addEventListener('focus', () => {
        catInput.select()
        this.renderCategoryList('')
      })

      catInput?.addEventListener('click', () => {
        catInput.select()
        this.renderCategoryList('')
        const menu = document.getElementById('cat-menu')
        if (menu) menu.classList.remove('hidden')
      })

      // ONLY when the user actively types or removes characters, filter the dropdown
      catInput?.addEventListener('input', (e) => {
        const val = e.target.value
        const hiddenInput = document.getElementById('habwa-cat')
        if (hiddenInput) hiddenInput.value = val
        this.renderCategoryList(val)
        const menu = document.getElementById('cat-menu')
        if (menu) menu.classList.remove('hidden')
      })

      // Pressing enter persists newly typed custom category
      catInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          const val = catInput.value.trim()
          if (val) this.addNewCategory(val)
        }
      })

      addCatBtn?.addEventListener('click', () => {
        const val = catInput?.value.trim() || 'Custom Terminal Rig'
        this.addNewCategory(val)
      })
    }

    renderCategoryList(filter = '') {
      const listEl = document.getElementById('cat-list')
      if (!listEl) return

      const query = filter.trim().toLowerCase()
      const filtered = this.categories.filter((c) => !query || c.toLowerCase().includes(query))

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <li class="p-2 text-center text-slate-400 text-xs">
            No matching categories. Press "Add new category" below.
          </li>
        `
        return
      }

      listEl.innerHTML = filtered
        .map((cat) => {
          const actualIdx = this.categories.indexOf(cat)
          const isEditing = this.editingCategoryIndex === actualIdx

          if (isEditing) {
            return `
              <li class="flex items-center justify-between p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 space-x-2">
                <input id="edit-cat-field" type="text" value="${cat}" class="w-full text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                <div class="flex items-center space-x-1 shrink-0">
                  <button id="save-cat-btn" type="button" data-save-cat="${actualIdx}" title="Save changes" class="p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 rounded transition cursor-pointer">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button id="cancel-cat-btn" type="button" data-cancel-cat="${actualIdx}" title="Cancel" class="p-1 text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/80 rounded transition cursor-pointer">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            `
          }

          return `
            <li class="group flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer" data-cat-item="${cat}">
              <div class="flex items-center space-x-2.5 truncate flex-1" data-select-cat="${cat}">
                <div class="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                  #
                </div>
                <span class="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">${cat}</span>
              </div>
              <button id="edit-cat-${actualIdx}" type="button" data-edit-cat="${actualIdx}" title="Edit category title" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200 dark:hover:bg-slate-600/60 rounded transition cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </li>
          `
        })
        .join('')

      // Focus and select input if currently editing
      if (this.editingCategoryIndex !== null) {
        const input = document.getElementById('edit-cat-field')
        if (input) {
          input.focus()
          input.select()
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              this.submitCategoryEdit(this.editingCategoryIndex, input.value.trim())
            } else if (e.key === 'Escape') {
              e.preventDefault()
              this.editingCategoryIndex = null
              this.renderCategoryList(filter)
            }
          })
        }
      }

      // Event delegation for selection
      listEl.querySelectorAll('[data-select-cat]').forEach((el) => {
        el.addEventListener('click', () => {
          const val = el.getAttribute('data-select-cat')
          this.selectCategory(val)
        })
      })

      // Event delegation for initiating edit
      listEl.querySelectorAll('[data-edit-cat]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          this.editingCategoryIndex = parseInt(btn.getAttribute('data-edit-cat'), 10)
          this.renderCategoryList(filter)
        })
      })

      // Event delegation for save check button
      listEl.querySelectorAll('[data-save-cat]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const idx = parseInt(btn.getAttribute('data-save-cat'), 10)
          const input = document.getElementById('edit-cat-field')
          const val = input ? input.value.trim() : ''
          this.submitCategoryEdit(idx, val)
        })
      })

      // Event delegation for cancel X button
      listEl.querySelectorAll('[data-cancel-cat]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          this.editingCategoryIndex = null
          this.renderCategoryList(filter)
        })
      })
    }

    submitCategoryEdit(index, newValue) {
      const oldName = this.categories[index]

      // If user erased/deleted text, prompt confirmation modal
      if (!newValue) {
        this.confirmDeletion(`category "${oldName}"`, () => {
          // Temporarily stage item removal from view
          this.categories.splice(index, 1)
          this.editingCategoryIndex = null
          const hiddenInput = document.getElementById('habwa-cat')
          const catInput = document.getElementById('cat-btn')
          if (hiddenInput && hiddenInput.value === oldName) {
            const nextVal = this.categories[0] || ''
            hiddenInput.value = nextVal
            if (catInput) catInput.value = nextVal
          }
          this.renderCategoryList('')

          // Trigger 5-second UNDO countdown toast while drawer stays closed
          const toastManager = this.parent.animations?.toast
          if (toastManager) {
            toastManager.showUndo(
              `Deleted "${oldName}"`,
              // On Undo: restore category back into list, select it, reopen drawer
              () => {
                this.categories.splice(index, 0, oldName)
                this.selectCategory(oldName)
                this.renderCategoryList('')
                this.show()
                document.getElementById('cat-menu')?.classList.remove('hidden')
              },
              // On Expire (3 seconds ended): permanently finalized, reopen drawer
              () => {
                this.show()
              },
              3
            )
          } else {
            this.show()
          }
        }, () => {
          this.editingCategoryIndex = null
          this.renderCategoryList('')
        })
        return
      }

      // Update name
      this.categories[index] = newValue
      this.editingCategoryIndex = null

      const hiddenInput = document.getElementById('habwa-cat')
      const catInput = document.getElementById('cat-btn')
      if (hiddenInput && hiddenInput.value === oldName) {
        hiddenInput.value = newValue
        if (catInput) catInput.value = newValue
      }
      this.renderCategoryList('')
    }

    selectCategory(val) {
      const hiddenInput = document.getElementById('habwa-cat')
      const catInput = document.getElementById('cat-btn')
      if (hiddenInput) hiddenInput.value = val
      if (catInput) catInput.value = val
      document.getElementById('cat-menu')?.classList.add('hidden')
    }

    addNewCategory(name) {
      if (!name) return
      if (!this.categories.includes(name)) {
        this.categories.push(name)
      }
      this.selectCategory(name)
      this.renderCategoryList('')

      // 1. Temporarily slide close the drawer
      this.close()

      // 2. Show indicator toast on top for around 3 seconds
      const toastManager = this.parent.animations?.toast
      if (toastManager) {
        toastManager.show(`Category "${name}" added successfully!`, 3000, () => {
          // 3. Go back and reopen the drawer
          this.show()

          // 4. Reveal the category dropdown menu
          const menu = document.getElementById('cat-menu')
          if (menu) menu.classList.remove('hidden')

          // 5. Auto scroll down to the newly created item and highlight it temporarily
          setTimeout(() => {
            const listEl = document.getElementById('cat-list')
            if (!listEl) return
            const target = listEl.querySelector(`[data-cat-item="${name}"]`) || listEl.lastElementChild
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              target.classList.add('bg-emerald-100', 'dark:bg-emerald-950', 'ring-2', 'ring-emerald-500', 'transition-all', 'duration-300')
              setTimeout(() => {
                target.classList.remove('bg-emerald-100', 'dark:bg-emerald-950', 'ring-2', 'ring-emerald-500')
              }, 2000)
            }
          }, 150)
        })
      }
    }

    // START: HabwaDrawerController.confirmDeletion - Closes drawer, shows 2-button grid confirmation modal, handles Yes/No
    confirmDeletion(targetLabel, onConfirm, onCancel) {
      // 1. Temporarily close the drawer
      this.close()

      // 2. Remove any existing confirm modal
      const existing = document.getElementById('confirm-modal')
      if (existing) existing.remove()

      // 3. Create Flowbite-styled modal overlay
      const modal = document.createElement('div')
      modal.id = 'confirm-modal'
      modal.tabIndex = -1
      modal.className =
        'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300'

      // Keep outside body scroll locked during modal
      this.parent.lockBodyScroll()

      modal.innerHTML = `
        <div class="relative w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 font-poppins">
          <div class="text-center">
            <div class="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white font-averta mb-2">Delete Confirmation</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Are you sure you want to permanently delete this ${targetLabel}? This action cannot be undone.
            </p>
          </div>
          <!-- 2 Separated Grid Medium Buttons (No / Yes) with proper theme styling -->
          <div class="grid grid-cols-2 gap-3">
            <button id="confirm-no" type="button" class="w-full py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 rounded-xl transition cursor-pointer text-center">
              No, Keep
            </button>
            <button id="confirm-yes" type="button" class="w-full py-2.5 px-4 text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-md shadow-rose-600/30 transition cursor-pointer text-center">
              Yes, Delete
            </button>
          </div>
        </div>
      `

      document.body.appendChild(modal)

      const cleanup = (shouldReopen = true) => {
        modal.remove()
        if (shouldReopen) {
          this.show()
        }
      }

      modal.querySelector('#confirm-yes')?.addEventListener('click', () => {
        cleanup(false) // Do NOT reopen drawer yet, keep closed during 5s undo window
        if (onConfirm) onConfirm()
      })

      modal.querySelector('#confirm-no')?.addEventListener('click', () => {
        cleanup(true) // Reopen drawer immediately on cancel
        if (onCancel) onCancel()
      })
    }
    // END: HabwaDrawerController.initCategoryDropdown

    // START: HabwaDrawerController.openCreate - Prepares clean form for new log
    openCreate() {
      this.editingId = null
      const title = document.getElementById('drawer-title')
      const form = document.getElementById('habwa-form')
      if (title) title.textContent = 'Log New Habwa Collection'
      if (form) form.reset()

      if (this.owners.length > 0) {
        this.selectOwner(this.owners[0])
      } else {
        const hiddenInput = document.getElementById('habwa-owner')
        const ownerInput = document.getElementById('owner-btn')
        if (hiddenInput) hiddenInput.value = ''
        if (ownerInput) ownerInput.value = ''
      }
      this.loadOwnersFromDb()

      const dateInput = document.getElementById('habwa-date')
      if (dateInput) {
        dateInput.value = new Date().toISOString().slice(0, 10)
      }

      const amtInput = document.getElementById('habwa-amount')
      if (amtInput) amtInput.value = ''

      this.show()
    }
    // END: HabwaDrawerController.openCreate - Ready for new log

    // START: HabwaDrawerController.openEdit - Populates form with existing record
    openEdit(entry) {
      this.editingId = entry.id
      const title = document.getElementById('drawer-title')
      if (title) title.textContent = `Edit Habwa Log (${entry.id})`

      const descInput = document.getElementById('habwa-desc')
      const amtInput = document.getElementById('habwa-amount')
      const dateInput = document.getElementById('habwa-date')
      const notesInput = document.getElementById('habwa-notes')

      if (descInput) descInput.value = entry.desc
      if (dateInput) dateInput.value = entry.date
      if (notesInput) notesInput.value = entry.coins

      this.selectOwner(entry.owner)
      if (document.getElementById('habwa-cat')) {
        this.selectCategory(entry.category)
      }

      if (amtInput) {
        amtInput.value = entry.amount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      }

      this.show()
    }
    // END: HabwaDrawerController.openEdit - Populated

    // START: HabwaDrawerController.show - Slides drawer into viewport with backdrop
    show() {
      const drawer = document.getElementById('drawer-habwa')
      if (!drawer) return
      drawer.classList.remove('translate-x-full')
      drawer.classList.add('translate-x-0')

      // Lock outside body scroll
      this.parent.lockBodyScroll()

      let backdrop = document.getElementById('drawer-backdrop')
      if (!backdrop) {
        backdrop = document.createElement('div')
        backdrop.id = 'drawer-backdrop'
        backdrop.className = 'fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300'
        backdrop.addEventListener('click', () => this.close())
        document.body.appendChild(backdrop)
      }
    }
    // END: HabwaDrawerController.show - Slide-in complete

    // START: HabwaDrawerController.close - Slides drawer out of viewport and removes backdrop
    close() {
      const drawer = document.getElementById('drawer-habwa')
      if (drawer) {
        drawer.classList.add('translate-x-full')
        drawer.classList.remove('translate-x-0')
      }
      document.getElementById('drawer-backdrop')?.remove()
      document.getElementById('owner-menu')?.classList.add('hidden')
      document.getElementById('cat-menu')?.classList.add('hidden')

      // Unlock outside body scroll
      this.parent.unlockBodyScroll()
    }
    // END: HabwaDrawerController.close - Closed

    // START: HabwaDrawerController.saveEntry - Validates and persists entry into Supabase backend
    async saveEntry() {
      const desc = document.getElementById('habwa-desc')?.value.trim() || 'Coin Box Habwa Collection'
      const ownerName = document.getElementById('habwa-owner')?.value || 'Unassigned Owner'
      const category = document.getElementById('habwa-cat')?.value || 'Standard Pisonet'
      const rawAmtStr = document.getElementById('habwa-amount')?.value.replace(/,/g, '') || '0'
      const amount = parseFloat(rawAmtStr) || 0
      const date = document.getElementById('habwa-date')?.value || new Date().toISOString().slice(0, 10)
      const coins = document.getElementById('habwa-notes')?.value.trim() || '₱1: 200 | ₱5: 400 | ₱10: 100'

      // Match selected owner to their Supabase user ID
      let ownerId = null
      if (Array.isArray(this.ownersList) && this.ownersList.length > 0) {
        const found = this.ownersList.find(
          (u) =>
            ownerName.toLowerCase().includes(u.full_name.toLowerCase()) ||
            u.full_name.toLowerCase().includes(ownerName.split('(')[0].trim().toLowerCase())
        )
        if (found) ownerId = found.id
      }

      if (!ownerId && this.ownersList && this.ownersList[0]) {
        ownerId = this.ownersList[0].id
      }

      const tm = this.parent.tableManager

      if (this.editingId) {
        const item = tm?.records?.find((r) => r.id === this.editingId)
        const targetDbId = item?.dbId || this.editingId

        await habwaApi.update(targetDbId, {
          description: desc,
          category,
          amount,
          coins_breakdown: coins,
          harvested_at: new Date(date).toISOString(),
          ...(ownerId ? { owner_id: ownerId } : {})
        })
        this.parent.animations?.toast?.show('Habwa collection updated successfully!')
      } else {
        const nextNum = (tm?.records?.length || 0) + 1
        const refCode = `HBW-${nextNum.toString().padStart(3, '0')}`

        await habwaApi.create({
          ref_code: refCode,
          owner_id: ownerId,
          description: desc,
          category,
          amount,
          coins_breakdown: coins,
          attendant: 'Admin Leo',
          status: 'Audited',
          harvested_at: new Date(date).toISOString()
        })
        this.parent.animations?.toast?.show('Habwa collection logged to database!')
      }

      if (tm) {
        await tm.loadFromSupabase()
        tm.render()
      }

      this.close()
    }
    // END: HabwaDrawerController.saveEntry - Saved and rendered
  }
  // END: HabwaDrawerController - Subchild ready

  // ==========================================
  // SUBCHILD CLASS: BillsDrawerController
  // ==========================================
  // START: BillsDrawerController - Manages the off-canvas drawer for creating & editing monthly deduction bills
  BillsDrawerController = class {
    constructor(parent) {
      this.parent = parent
      this.editingId = null
      this.editingCategoryIndex = null

      // Default bill categories with edit & add capabilities
      this.categories = [
        'PLDT FIBR INTERNET',
        'VECO ELECTRICITY',
        'CONVERGE BACKUP FIBER',
        'COIN CHUTE CLEANING & REPAIRS',
        'WATER UTILITY',
        'NETWORK SWITCH UPGRADE',
        'STOREFRONT MAINTENANCE',
        'HARDWARE REPLACEMENT'
      ]

      this.ownerSearchQuery = ''
    }

    // START: BillsDrawerController.init - Binds action buttons, form submission, and amount formatters
    init() {
      const addBtn = document.getElementById('add-btn')
      const closeBtn = document.getElementById('close-drawer')
      const cancelBtn = document.getElementById('cancel-btn')
      const form = document.getElementById('bills-form')
      const selectAllBtn = document.getElementById('select-all-owners')

      // Open drawer for new bill
      addBtn?.addEventListener('click', () => {
        this.openCreate()
      })

      // Auto-open drawer if requested via URL action e.g. ?action=add or #add
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('action') === 'add' || window.location.hash === '#add') {
        setTimeout(() => this.openCreate(), 250)
      }

      // Close buttons
      closeBtn?.addEventListener('click', () => this.close())
      cancelBtn?.addEventListener('click', () => this.close())

      // Select-all owners toggle
      selectAllBtn?.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('input[name="owner-role"]')
        const allChecked = Array.from(checkboxes).every((c) => c.checked)
        checkboxes.forEach((c) => (c.checked = !allChecked))
        this.updateLiveSplitPreview()
      })

      // Form submission
      form?.addEventListener('submit', (e) => {
        e.preventDefault()
        this.saveEntry()
      })

      // Amount live auto-formatter and reactive split calculator
      this.initAmountFormatter()

      // Initialize Category dropdown and dynamic Owner Checklist
      this.initCategoryDropdown()
      this.initOwnerChecklist()
      this.initDatepicker()

      // Listen to category or role checkbox changes for real-time split recalculation
      document.getElementById('bill-category')?.addEventListener('input', () => this.updateLiveSplitPreview())
    }
    // END: BillsDrawerController.init

    // START: BillsDrawerController.initDatepicker - Instantiates Flowbite Datepicker instance with dynamic viewport auto-placement
    initDatepicker() {
      const dateEl = document.getElementById('bill-date')
      if (dateEl && window.Datepicker) {
        if (dateEl._datepicker) return

        // If Flowbite already registered an instance on this element, detach cleanly
        if (typeof dateEl.datepicker === 'object' && dateEl.datepicker) {
          dateEl._datepicker = dateEl.datepicker
          this.bindDatepickerAutoFlip(dateEl, dateEl._datepicker)
          return
        }

        const pickerInstance = new window.Datepicker(dateEl, {
          autohide: true,
          format: 'yyyy-mm-dd',
          orientation: 'auto'
        })

        dateEl._datepicker = pickerInstance
        this.bindDatepickerAutoFlip(dateEl, pickerInstance)
      }
    }

    bindDatepickerAutoFlip(inputEl, pickerInstance) {
      if (!inputEl) return

      const adjustPosition = () => {
        const pickerEl = pickerInstance?.picker?.element || document.querySelector('.datepicker.dropdown.active')
        if (!pickerEl) return

        const rect = inputEl.getBoundingClientRect()
        const pickerRect = pickerEl.getBoundingClientRect()
        const calendarHeight = pickerRect.height || 310
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top

        // If space below is not enough and space above is larger, flip to top
        if (spaceBelow < calendarHeight + 10 && spaceAbove > calendarHeight) {
          const topPosition = rect.top - calendarHeight + window.scrollY - 6
          pickerEl.style.top = `${Math.max(10, topPosition)}px`
          pickerEl.classList.remove('datepicker-orient-bottom')
          pickerEl.classList.add('datepicker-orient-top')
        } else {
          // Anchor directly below input
          const topPosition = rect.bottom + window.scrollY + 6
          pickerEl.style.top = `${topPosition}px`
          pickerEl.classList.remove('datepicker-orient-top')
          pickerEl.classList.add('datepicker-orient-bottom')
        }
      }

      const throttledAdjust = () => {
        requestAnimationFrame(adjustPosition)
      }

      ['show', 'focus', 'click', 'changeMonth', 'changeYear', 'changeView'].forEach((evt) => {
        inputEl.addEventListener(evt, () => setTimeout(adjustPosition, 10))
      })

      // Observe picker view size changes (e.g. clicking year/month switch changes height)
      // to immediately re-anchor and prevent any white-space gap or clipping
      const setupPickerObserver = () => {
        const pickerEl = pickerInstance?.picker?.element || document.querySelector('.datepicker.dropdown')
        if (pickerEl && !pickerEl._hasSizeObserver) {
          pickerEl._hasSizeObserver = true
          const observer = new ResizeObserver(() => throttledAdjust())
          observer.observe(pickerEl)
          // Also listen to view clicks directly inside the picker header
          pickerEl.addEventListener('click', () => setTimeout(adjustPosition, 15))
        }
      }

      inputEl.addEventListener('focus', () => setTimeout(setupPickerObserver, 50))
      inputEl.addEventListener('click', () => setTimeout(setupPickerObserver, 50))

      // Instant dismiss on ANY scroll or wheel outside the datepicker
      const dismissPicker = (e) => {
        const pickerEl = pickerInstance?.picker?.element || document.querySelector('.datepicker.dropdown.active')
        if (pickerEl && !pickerEl.contains(e.target) && e.target !== inputEl) {
          if (typeof pickerInstance.hide === 'function') {
            pickerInstance.hide()
          }
          pickerEl.classList.remove('active', 'block')
          pickerEl.classList.add('hidden')
          inputEl.blur()
        }
      }

      // Capture all scroll and wheel events on document, window, and any scrolling container (drawers)
      window.addEventListener('scroll', dismissPicker, { capture: true, passive: true })
      document.addEventListener('scroll', dismissPicker, { capture: true, passive: true })
      document.addEventListener('wheel', dismissPicker, { capture: true, passive: true })
      document.addEventListener('touchmove', dismissPicker, { capture: true, passive: true })

      const drawerBills = document.getElementById('drawer-bills')
      if (drawerBills) {
        drawerBills.addEventListener('scroll', dismissPicker, { passive: true })
      }
    }
    // END: BillsDrawerController.initDatepicker

    // START: BillsDrawerController.initCategoryDropdown - Category dropdown with search, add, edit, and delete
    initCategoryDropdown() {
      const catInput = document.getElementById('bill-cat-btn')
      const addCatBtn = document.getElementById('add-bill-cat-btn')
      this.renderCategoryList()

      catInput?.addEventListener('focus', () => {
        catInput.select()
        this.renderCategoryList('')
      })

      catInput?.addEventListener('click', () => {
        catInput.select()
        this.renderCategoryList('')
        document.getElementById('bill-cat-menu')?.classList.remove('hidden')
      })

      catInput?.addEventListener('input', (e) => {
        const val = e.target.value
        const hiddenInput = document.getElementById('bill-category')
        if (hiddenInput) hiddenInput.value = val
        this.renderCategoryList(val)
        document.getElementById('bill-cat-menu')?.classList.remove('hidden')
        this.updateLiveSplitPreview()
      })

      catInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          const val = catInput.value.trim().toUpperCase()
          if (val) this.addNewCategory(val)
          document.getElementById('bill-cat-menu')?.classList.add('hidden')
        }
      })

      addCatBtn?.addEventListener('click', () => {
        const val = catInput?.value.trim().toUpperCase() || 'NEW SERVICE BILL'
        this.addNewCategory(val)
      })
    }

    renderCategoryList(filter = '') {
      const listEl = document.getElementById('bill-cat-list')
      if (!listEl) return

      const query = filter.trim().toLowerCase()
      const filtered = this.categories.filter((c) => !query || c.toLowerCase().includes(query))

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <li class="p-2 text-center text-slate-400 text-xs">
            No matching categories. Press "Add new category" below.
          </li>
        `
        return
      }

      listEl.innerHTML = filtered
        .map((cat) => {
          const actualIdx = this.categories.indexOf(cat)
          const isEditing = this.editingCategoryIndex === actualIdx

          if (isEditing) {
            return `
              <li class="flex items-center justify-between p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 space-x-2">
                <input id="edit-bill-cat-field" type="text" value="${cat}" class="w-full text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 focus:ring-2 focus:ring-rose-500 focus:outline-none uppercase" />
                <div class="flex items-center space-x-1 shrink-0">
                  <button id="save-bill-cat-btn" type="button" data-save-bill-cat="${actualIdx}" title="Save changes" class="p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 rounded transition cursor-pointer">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button id="cancel-bill-cat-btn" type="button" data-cancel-bill-cat="${actualIdx}" title="Cancel" class="p-1 text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/80 rounded transition cursor-pointer">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            `
          }

          return `
            <li class="group flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer" data-bill-cat-item="${cat}">
              <div class="flex items-center space-x-2.5 truncate flex-1" data-select-bill-cat="${cat}">
                <div class="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-[10px] shrink-0 uppercase">
                  ${cat.slice(0, 1)}
                </div>
                <span class="truncate text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase">${cat}</span>
              </div>
              <button id="edit-bill-cat-${actualIdx}" type="button" data-edit-bill-cat="${actualIdx}" title="Edit category title" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-600/60 rounded transition cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </li>
          `
        })
        .join('')

      if (this.editingCategoryIndex !== null) {
        const input = document.getElementById('edit-bill-cat-field')
        if (input) {
          input.focus()
          input.select()
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              this.submitCategoryEdit(this.editingCategoryIndex, input.value.trim().toUpperCase())
            } else if (e.key === 'Escape') {
              e.preventDefault()
              this.editingCategoryIndex = null
              this.renderCategoryList(filter)
            }
          })
        }
      }

      listEl.querySelectorAll('[data-select-bill-cat]').forEach((el) => {
        el.addEventListener('click', () => {
          const val = el.getAttribute('data-select-bill-cat')
          this.selectCategory(val)
        })
      })

      listEl.querySelectorAll('[data-edit-bill-cat]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          this.editingCategoryIndex = parseInt(btn.getAttribute('data-edit-bill-cat'), 10)
          this.renderCategoryList(filter)
        })
      })

      listEl.querySelectorAll('[data-save-bill-cat]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const idx = parseInt(btn.getAttribute('data-save-bill-cat'), 10)
          const input = document.getElementById('edit-bill-cat-field')
          const val = input ? input.value.trim().toUpperCase() : ''
          this.submitCategoryEdit(idx, val)
        })
      })

      listEl.querySelectorAll('[data-cancel-bill-cat]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          this.editingCategoryIndex = null
          this.renderCategoryList(filter)
        })
      })
    }

    submitCategoryEdit(index, newValue) {
      const oldName = this.categories[index]
      if (!newValue) {
        this.categories.splice(index, 1)
        this.editingCategoryIndex = null
        const hiddenInput = document.getElementById('bill-category')
        const catInput = document.getElementById('bill-cat-btn')
        if (hiddenInput && hiddenInput.value === oldName) {
          const nextVal = this.categories[0] || 'GENERAL BILL'
          hiddenInput.value = nextVal
          if (catInput) catInput.value = nextVal
        }
        this.renderCategoryList('')
        this.updateLiveSplitPreview()
        return
      }

      this.categories[index] = newValue
      this.editingCategoryIndex = null

      const hiddenInput = document.getElementById('bill-category')
      const catInput = document.getElementById('bill-cat-btn')
      if (hiddenInput && hiddenInput.value === oldName) {
        hiddenInput.value = newValue
        if (catInput) catInput.value = newValue
      }
      this.renderCategoryList('')
      this.updateLiveSplitPreview()
    }

    selectCategory(val) {
      const hiddenInput = document.getElementById('bill-category')
      const catInput = document.getElementById('bill-cat-btn')
      if (hiddenInput) hiddenInput.value = val
      if (catInput) catInput.value = val
      document.getElementById('bill-cat-menu')?.classList.add('hidden')
      this.updateLiveSplitPreview()
    }

    addNewCategory(name) {
      if (!name) return
      if (!this.categories.includes(name)) {
        this.categories.push(name)
      }
      this.selectCategory(name)
      this.renderCategoryList('')
    }
    // END: BillsDrawerController.initCategoryDropdown

    async loadOwnersFromDb() {
      try {
        const res = await usersApi.getOwners()
        if (res.success && Array.isArray(res.data)) {
          this.ownersList = res.data
          this.renderOwnerCheckboxes()
          this.updateLiveSplitPreview()
        }
      } catch {
        // Fallback gracefully
      }
    }

    // START: BillsDrawerController.initOwnerChecklist - Fetches owners from Habwa list with searchable filter
    initOwnerChecklist() {
      const searchInput = document.getElementById('owner-search-input')
      searchInput?.addEventListener('input', (e) => {
        this.ownerSearchQuery = e.target.value.trim().toLowerCase()
        this.renderOwnerCheckboxes()
      })
      this.loadOwnersFromDb()
    }

    renderOwnerCheckboxes() {
      const container = document.getElementById('owners-checkbox-group')
      if (!container) return

      // Use live owners loaded from database
      const owners = Array.isArray(this.ownersList) ? this.ownersList : []

      if (owners.length === 0) {
        container.innerHTML = `
          <div class="text-center py-3 text-xs text-slate-400">
            No registered unit owners found in database. Please register an owner in Owners page.
          </div>
        `
        return
      }

      // Remember previously checked roles
      const currentlyChecked = new Set(
        Array.from(container.querySelectorAll('input[name="owner-role"]:checked')).map((c) => c.value)
      )
      const hasInitialSelection = currentlyChecked.size > 0

      const badgeColors = [
        'text-amber-500',
        'text-sky-500',
        'text-indigo-500',
        'text-emerald-500',
        'text-purple-500',
        'text-pink-500'
      ]

      const filtered = owners.filter((u) => {
        const displayStr = `${u.full_name}${u.units ? ` (${u.units})` : ''}`
        return !this.ownerSearchQuery || displayStr.toLowerCase().includes(this.ownerSearchQuery)
      })

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="text-center py-2 text-xs text-slate-400">
            No matching owners found.
          </div>
        `
        return
      }

      container.innerHTML = filtered
        .map((u, idx) => {
          const roleIndex = (idx + 1).toString()
          const colorClass = badgeColors[idx % badgeColors.length]
          const isChecked = hasInitialSelection ? currentlyChecked.has(roleIndex) : true
          const displayStr = `${u.full_name}${u.units ? ` (${u.units})` : ''}`

          return `
            <label class="flex items-center space-x-2.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 p-1.5 rounded-lg transition">
              <input type="checkbox" name="owner-role" value="${roleIndex}" data-owner-id="${u.id}" data-owner-name="${displayStr}" ${isChecked ? 'checked' : ''} class="w-4 h-4 text-rose-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-sm focus:ring-rose-500">
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200">
                <span class="font-bold ${colorClass}">${roleIndex}</span> - ${displayStr}
              </span>
            </label>
          `
        })
        .join('')

      // Bind reactive change listener to all dynamically rendered checkboxes
      container.querySelectorAll('input[name="owner-role"]').forEach((checkbox) => {
        checkbox.addEventListener('change', () => this.updateLiveSplitPreview())
      })
    }
    // END: BillsDrawerController.initOwnerChecklist

    // START: BillsDrawerController.getOwnerStatsFromHabwa - Dynamically tallies revenue and unit count per owner from Habwa records
    getOwnerStatsFromHabwa() {
      const owners = Array.isArray(this.ownersList) ? this.ownersList : []
      const ownerStats = {}

      owners.forEach((u, idx) => {
        const roleId = (idx + 1).toString()
        const fullName = `${u.full_name}${u.units ? ` (${u.units})` : ''}`
        ownerStats[roleId] = {
          role: roleId,
          id: u.id,
          name: u.full_name,
          fullName: fullName,
          totalIncome: 0,
          units: 1
        }
      })

      const masterHabwa = (this.parent.tableManager && this.parent.tableManager.masterHabwaRecords)
        ? this.parent.tableManager.masterHabwaRecords
        : []

      if (masterHabwa && masterHabwa.length > 0) {
        masterHabwa.forEach((rec) => {
          const rawOwner = rec.owner || ''
          const amt = typeof rec.amount === 'number' ? rec.amount : (parseFloat(rec.amount) || 0)

          owners.forEach((u, idx) => {
            const roleId = (idx + 1).toString()
            if (rec.owner_id === u.id || rawOwner.toLowerCase().includes(u.full_name.toLowerCase())) {
              ownerStats[roleId].totalIncome += amt
            }
          })
        })
      }

      return ownerStats
    }
    // END: BillsDrawerController.getOwnerStatsFromHabwa
    // END: BillsDrawerController.getOwnerStatsFromHabwa

    // START: BillsDrawerController.calculateSplit - Implements dynamic Option C splitting based on actual Habwa income
    calculateSplit(amount, category, checkedRoles) {
      const ownerStats = this.getOwnerStatsFromHabwa()

      const catUpper = (category || '').toUpperCase()
      const isElectricity = catUpper.includes('ELECTRICITY') || catUpper.includes('VECO') || catUpper.includes('POWER')

      if (checkedRoles.length === 0) {
        return {
          isElectricity,
          detailedBreakdown: [],
          shares: 'None',
          ruleText: 'No owners selected'
        }
      }

      if (isElectricity) {
        // Automatic electricity split: Proportional to monthly Habwa income
        const totalIncomePool = checkedRoles.reduce((sum, r) => sum + (ownerStats[r]?.totalIncome || 0), 0)

        const detailedBreakdown = checkedRoles.map((r) => {
          const owner = ownerStats[r] || { name: `Owner ${r}`, totalIncome: 0, units: 1 }
          const income = owner.totalIncome
          const sharePercent = totalIncomePool > 0 ? (income / totalIncomePool) : (1 / checkedRoles.length)
          const shareAmt = amount * sharePercent
          const percentFormatted = (sharePercent * 100).toFixed(1)

          return {
            role: r,
            name: owner.name,
            income: income,
            units: owner.units || 1,
            shareAmount: shareAmt,
            method: `Income-weighted (${percentFormatted}% of ₱${totalIncomePool.toLocaleString('en-PH', { maximumFractionDigits: 0 })} Habwa)`
          }
        })

        const shares = detailedBreakdown
          .map((d) => `${d.role} = -₱${(Math.round(d.shareAmount * 100) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
          .join(' | ')

        return {
          isElectricity: true,
          detailedBreakdown,
          shares,
          ruleText: `Auto-Split by Habwa Income (₱${(Math.round(totalIncomePool * 100) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
        }
      }

      // Shared costs (Internet, Maintenance, Water, Switch): split equally among active owners
      const count = checkedRoles.length
      const perShare = count > 0 ? (amount / count) : 0
      const detailedBreakdown = checkedRoles.map((r) => {
        const owner = ownerStats[r] || { name: `Owner ${r}`, totalIncome: 0, units: 1 }
        return {
          role: r,
          name: owner.name,
          income: owner.totalIncome,
          units: owner.units || 1,
          shareAmount: perShare,
          method: `Shared equally (1/${count})`
        }
      })
      const shares = detailedBreakdown
        .map((d) => `${d.role} = -₱${(Math.round(d.shareAmount * 100) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        .join(' | ')

      return {
        isElectricity: false,
        detailedBreakdown,
        shares,
        ruleText: `Shared equally among ${count} owners`
      }
    }
    // END: BillsDrawerController.calculateSplit

    // START: BillsDrawerController.updateLiveSplitPreview - Dynamically computes and displays owner shares
    updateLiveSplitPreview() {
      const amountInput = document.getElementById('bill-amount')
      const categoryInput = document.getElementById('bill-category')
      const previewCards = document.getElementById('preview-split-cards')
      const ruleLabel = document.getElementById('preview-calc-rule')

      if (!previewCards) return

      const rawAmount = (amountInput?.value || '0').replace(/,/g, '')
      const amount = parseFloat(rawAmount) || 0
      const category = categoryInput?.value || ''
      const checkedRoles = Array.from(document.querySelectorAll('input[name="owner-role"]:checked')).map((c) => c.value)

      const splitResult = this.calculateSplit(amount, category, checkedRoles)

      if (ruleLabel) {
        ruleLabel.textContent = splitResult.ruleText
      }

      const roleBadgeColors = {
        '1': 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300',
        '2': 'bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300',
        '3': 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300'
      }

      if (splitResult.detailedBreakdown.length === 0) {
        previewCards.innerHTML = `
          <div class="col-span-full text-center py-2 text-xs text-slate-400">
            Select at least 1 owner to view deduction allocation.
          </div>
        `
        return
      }

      previewCards.innerHTML = splitResult.detailedBreakdown
        .map((item) => {
          const color = roleBadgeColors[item.role] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          const formatted = (Math.round(item.shareAmount * 100) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          const formattedIncome = (Math.round((item.income || 0) * 100) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          return `
            <div class="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-2xs">
              <div class="flex items-center justify-between mb-1">
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${color}">
                  ${item.role}
                </span>
                <span class="text-[10px] text-slate-400 font-mono">₱${formattedIncome} rev</span>
              </div>
              <div class="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                ${item.name}
              </div>
              <div class="text-xs font-black font-money text-rose-600 dark:text-rose-400 mt-1">
                -₱${formatted}
              </div>
            </div>
          `
        })
        .join('')
    }
    // END: BillsDrawerController.updateLiveSplitPreview

    // START: BillsDrawerController.initAmountFormatter - Formats typed currency amounts
    initAmountFormatter() {
      const amountInput = document.getElementById('bill-amount')
      if (!amountInput) return

      amountInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^0-9.]/g, '')
        const parts = val.split('.')
        if (parts.length > 2) {
          val = parts[0] + '.' + parts.slice(1).join('')
        }
        if (parts[0]) {
          parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        }
        e.target.value = parts.join('.')
        this.updateLiveSplitPreview()
      })
    }
    // END: BillsDrawerController.initAmountFormatter

    // START: BillsDrawerController.openCreate - Resets and opens drawer for new bill
    openCreate() {
      this.editingId = null
      const form = document.getElementById('bills-form')
      if (form) form.reset()

      const titleEl = document.getElementById('drawer-title')
      if (titleEl) titleEl.textContent = 'Log New Bill Deduction'

      const defaultCat = this.categories[0] || 'PLDT FIBR INTERNET'
      const catHidden = document.getElementById('bill-category')
      const catBtn = document.getElementById('bill-cat-btn')
      if (catHidden) catHidden.value = defaultCat
      if (catBtn) catBtn.value = defaultCat

      // Default date to today
      const dateInput = document.getElementById('bill-date')
      if (dateInput) {
        dateInput.value = new Date().toISOString().slice(0, 10)
      }

      // Re-render dynamic owners checklist
      this.loadOwnersFromDb()

      // Check all owners by default
      document.querySelectorAll('input[name="owner-role"]').forEach((c) => (c.checked = true))

      this.updateLiveSplitPreview()
      this.show()
    }
    // END: BillsDrawerController.openCreate

    // START: BillsDrawerController.openEdit - Populates form with existing bill data
    openEdit(entry) {
      this.editingId = entry.id
      const titleEl = document.getElementById('drawer-title')
      if (titleEl) titleEl.textContent = `Edit Deduction (${entry.id})`

      const categoryInput = document.getElementById('bill-category')
      const catBtn = document.getElementById('bill-cat-btn')
      const descInput = document.getElementById('bill-desc')
      const amountInput = document.getElementById('bill-amount')
      const dateInput = document.getElementById('bill-date')
      const notesInput = document.getElementById('bill-notes')

      if (categoryInput) categoryInput.value = entry.category || ''
      if (catBtn) catBtn.value = entry.category || ''
      if (descInput) descInput.value = entry.desc || ''
      if (amountInput) {
        amountInput.value = entry.amount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      }
      if (dateInput) dateInput.value = entry.date || ''
      if (notesInput) notesInput.value = entry.notes || entry.desc || ''

      // Re-render owner checkboxes to ensure latest list
      this.renderOwnerCheckboxes()

      // Sync role checkboxes
      const roles = entry.roles || (entry.owner === 'ALL' ? ['1', '2', '3'] : entry.owner.split(',').map((s) => s.trim()))
      document.querySelectorAll('input[name="owner-role"]').forEach((c) => {
        c.checked = roles.includes(c.value)
      })

      this.updateLiveSplitPreview()
      this.show()
    }
    // END: BillsDrawerController.openEdit

    // START: BillsDrawerController.show - Slides bills drawer into view
    show() {
      const drawer = document.getElementById('drawer-bills')
      if (!drawer) return

      drawer.classList.remove('translate-x-full')
      drawer.classList.add('translate-x-0')

      // Lock outside body scroll
      this.parent.lockBodyScroll()

      let backdrop = document.getElementById('drawer-backdrop')
      if (!backdrop) {
        backdrop = document.createElement('div')
        backdrop.id = 'drawer-backdrop'
        backdrop.className = 'fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300'
        backdrop.addEventListener('click', () => {
          this.close()
          this.parent.viewDrawer.close()
        })
        document.body.appendChild(backdrop)
      }
    }
    // END: BillsDrawerController.show

    // START: BillsDrawerController.close - Hides bills drawer
    close() {
      const drawer = document.getElementById('drawer-bills')
      if (drawer) {
        drawer.classList.add('translate-x-full')
        drawer.classList.remove('translate-x-0')
      }
      document.getElementById('drawer-backdrop')?.remove()
      document.getElementById('bill-cat-menu')?.classList.add('hidden')

      // Unlock outside body scroll
      this.parent.unlockBodyScroll()
    }
    // END: BillsDrawerController.close

    // START: BillsDrawerController.saveEntry - Validates and saves deduction bill to Supabase
    async saveEntry() {
      const categoryInput = document.getElementById('bill-category')
      const descInput = document.getElementById('bill-desc')
      const amountInput = document.getElementById('bill-amount')
      const dateInput = document.getElementById('bill-date')
      const notesInput = document.getElementById('bill-notes')

      const category = categoryInput?.value.trim().toUpperCase() || 'GENERAL BILL'
      const desc = descInput?.value.trim() || 'Operational Deduction'
      const rawAmount = (amountInput?.value || '0').replace(/,/g, '')
      const amount = parseFloat(rawAmount) || 0
      const date = dateInput?.value || new Date().toISOString().slice(0, 10)
      const notes = notesInput?.value.trim() || ''

      const ownerStats = this.getOwnerStatsFromHabwa()
      const allRoles = Object.keys(ownerStats)

      // Collect selected role IDs and their Supabase user UUIDs
      const checkedBoxes = Array.from(document.querySelectorAll('input[name="owner-role"]:checked'))
      const checkedRoles = checkedBoxes.map((c) => c.value)
      const ownerIds = checkedBoxes.map((c) => c.getAttribute('data-owner-id')).filter(Boolean)

      // Execute Option C splitting
      const splitResult = this.calculateSplit(amount, category, checkedRoles)
      const detailedBreakdown = splitResult.detailedBreakdown

      // Embed owner_id into detailedBreakdown items
      const enrichedBreakdown = detailedBreakdown.map((item) => {
        const matchingBox = checkedBoxes.find((b) => b.value === item.role)
        return {
          ...item,
          owner_id: matchingBox ? matchingBox.getAttribute('data-owner-id') : null
        }
      })

      const tm = this.parent.tableManager
      if (this.editingId) {
        const item = tm?.records?.find((r) => r.id === this.editingId)
        const targetDbId = item?.dbId || this.editingId

        await billsApi.update(targetDbId, {
          category,
          description: desc,
          owner_ids: ownerIds,
          total_amount: amount,
          detailed_breakdown: enrichedBreakdown,
          bill_date: date,
          notes
        })
        this.parent.animations?.toast?.show('Bill deduction updated successfully!')
      } else {
        const nextNum = (tm?.records?.length || 0) + 1
        const refCode = `bil-${nextNum.toString().padStart(4, '0')}`

        await billsApi.create({
          ref_code: refCode,
          category,
          description: desc,
          owner_ids: ownerIds,
          total_amount: amount,
          detailed_breakdown: enrichedBreakdown,
          bill_date: date,
          notes,
          attendant: 'Admin Leo',
          status: 'Audited'
        })
        this.parent.animations?.toast?.show('Bill deduction logged to database!')
      }

      if (tm) {
        await tm.loadFromSupabase()
        tm.render()
      }

      this.close()
    }
    // END: BillsDrawerController.saveEntry
  }
  // END: BillsDrawerController - Subchild ready

  // ==========================================
  // SUBCHILD CLASS: RequestsDrawerController
  // ==========================================
  // START: RequestsDrawerController - Handles Creating & Editing Custom Owner Deduction Requests
  RequestsDrawerController = class {
    constructor(parent) {
      this.parent = parent
      this.editingId = null
      this.categories = []
      this.editingCategoryIndex = null
    }

    async init() {
      const form = document.getElementById('requests-form') || document.getElementById('request-form')
      const closeBtn = document.getElementById('close-drawer')
      const cancelBtn = document.getElementById('cancel-btn')
      const addEntryBtn = document.getElementById('add-btn')

      closeBtn?.addEventListener('click', () => this.close())
      cancelBtn?.addEventListener('click', () => this.close())
      addEntryBtn?.addEventListener('click', () => this.openCreate())
      form?.addEventListener('submit', (e) => this.saveEntry(e))

      // Auto-open drawer if requested via URL action e.g. ?action=add or #add
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('action') === 'add' || window.location.hash === '#add') {
        setTimeout(() => this.openCreate(), 250)
      }

      this.initDatepicker()
      this.initCategoryDropdown()
      this.initAmountFormatter()
      this.initOwnerDropdown()
      this.initSignaturePad()

      // Fetch dynamic categories from Supabase backend
      await this.loadCategoriesFromDb()

      // Realtime subscription for categories so newly added ones appear instantly across sessions
      requestsApi.subscribeToCategories(() => {
        this.loadCategoriesFromDb()
      })
    }

    initDatepicker() {
      const dateEl = document.getElementById('req-date')
      if (dateEl && window.Datepicker) {
        if (dateEl._datepicker) return

        if (typeof dateEl.datepicker === 'object' && dateEl.datepicker) {
          dateEl._datepicker = dateEl.datepicker
          this.bindDatepickerAutoFlip(dateEl, dateEl._datepicker)
          return
        }

        const pickerInstance = new window.Datepicker(dateEl, {
          autohide: true,
          format: 'yyyy-mm-dd',
          orientation: 'auto'
        })

        dateEl._datepicker = pickerInstance
        this.bindDatepickerAutoFlip(dateEl, pickerInstance)
      }
    }

    bindDatepickerAutoFlip(inputEl, pickerInstance) {
      if (!inputEl) return

      const adjustPosition = () => {
        const pickerEl = pickerInstance?.picker?.element || document.querySelector('.datepicker.dropdown.active')
        if (!pickerEl) return

        const rect = inputEl.getBoundingClientRect()
        const pickerRect = pickerEl.getBoundingClientRect()
        const calendarHeight = pickerRect.height || 310
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top

        if (spaceBelow < calendarHeight + 10 && spaceAbove > calendarHeight) {
          const topPosition = rect.top - calendarHeight + window.scrollY - 6
          pickerEl.style.top = `${Math.max(10, topPosition)}px`
          pickerEl.classList.remove('datepicker-orient-bottom')
          pickerEl.classList.add('datepicker-orient-top')
        } else {
          const topPosition = rect.bottom + window.scrollY + 6
          pickerEl.style.top = `${topPosition}px`
          pickerEl.classList.remove('datepicker-orient-top')
          pickerEl.classList.add('datepicker-orient-bottom')
        }
      }

      const throttledAdjust = () => requestAnimationFrame(adjustPosition)

      ['show', 'focus', 'click', 'changeMonth', 'changeYear', 'changeView'].forEach((evt) => {
        inputEl.addEventListener(evt, () => setTimeout(adjustPosition, 10))
      })

      const setupPickerObserver = () => {
        const pickerEl = pickerInstance?.picker?.element || document.querySelector('.datepicker.dropdown')
        if (pickerEl && !pickerEl._hasSizeObserver) {
          pickerEl._hasSizeObserver = true
          const observer = new ResizeObserver(() => throttledAdjust())
          observer.observe(pickerEl)
          pickerEl.addEventListener('click', () => setTimeout(adjustPosition, 15))
        }
      }

      inputEl.addEventListener('focus', () => setTimeout(setupPickerObserver, 50))
      inputEl.addEventListener('click', () => setTimeout(setupPickerObserver, 50))

      const dismissPicker = (e) => {
        const pickerEl = pickerInstance?.picker?.element || document.querySelector('.datepicker.dropdown.active')
        if (pickerEl && !pickerEl.contains(e.target) && e.target !== inputEl) {
          if (typeof pickerInstance.hide === 'function') {
            pickerInstance.hide()
          }
          pickerEl.classList.remove('active', 'block')
          pickerEl.classList.add('hidden')
          inputEl.blur()
        }
      }

      window.addEventListener('scroll', dismissPicker, { capture: true, passive: true })
      document.addEventListener('scroll', dismissPicker, { capture: true, passive: true })
      document.addEventListener('wheel', dismissPicker, { capture: true, passive: true })
      document.addEventListener('touchmove', dismissPicker, { capture: true, passive: true })

      const drawerReq = document.getElementById('drawer-request')
      if (drawerReq) {
        drawerReq.addEventListener('scroll', dismissPicker, { passive: true })
      }
    }

    initAmountFormatter() {
      const amtInput = document.getElementById('req-amount')
      if (!amtInput) return

      amtInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^0-9.]/g, '')
        const parts = val.split('.')
        if (parts.length > 2) {
          val = `${parts[0]}.${parts.slice(1).join('')}`
        }
        if (parts[0]) {
          parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        }
        e.target.value = parts.join('.')
        this.updateRemainingProfit()
      })
    }

    async loadOwnersFromDb() {
      try {
        const res = await usersApi.getOwners()
        if (res.success && Array.isArray(res.data)) {
          const poolPromises = res.data.map(async (u) => {
            const poolRes = await requestsApi.calculateOwnerPool(u.id)
            return {
              id: u.id,
              name: `${u.full_name}${u.units ? ` (${u.units})` : ''}`,
              short: u.full_name,
              profit: poolRes.netBalance || 0,
              avatar: u.avatar_url || ''
            }
          })
          this.ownersList = await Promise.all(poolPromises)
          this.renderOwnersList()
        }
      } catch {
        // Fallback gracefully
      }
    }

    // START: RequestsDrawerController.getOwnersWithProfits
    getOwnersWithProfits() {
      if (this.ownersList && Array.isArray(this.ownersList)) {
        return this.ownersList
      }
      return []
    }

    selectOwner(owner) {
      if (!owner) return
      const ownerInput = document.getElementById('req-owner-btn')
      const hiddenInput = document.getElementById('req-owner')
      const poolVal = document.getElementById('req-pool-val')

      if (ownerInput) {
        ownerInput.value = owner.name
        ownerInput.setAttribute('data-profit', owner.profit)
        ownerInput.setAttribute('data-avatar', owner.avatar || '')
        if (owner.id) {
          ownerInput.setAttribute('data-owner-id', owner.id)
        }
      }
      if (hiddenInput) {
        hiddenInput.value = owner.name
      }
      if (poolVal) {
        poolVal.textContent = `₱${Math.ceil(Number(owner.profit) || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
      }
      this.updateRemainingProfit()
      document.getElementById('req-owner-menu')?.classList.add('hidden')
    }

    updateRemainingProfit() {
      const ownerInput = document.getElementById('req-owner-btn')
      const amtInput = document.getElementById('req-amount')
      const remVal = document.getElementById('req-remaining-val')
      if (!remVal) return

      const profit = parseFloat(ownerInput?.getAttribute('data-profit')) || 0
      const enteredAmount = parseFloat(amtInput?.value?.replace(/,/g, '')) || 0
      const left = profit - enteredAmount
      const roundedLeft = Math.ceil(Math.abs(left))

      remVal.textContent = `${left < 0 ? '-₱' : '₱'}${roundedLeft.toLocaleString('en-PH', {
        maximumFractionDigits: 0
      })}`

      if (left < 0) {
        remVal.className = 'font-money font-bold text-rose-500'
      } else {
        remVal.className = 'font-money font-bold text-slate-900 dark:text-white'
      }
    }

    async resolveCurrentLoggedUser() {
      const sessionRole = storageManager.session.getRole()
      const sessionUid = storageManager.session.getUserId()
      const sessionName = storageManager.session.getUser()
      const isOwnerRole = (sessionRole !== null && sessionRole !== undefined && String(sessionRole) !== '0') ||
        window.location.pathname.includes('/users/')

      if (!isOwnerRole) return null

      // First check if current user is already in ownersList
      if (Array.isArray(this.ownersList) && this.ownersList.length > 0) {
        const found = this.ownersList.find(
          (o) => o.id === sessionUid ||
                 (sessionName && (o.name.includes(sessionName) || o.short.includes(sessionName)))
        )
        if (found) return found
      }

      // If not yet loaded or not found, fetch owner details and pool dynamically
      if (sessionUid) {
        try {
          const poolRes = await requestsApi.calculateOwnerPool(sessionUid)
          const sessionUnits = storageManager.session.get('units') || ''
          const ownerObj = {
            id: sessionUid,
            name: `${sessionName || 'Owner'}${sessionUnits ? ` (${sessionUnits})` : ''}`,
            short: sessionName || 'Owner',
            profit: poolRes.netBalance || 0,
            avatar: storageManager.session.get('avatar') || ''
          }
          return ownerObj
        } catch {
          // fallback
        }
      }
      return null
    }

    async initOwnerDropdown() {
      const ownerInput = document.getElementById('req-owner-btn')
      const ownerMenu = document.getElementById('req-owner-menu')
      if (!ownerInput || !ownerMenu) return

      const sessionRole = storageManager.session.getRole()
      const isOwnerRole = (sessionRole !== null && sessionRole !== undefined && String(sessionRole) !== '0') ||
        window.location.pathname.includes('/users/')

      if (isOwnerRole) {
        // Owner role (role_id 1+ or /users/ portal): disabled-state in default & auto-select logged user
        ownerInput.readOnly = true
        ownerInput.disabled = true
        ownerInput.classList.add('cursor-not-allowed', 'bg-slate-100', 'dark:bg-slate-800/60', 'text-slate-500', 'dark:text-slate-400', 'pointer-events-none')
        ownerMenu.classList.add('hidden')

        // Resolve logged-in owner and fetch live profit pool
        await this.loadOwnersFromDb()
        const loggedUser = await this.resolveCurrentLoggedUser()
        if (loggedUser) {
          this.selectOwner(loggedUser)
        }
        return
      }

      // Admin role (role_id === 0): Allow searching and selecting any owner
      this.renderOwnersList()

      ownerInput.addEventListener('focus', () => {
        ownerInput.select()
        this.renderOwnersList('')
        ownerMenu.classList.remove('hidden')
      })
      ownerInput.addEventListener('input', (e) => {
        this.renderOwnersList(e.target.value)
        ownerMenu.classList.remove('hidden')
      })
      document.addEventListener('click', (e) => {
        if (!ownerInput.contains(e.target) && !ownerMenu.contains(e.target)) {
          ownerMenu.classList.add('hidden')
        }
      })

      this.loadOwnersFromDb()
    }

    renderOwnersList(filter = '') {
      const ownerList = document.getElementById('req-owner-list')
      if (!ownerList) return

      const owners = this.getOwnersWithProfits()
      const filtered = owners.filter((o) => !filter || o.name.toLowerCase().includes(filter.toLowerCase()))

      if (filtered.length === 0) {
        ownerList.innerHTML = `
          <div class="p-3 text-center text-xs text-slate-400">
            ${owners.length === 0 ? 'No registered unit owners found in database.' : 'No matching unit owners found.'}
          </div>
        `
        return
      }

      const avatarColors = [
        'bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300',
        'bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-300',
        'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300',
        'bg-purple-100 text-purple-600 dark:bg-purple-900/60 dark:text-purple-300',
        'bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300'
      ]

      ownerList.innerHTML = filtered.map((o, idx) => {
        const initial = (o.short || o.name || 'U').charAt(0).toUpperCase()
        const colorClass = avatarColors[idx % avatarColors.length]
        const avatarHtml = o.avatar
          ? `<img class="w-7 h-7 rounded-full object-cover shrink-0" src="${o.avatar}" alt="${o.name}">`
          : `<div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${colorClass}">${initial}</div>`

        return `
          <li>
            <button type="button" data-select-owner="${o.name}" data-owner-id="${o.id}" data-profit="${o.profit}" data-avatar="${o.avatar}" class="w-full flex items-center justify-between p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-700 transition text-left cursor-pointer group">
              <div class="flex items-center space-x-2.5">
                ${avatarHtml}
                <div>
                  <div class="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">${o.name}</div>
                  <div class="text-[10px] text-slate-400">Profit Pool: <span class="font-money font-semibold text-emerald-600 dark:text-emerald-400">₱${Math.ceil(Number(o.profit) || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}</span></div>
                </div>
              </div>
              <svg class="w-4 h-4 text-slate-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </li>
        `
      }).join('')

      ownerList.querySelectorAll('[data-select-owner]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const name = btn.getAttribute('data-select-owner')
          const id = btn.getAttribute('data-owner-id')
          const profit = parseFloat(btn.getAttribute('data-profit')) || 0
          const avatar = btn.getAttribute('data-avatar')
          this.selectOwner({ id, name, profit, avatar })
        })
      })
    }

    initCategoryDropdown() {
      const catInput = document.getElementById('req-cat-btn')
      const addCatBtn = document.getElementById('req-cat-add-btn') || document.getElementById('add-req-cat-btn')
      
      const sessionRole = storageManager.session.getRole()
      const isOwnerRole = (sessionRole !== null && sessionRole !== undefined && String(sessionRole) !== '0') ||
        window.location.pathname.includes('/users/')

      if (isOwnerRole && addCatBtn) {
        addCatBtn.disabled = true
        addCatBtn.setAttribute('title', 'Only administrators can create custom categories')
        addCatBtn.classList.add('cursor-not-allowed', 'opacity-40', 'pointer-events-none', 'no-underline')
        addCatBtn.classList.remove('hover:underline', 'cursor-pointer')
      }

      this.renderCategoryList()

      catInput?.addEventListener('focus', () => {
        catInput.select()
        this.renderCategoryList('')
      })

      catInput?.addEventListener('click', () => {
        catInput.select()
        this.renderCategoryList('')
        document.getElementById('req-cat-menu')?.classList.remove('hidden')
      })

      catInput?.addEventListener('input', (e) => {
        const val = e.target.value
        const hiddenInput = document.getElementById('req-category')
        if (hiddenInput) hiddenInput.value = val
        this.renderCategoryList(val)
        document.getElementById('req-cat-menu')?.classList.remove('hidden')
      })

      addCatBtn?.addEventListener('click', () => {
        if (isOwnerRole) return
        const currentVal = catInput?.value?.trim() || `Category #${this.categories.length + 1}`
        this.addNewCategory(currentVal)
      })

      document.addEventListener('click', (e) => {
        const menu = document.getElementById('req-cat-menu')
        if (catInput && menu && !catInput.contains(e.target) && !menu.contains(e.target)) {
          menu.classList.add('hidden')
          this.editingCategoryIndex = null
        }
      })
    }

    renderCategoryList(filter = '') {
      const listEl = document.getElementById('req-cat-list')
      if (!listEl) return

      const sessionRole = storageManager.session.getRole()
      const isOwnerRole = (sessionRole !== null && sessionRole !== undefined && String(sessionRole) !== '0') ||
        window.location.pathname.includes('/users/')

      const filtered = this.categories.filter((c) =>
        !filter || c.toLowerCase().includes(filter.toLowerCase())
      )

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <li class="px-3 py-2 text-xs text-slate-400 text-center">
            No categories match "${filter}". Click below to add.
          </li>
        `
        return
      }

      listEl.innerHTML = filtered
        .map((cat) => {
          const actualIdx = this.categories.indexOf(cat)
          if (this.editingCategoryIndex === actualIdx) {
            return `
              <li class="p-1">
                <div class="flex items-center space-x-1">
                  <input id="edit-req-cat-field" type="text" value="${cat}" class="w-full px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 border border-blue-500 rounded-lg text-slate-900 dark:text-white font-medium focus:outline-none">
                  <button id="save-req-cat-${actualIdx}" type="button" data-save-req-cat="${actualIdx}" class="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  </button>
                  <button id="cancel-req-cat-${actualIdx}" type="button" data-cancel-req-cat="${actualIdx}" class="p-1 text-slate-400 hover:bg-slate-200 rounded cursor-pointer">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </li>
            `
          }

          return `
            <li class="group flex items-center justify-between px-3 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-700/80 transition cursor-pointer" data-cat-item="${cat}">
              <div class="flex items-center space-x-2 flex-1 min-w-0" data-select-req-cat="${cat}">
                <div class="w-5 h-5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-[10px] shrink-0 uppercase">
                  ${cat.slice(0, 1)}
                </div>
                <span class="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">${cat}</span>
              </div>
              ${isOwnerRole ? '' : `
              <button id="edit-req-cat-${actualIdx}" type="button" data-edit-req-cat="${actualIdx}" title="Edit category" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-600/60 rounded transition cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              `}
            </li>
          `
        })
        .join('')

      listEl.querySelectorAll('[data-select-req-cat]').forEach((el) => {
        el.addEventListener('click', () => {
          const val = el.getAttribute('data-select-req-cat')
          this.selectCategory(val)
        })
      })

      listEl.querySelectorAll('[data-edit-req-cat]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          this.editingCategoryIndex = parseInt(btn.getAttribute('data-edit-req-cat'), 10)
          this.renderCategoryList(filter)
        })
      })

      listEl.querySelectorAll('[data-save-req-cat]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation()
          const idx = parseInt(btn.getAttribute('data-save-req-cat'), 10)
          const input = document.getElementById('edit-req-cat-field')
          const val = input ? input.value.trim() : ''
          const oldName = this.categories[idx]
          if (val && oldName && val !== oldName) {
            this.categories[idx] = val
            this.editingCategoryIndex = null
            this.renderCategoryList('')
            try {
              await requestsApi.updateCategory(oldName, val)
              this.parent.animations?.toast?.show(`Category updated to "${val}"`)
            } catch {}
          } else {
            this.editingCategoryIndex = null
            this.renderCategoryList('')
          }
        })
      })

      listEl.querySelectorAll('[data-cancel-req-cat]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          this.editingCategoryIndex = null
          this.renderCategoryList(filter)
        })
      })
    }

    async loadCategoriesFromDb() {
      try {
        const res = await requestsApi.getCategories()
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          this.categories = res.data.map((c) => c.name)
        } else if (this.categories.length === 0) {
          this.categories = [
            'Hatag ni Mama',
            'Food Panda / Delivery',
            'Emergency Cash Advance',
            'Hardware Maintenance / Chute Spare',
            'Medicine / Pharmacy',
            'Personal Withdrawal',
            'Grab / Transportation',
            'Store Supplies / Restock'
          ]
        }
        this.renderCategoryList('')
      } catch {
        if (this.categories.length === 0) {
          this.categories = [
            'Hatag ni Mama',
            'Food Panda / Delivery',
            'Emergency Cash Advance',
            'Hardware Maintenance / Chute Spare',
            'Medicine / Pharmacy',
            'Personal Withdrawal',
            'Grab / Transportation',
            'Store Supplies / Restock'
          ]
        }
        this.renderCategoryList('')
      }
    }

    selectCategory(cat) {
      const catInput = document.getElementById('req-cat-btn')
      const hiddenInput = document.getElementById('req-category')
      if (catInput) catInput.value = cat
      if (hiddenInput) hiddenInput.value = cat
      document.getElementById('req-cat-menu')?.classList.add('hidden')
      this.editingCategoryIndex = null
    }

    async addNewCategory(name) {
      if (!name) return
      const trimmed = name.trim()
      if (!trimmed) return

      if (!this.categories.includes(trimmed)) {
        this.categories.push(trimmed)
      }
      this.selectCategory(trimmed)
      this.renderCategoryList('')

      // Push to Supabase backend database
      try {
        const adminId = storageManager.session.getUserId()
        await requestsApi.addCategory(trimmed, adminId)
      } catch {}

      // 1. Temporarily slide close the drawer
      this.close()

      // 2. Show indicator toast on top for around 3 seconds
      const toastManager = this.parent.animations?.toast
      if (toastManager) {
        toastManager.show(`Category "${trimmed}" saved to database!`, 3000, () => {
          // 3. Go back and reopen the drawer
          this.show()

          // 4. Reveal the category dropdown menu
          const menu = document.getElementById('req-cat-menu')
          if (menu) menu.classList.remove('hidden')

          // 5. Auto scroll down to newly created item and highlight it temporarily
          setTimeout(() => {
            const listEl = document.getElementById('req-cat-list')
            if (!listEl) return
            const target = listEl.querySelector(`[data-cat-item="${trimmed}"]`) || listEl.lastElementChild
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              target.classList.add('bg-blue-100', 'dark:bg-blue-950', 'ring-2', 'ring-blue-500', 'transition-all', 'duration-300')
              setTimeout(() => {
                target.classList.remove('bg-blue-100', 'dark:bg-blue-950', 'ring-2', 'ring-blue-500')
              }, 2000)
            }
          }, 150)
        })
      }
    }

    initSignaturePad() {
      const canvas = document.getElementById('sig-pad')
      const clearBtn = document.getElementById('clear-sig')
      const sigInput = document.getElementById('req-signature')
      const sigStatus = document.getElementById('sig-status')
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      let isDrawing = false

      const resize = () => {
        const rect = canvas.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          canvas.width = rect.width * 2
          canvas.height = rect.height * 2
          ctx.scale(2, 2)
          ctx.lineWidth = 2.5
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
        }
      }
      this.resizeSignaturePad = resize
      resize()

      const getPos = (e) => {
        const rect = canvas.getBoundingClientRect()
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        }
      }

      const updateStrokeColor = () => {
        const isDark = document.documentElement.classList.contains('dark')
        ctx.strokeStyle = isDark ? '#f1f5f9' : '#0f172a'
      }

      const start = (e) => {
        isDrawing = true
        updateStrokeColor()
        const pos = getPos(e)
        ctx.beginPath()
        ctx.moveTo(pos.x, pos.y)
        if (canvas.setPointerCapture) {
          try { canvas.setPointerCapture(e.pointerId) } catch {}
        }
      }

      const draw = (e) => {
        if (!isDrawing) return
        const pos = getPos(e)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
      }

      const end = (e) => {
        if (!isDrawing) return
        isDrawing = false
        if (canvas.releasePointerCapture && e.pointerId) {
          try { canvas.releasePointerCapture(e.pointerId) } catch {}
        }
        const dataUrl = canvas.toDataURL('image/png')
        if (sigInput) sigInput.value = dataUrl
        if (sigStatus) {
          sigStatus.textContent = 'Signed ✓'
          sigStatus.className = 'text-[10px] text-emerald-500 font-mono font-bold'
        }
        this.updateSignatureValidation(true)
      }

      canvas.addEventListener('pointerdown', start)
      canvas.addEventListener('pointermove', draw)
      canvas.addEventListener('pointerup', end)
      canvas.addEventListener('pointercancel', end)

      clearBtn?.addEventListener('click', () => {
        this.clearSignature()
      })
    }

    updateSignatureValidation(hasSig) {
      const saveBtn = document.getElementById('save-btn')
      const sigStatus = document.getElementById('sig-status')
      if (saveBtn) {
        saveBtn.disabled = !hasSig
        if (hasSig) {
          saveBtn.classList.remove('opacity-50', 'cursor-not-allowed')
          saveBtn.classList.add('cursor-pointer')
        } else {
          saveBtn.classList.add('opacity-50', 'cursor-not-allowed')
          saveBtn.classList.remove('cursor-pointer')
        }
      }
      if (!hasSig && sigStatus) {
        sigStatus.textContent = 'Required'
        sigStatus.className = 'text-[10px] text-rose-500 font-mono font-bold'
      }
    }

    clearSignature() {
      const canvas = document.getElementById('sig-pad')
      const sigInput = document.getElementById('req-signature')
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.restore()
      }
      if (sigInput) sigInput.value = ''
      this.updateSignatureValidation(false)
    }

    loadSignature(dataUrl) {
      const canvas = document.getElementById('sig-pad')
      const sigInput = document.getElementById('req-signature')
      const sigStatus = document.getElementById('sig-status')
      if (sigInput) sigInput.value = dataUrl || ''
      if (!canvas || !dataUrl || !dataUrl.startsWith('data:image')) {
        this.clearSignature()
        return
      }
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.onload = () => {
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width / 2, canvas.height / 2)
        ctx.restore()
        if (sigStatus) {
          sigStatus.textContent = 'Signed ✓'
          sigStatus.className = 'text-[10px] text-emerald-500 font-mono font-bold'
        }
        this.updateSignatureValidation(true)
      }
      img.src = dataUrl
    }

    async openCreate() {
      this.editingId = null
      const title = document.getElementById('drawer-title')
      const form = document.getElementById('requests-form') || document.getElementById('request-form')
      const amtInput = document.getElementById('req-amount')
      const dateInput = document.getElementById('req-date')
      const statusSelect = document.getElementById('req-status')

      if (title) title.textContent = 'Log Custom Owner Request'
      if (form) form.reset()

      await this.loadOwnersFromDb()

      const sessionRole = storageManager.session.getRole()
      const isOwnerRole = (sessionRole !== null && sessionRole !== undefined && String(sessionRole) !== '0') ||
        window.location.pathname.includes('/users/')

      if (isOwnerRole) {
        const loggedUser = await this.resolveCurrentLoggedUser()
        if (loggedUser) {
          this.selectOwner(loggedUser)
        }
      } else {
        const owners = this.getOwnersWithProfits()
        const defaultOwner = owners.length > 0 ? owners[0] : null
        if (defaultOwner) {
          this.selectOwner(defaultOwner)
        } else {
          const ownerInput = document.getElementById('req-owner-btn')
          const hiddenInput = document.getElementById('req-owner')
          const poolVal = document.getElementById('req-pool-val')
          if (ownerInput) ownerInput.value = ''
          if (hiddenInput) hiddenInput.value = ''
          if (poolVal) poolVal.textContent = '₱0'
        }
      }
      this.clearSignature()

      if (amtInput) amtInput.value = ''
      this.selectCategory('Food Panda / Delivery')

      if (dateInput) {
        dateInput.value = new Date().toISOString().slice(0, 10)
      }
      if (statusSelect) {
        statusSelect.value = 'Pending'
      }

      this.updateRemainingProfit()
      this.show()
    }

    openEdit(entry) {
      this.editingId = entry.id
      const title = document.getElementById('drawer-title')
      const amtInput = document.getElementById('req-amount')
      const dateInput = document.getElementById('req-date')
      const noteInput = document.getElementById('req-note') || document.getElementById('req-notes')
      const statusSelect = document.getElementById('req-status')

      if (title) title.textContent = `Edit Request #${entry.id}`

      const owners = this.getOwnersWithProfits()
      const currentOwner = owners.find((o) => o.name === entry.owner || o.short === entry.ownerShort || o.id === entry.owner_id) || {
        id: entry.owner_id,
        name: entry.owner,
        short: entry.ownerShort || entry.owner,
        profit: entry.profitLeft || 0,
        avatar: entry.avatar || ''
      }
      this.selectOwner(currentOwner)

      if (amtInput) amtInput.value = (parseFloat(entry.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
      if (dateInput) dateInput.value = entry.date
      if (noteInput) noteInput.value = entry.note || ''
      if (statusSelect) statusSelect.value = entry.status || 'Pending'

      if (entry.signature) {
        this.loadSignature(entry.signature)
      } else {
        this.clearSignature()
      }

      this.selectCategory(entry.category)
      this.updateRemainingProfit()
      this.show()
    }

    show() {
      const drawer = document.getElementById('drawer-request')
      if (!drawer) return

      // On mobile: slides up from bottom (removes translate-y-full)
      // On desktop (sm+): slides from right (removes sm:translate-x-full)
      drawer.classList.remove('translate-y-full', 'sm:translate-x-full', 'translate-x-full')
      drawer.classList.add('translate-y-0', 'sm:translate-x-0')
      this.parent.lockBodyScroll()

      // Ensure signature canvas coordinates are perfectly synchronized once drawer is displayed
      setTimeout(() => {
        if (typeof this.resizeSignaturePad === 'function') {
          this.resizeSignaturePad()
        }
      }, 150)

      let backdrop = document.getElementById('drawer-backdrop')
      if (!backdrop) {
        backdrop = document.createElement('div')
        backdrop.id = 'drawer-backdrop'
        backdrop.className = 'fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300'
        backdrop.addEventListener('click', () => this.close())
        document.body.appendChild(backdrop)
      }
    }

    close() {
      const drawer = document.getElementById('drawer-request')
      if (drawer) {
        drawer.classList.add('translate-y-full', 'sm:translate-x-full')
        drawer.classList.remove('translate-y-0', 'sm:translate-x-0')
      }
      document.getElementById('drawer-backdrop')?.remove()
      this.parent.unlockBodyScroll()
    }

    async saveEntry(e) {
      e.preventDefault()

      const ownerInput = document.getElementById('req-owner-btn')
      const catInput = document.getElementById('req-category')
      const amtInput = document.getElementById('req-amount')
      const dateInput = document.getElementById('req-date')
      const notesInput = document.getElementById('req-note') || document.getElementById('req-notes')
      const statusSelect = document.getElementById('req-status')
      const sigInput = document.getElementById('req-signature')

      const ownerName = ownerInput?.value || 'Unassigned Owner'
      const category = catInput?.value || 'Food Panda / Delivery'
      const rawAmount = (amtInput?.value || '').replace(/,/g, '')
      const amount = parseFloat(rawAmount) || 0
      const date = dateInput?.value || new Date().toISOString().slice(0, 10)
      const note = notesInput?.value.trim() || ''
      const status = statusSelect?.value || 'Pending'
      const signature = sigInput?.value || ''

      // Digital E-Signature is strictly required
      if (!signature) {
        this.updateSignatureValidation(false)
        const sigPad = document.getElementById('sig-pad')
        sigPad?.parentElement?.classList.add('ring-2', 'ring-rose-500')
        setTimeout(() => sigPad?.parentElement?.classList.remove('ring-2', 'ring-rose-500'), 1500)
        return
      }

      // Match selected owner to their Supabase user ID
      let ownerId = ownerInput?.getAttribute('data-owner-id') || null
      let profitVal = parseFloat(ownerInput?.getAttribute('data-profit')) || 0

      if (!ownerId && Array.isArray(this.ownersList) && this.ownersList.length > 0) {
        const found = this.ownersList.find(
          (o) =>
            o.name === ownerName ||
            o.short === ownerName ||
            ownerName.toLowerCase().includes(o.short?.toLowerCase())
        )
        if (found) {
          ownerId = found.id
          profitVal = found.profit
        }
      }

      // If still not matched, check session storage directly
      if (!ownerId) {
        ownerId = storageManager.session.getUserId()
      }

      if (!ownerId) {
        this.parent.animations?.toast?.show('Error: Please select a valid unit owner from the list')
        return
      }

      const tm = this.parent.tableManager
      if (this.editingId) {
        const item = tm?.records?.find((r) => r.id === this.editingId)
        const targetDbId = item?.dbId || this.editingId

        const updateRes = await requestsApi.update(targetDbId, {
          category,
          amount,
          status,
          request_date: date,
          note,
          signature_url: signature,
          ...(ownerId ? { owner_id: ownerId } : {})
        })

        if (!updateRes.success) {
          this.parent.animations?.toast?.show(`Update failed: ${updateRes.error || 'Server error'}`)
          return
        }

        this.parent.animations?.toast?.show('Request updated successfully!')
      } else {
        // Dynamic count: if only 1 data in DB, next is 1. If 2, next is 2. If 0, next is 0 (or 1st entry).
        const existingCount = tm?.records?.length || 0
        const seqNumber = existingCount + 1
        const refCode = `REQ-${(10000 + seqNumber).toString()}`

        const createRes = await requestsApi.create({
          ref_code: refCode,
          owner_id: ownerId,
          category,
          amount,
          status,
          request_date: date,
          note,
          signature_url: signature,
          pool_value: profitVal,
          policy_label: 'Standard Owner Allowance',
          policy_check: 'Within limit'
        })

        if (!createRes.success) {
          this.parent.animations?.toast?.show(`Failed to log request: ${createRes.error || 'Database error'}`)
          return
        }

        this.parent.animations?.toast?.show('Request logged to database!')

        // Proactively notify Admin in realtime via notifications table
        try {
          const allUsers = await usersApi.getAll()
          const admin = allUsers.data?.find((u) => u.role_id === 0)
          if (admin) {
            await notificationsApi.create({
              user_id: admin.id,
              type: 'request',
              title: `New Request: ${category}`,
              message: `${ownerName} submitted a deduction request for ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`,
              ref_id: createRes.data?.id,
              ref_table: 'requests'
            })
          }
        } catch {
          // Notification push non-blocking
        }
      }

      if (tm) {
        await tm.loadFromSupabase()
        tm.render()
      }

      this.close()
    }
  }
  // END: RequestsDrawerController - Subchild ready

  // ==========================================
  // SUBCHILD CLASS: HabwaViewDrawerController
  // ==========================================
  // START: HabwaViewDrawerController - Coordinates the read-only preview drawer for habwa logs, bills, and requests
  HabwaViewDrawerController = class {
    constructor(parent) {
      this.parent = parent
      this.currentEntry = null
    }

    // START: HabwaViewDrawerController.init - Binds close and action buttons
    init() {
      const closeBtn = document.getElementById('close-view')
      closeBtn?.addEventListener('click', () => this.close())

      // Navigation buttons for requests / records
      const prevBtn = document.getElementById('view-prev-btn')
      const nextBtn = document.getElementById('view-next-btn')
      prevBtn?.addEventListener('click', () => this.navigateEntry(-1))
      nextBtn?.addEventListener('click', () => this.navigateEntry(1))

      // Direct Action buttons inside Request view drawer (Approve & Decline Switch)
      const approveBtn = document.getElementById('view-approve-btn')
      const rejectBtn = document.getElementById('view-reject-btn')

      approveBtn?.addEventListener('click', () => {
        if (!this.currentEntry || this.currentEntry.status === 'Approved') return
        this.parent.tableManager?.updateRequestStatus?.(this.currentEntry.id, 'Approved')
        this.currentEntry.status = 'Approved'
        this.openView(this.currentEntry)
      })

      rejectBtn?.addEventListener('click', () => {
        if (!this.currentEntry || this.currentEntry.status === 'Declined') return
        this.parent.tableManager?.updateRequestStatus?.(this.currentEntry.id, 'Declined')
        this.currentEntry.status = 'Declined'
        this.openView(this.currentEntry)
      })
    }
    // END: HabwaViewDrawerController.init

    navigateEntry(direction) {
      if (!this.currentEntry || !this.parent.tableManager) return
      const list = this.parent.tableManager.data || this.parent.tableManager.records || []
      const currentIndex = list.findIndex((item) => item.id === this.currentEntry.id)
      if (currentIndex === -1) return

      const nextIndex = currentIndex + direction
      if (nextIndex >= 0 && nextIndex < list.length) {
        this.openView(list[nextIndex])
      }
    }

    // START: HabwaViewDrawerController.openView - Populates and slides in the view drawer
    openView(entry) {
      this.currentEntry = entry

      // If in requests mode, render dedicated request preview matching reference design
      if (this.parent.mode === 'requests') {
        this.renderRequestView(entry)
        this.show()
        return
      }

      const titleEl = document.getElementById('view-title')
      const metaEl = document.getElementById('view-meta')
      const descEl = document.getElementById('view-desc')
      const idEl = document.getElementById('view-id')
      const ownerEl = document.getElementById('view-owner')
      const amtEl = document.getElementById('view-amount')
      const dateEl = document.getElementById('view-date')
      const attendantEl = document.getElementById('view-attendant')
      const notesEl = document.getElementById('view-notes')
      const catEl = document.getElementById('view-category')

      // Short summary / title in the header (no ID prefix for bills)
      if (titleEl) {
        if (this.parent.mode === 'bills') {
          titleEl.textContent = entry.category || entry.desc
        } else {
          titleEl.textContent = `#${entry.id} - ${entry.desc}`
        }
      }
      if (catEl) {
        catEl.textContent = entry.category || 'General Bill'
      }
      if (descEl) {
        descEl.textContent = entry.desc
      }
      if (idEl) {
        idEl.textContent = entry.id
      }
      if (ownerEl) {
        ownerEl.textContent = entry.owner
      }
      if (amtEl) {
        const numAmount = parseFloat(entry.amount) || 0
        const formattedAmount = (Math.round(numAmount * 100) / 100).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
        if (this.parent.mode === 'bills') {
          amtEl.textContent = `-₱${formattedAmount}`
          amtEl.className = 'font-money font-black text-lg text-rose-600 dark:text-rose-400'
        } else {
          amtEl.textContent = `₱${formattedAmount}`
          amtEl.className = 'font-money font-black text-lg text-emerald-600 dark:text-emerald-400'
        }
      }

      // Format date to e.g. "October 10, 2026" and 12-hour GMT+8 time in parentheses below
      const dateTextEl = document.getElementById('view-date-text')
      const timeTextEl = document.getElementById('view-time-text')

      let formattedDate = entry.date
      let formattedTime = '12:00:00 PM GMT+08'

      if (entry.date) {
        try {
          const [year, month, day] = entry.date.split('-').map(Number)
          if (year && month && day) {
            const d = new Date(year, month - 1, day)
            formattedDate = d.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })
          }
        } catch {
          formattedDate = entry.date
        }
      }

      if (entry.timestamp) {
        const match = entry.timestamp.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
        if (match) {
          let hours = parseInt(match[1], 10)
          const minutes = match[2]
          const seconds = match[3] || '00'
          const ampm = hours >= 12 ? 'PM' : 'AM'
          hours = hours % 12
          hours = hours ? hours : 12
          const strHours = hours.toString().padStart(2, '0')
          formattedTime = `${strHours}:${minutes}:${seconds} ${ampm} GMT+08`
        }
      }

      if (dateTextEl && timeTextEl) {
        dateTextEl.textContent = formattedDate
        timeTextEl.textContent = `(${formattedTime})`
      } else if (dateEl) {
        dateEl.innerHTML = `<span class="font-semibold text-slate-900 dark:text-white">${formattedDate}</span><span class="text-xs text-slate-400 font-mono mt-0.5 block">(${formattedTime})</span>`
      }

      const getAdminName = () => {
        if (this.adminFullName) return this.adminFullName
        const cached = sessionStorage.getItem('jn_admin_fullname')
        if (cached) {
          this.adminFullName = cached
          return cached
        }
        usersApi.getAll().then((res) => {
          if (res.success && Array.isArray(res.data)) {
            const admin = res.data.find((u) => u.role_id === 0)
            if (admin?.full_name) {
              this.adminFullName = admin.full_name
              sessionStorage.setItem('jn_admin_fullname', admin.full_name)
              if (attendantEl) attendantEl.textContent = admin.full_name
              if (metaEl) metaEl.textContent = `${entry.date} • Logged by ${admin.full_name}`
            }
          }
        }).catch(() => {})
        return 'Admin Jorgie'
      }

      const activeAdminName = getAdminName()

      if (metaEl) {
        metaEl.textContent = `${entry.date} • Logged by ${activeAdminName}`
      }

      if (attendantEl) {
        attendantEl.textContent = activeAdminName
      }

      // Populate breakdown in Viewer Drawer with Owner Full Names and Deducted amounts
      if (notesEl) {
        if (this.parent.mode === 'bills' && entry.detailedBreakdown && Array.isArray(entry.detailedBreakdown) && entry.detailedBreakdown.length > 0) {
          const roleTheme = {
            '1': {
              badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
              border: 'border-l-amber-500'
            },
            '2': {
              badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
              border: 'border-l-sky-500'
            },
            '3': {
              badge: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
              border: 'border-l-indigo-500'
            }
          }

          notesEl.innerHTML = `
            <div class="space-y-2.5">
              ${entry.detailedBreakdown
              .map((b) => {
                const theme = roleTheme[b.role] || {
                  badge: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300',
                  border: 'border-l-slate-400'
                }
                const formattedDeduction = (Math.round((parseFloat(b.shareAmount) || 0) * 100) / 100).toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })
                return `
                    <div class="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 border-l-4 ${theme.border} shadow-2xs">
                      <div class="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <div class="flex items-center space-x-2">
                          <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${theme.badge}">
                            Role ${b.role}
                          </span>
                          <span class="font-bold text-xs sm:text-sm text-slate-900 dark:text-white text-wrap break-words">
                            ${b.name}
                          </span>
                        </div>
                        <span class="text-xs sm:text-sm font-black font-money text-rose-600 dark:text-rose-400 shrink-0">
                          -₱${formattedDeduction}
                        </span>
                      </div>
                      <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-sans pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span class="truncate">${b.method || 'Standard share'}</span>
                        <span class="font-mono text-[10px] text-slate-400">${b.units || 1} unit${(b.units || 1) > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  `
              })
              .join('')}
            </div>
          `
        } else {
          notesEl.textContent = entry.shares || entry.coins || 'No notes logged'
        }
      }

      this.show()
    }
    // END: HabwaViewDrawerController.openView

    // START: HabwaViewDrawerController.renderRequestView - Reference Image Layout for Requests
    renderRequestView(entry) {
      const avatarEl = document.getElementById('view-req-avatar')
      const nameEl = document.getElementById('view-req-name')
      const idEl = document.getElementById('view-req-id')
      const statusBadgeEl = document.getElementById('view-req-status-badge')
      const statusTextEl = document.getElementById('view-req-status-text')
      const statusDotEl = document.getElementById('view-req-status-dot')

      const catEl = document.getElementById('view-req-category')
      const amtEl = document.getElementById('view-req-amount')
      const dateEl = document.getElementById('view-req-date')
      const submittedEl = document.getElementById('view-req-submitted')
      const sourceEl = document.getElementById('view-req-source')

      const noteEl = document.getElementById('view-req-note')
      const noteTitleEl = document.getElementById('view-req-note-title')
      const receiptCardEl = document.getElementById('view-req-receipt')
      const policyStatusEl = document.getElementById('view-req-policy-status')
      const signatureEl = document.getElementById('view-req-signature')

      // Populate Owner Avatar & Header Info
      if (avatarEl) {
        avatarEl.src = entry.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
        avatarEl.alt = entry.owner || 'Owner'
      }
      if (nameEl) nameEl.textContent = entry.owner || 'Unit Owner'
      if (idEl) idEl.textContent = entry.reqId || `REQ-00${entry.id}`

      // Status indicator matching user's image (Orange/Amber Pending, Green Approved, Rose Declined)
      const status = entry.status || 'Pending'
      if (statusTextEl) statusTextEl.textContent = status

      if (statusDotEl && statusBadgeEl) {
        if (status === 'Approved') {
          statusDotEl.className = 'w-2 h-2 rounded-full bg-emerald-500'
          statusTextEl.className = 'text-sm font-bold text-emerald-600 dark:text-emerald-400'
        } else if (status === 'Declined') {
          statusDotEl.className = 'w-2 h-2 rounded-full bg-rose-500'
          statusTextEl.className = 'text-sm font-bold text-rose-600 dark:text-rose-400'
        } else {
          statusDotEl.className = 'w-2 h-2 rounded-full bg-amber-500'
          statusTextEl.className = 'text-sm font-bold text-amber-600 dark:text-amber-400'
        }
      }

      // Submission Details Key-Values
      if (catEl) catEl.textContent = entry.category || 'Meals'
      if (amtEl) {
        const numAmount = parseFloat(entry.amount) || 0
        amtEl.textContent = `₱${(Math.round(numAmount * 100) / 100).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`
      }
      if (dateEl) {
        try {
          const [y, m, d] = (entry.date || '').split('-').map(Number)
          dateEl.textContent = y && m && d ? new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : entry.date
        } catch {
          dateEl.textContent = entry.date
        }
      }
      if (submittedEl) {
        submittedEl.textContent = entry.submittedDate || entry.date || 'Today'
      }
      if (sourceEl) {
        sourceEl.textContent = entry.source || 'Owner Portal (Mobile App)'
      }

      // Owner Note block (e.g., "Lunch. Just lunch. Nothing suspicious... I promise?")
      if (noteTitleEl) {
        const firstName = (entry.owner || 'Owner').split(' ')[0]
        noteTitleEl.textContent = `${firstName}'s Note`
      }
      if (noteEl) {
        noteEl.textContent = entry.notes ? `"${entry.notes}"` : '"Deduct from this month\'s pisonet profit share please."'
      }

      // Receipt Card preview
      if (receiptCardEl) {
        if (entry.receipt) {
          receiptCardEl.innerHTML = `
            <div class="relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 p-3 flex items-center justify-between gap-3">
              <div class="flex items-center space-x-3 truncate">
                <div class="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0 text-rose-500">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
                <div class="truncate">
                  <span class="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">${entry.category} Proof Receipt</span>
                  <span class="block text-[11px] text-slate-400 font-mono">${entry.date}</span>
                </div>
              </div>
              <a href="${entry.receipt}" target="_blank" class="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white dark:bg-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-600 shadow-2xs hover:bg-slate-50 transition">
                Expand ⤢
              </a>
            </div>
          `
        } else {
          receiptCardEl.innerHTML = `
            <div class="p-3.5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-400 font-sans">
              <span>No image attachment provided.</span>
              <span class="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Optional</span>
            </div>
          `
        }
      }

      // Policy Reference / Limit Check
      if (policyStatusEl) {
        const pool = Math.ceil(entry.profitPool || 10000)
        const isWithin = entry.amount <= pool
        policyStatusEl.innerHTML = `
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-600 dark:text-slate-400 font-medium">Available Profit: ₱${pool.toLocaleString('en-PH', { maximumFractionDigits: 0 })}</span>
            <span class="font-bold ${isWithin ? 'text-emerald-500' : 'text-rose-500'}">
              ${isWithin ? 'Within limit' : 'Exceeds balance'}
            </span>
          </div>
        `
      }

      // E-Signature Proof
      const sigWrap = document.getElementById('view-req-signature-wrap')
      if (sigWrap) {
        if (entry.signature && entry.signature.startsWith('data:image/png;base64')) {
          sigWrap.innerHTML = `<img src="${entry.signature}" alt="E-Signature" class="h-8 max-w-[140px] object-contain filter dark:brightness-150 inline-block rounded" />`
        } else if (entry.signatureName) {
          sigWrap.innerHTML = `<span class="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">✓ Signed by ${entry.signatureName}</span>`
        } else {
          sigWrap.innerHTML = `<span class="text-[11px] font-mono text-slate-400" id="view-req-signature">E-Verified</span>`
        }
      } else if (signatureEl) {
        signatureEl.textContent = entry.signatureName ? `✓ Signed by ${entry.signatureName}` : `E-Verified by ${entry.owner}`
      }

      // Update Prev / Next button state
      const list = this.parent.tableManager?.data || this.parent.tableManager?.records || []
      const currentIndex = list.findIndex((item) => item.id === entry.id)
      const prevBtn = document.getElementById('view-prev-btn')
      const nextBtn = document.getElementById('view-next-btn')

      if (prevBtn) {
        const isFirst = currentIndex <= 0
        prevBtn.disabled = isFirst
        if (isFirst) {
          prevBtn.classList.add('opacity-40', 'cursor-not-allowed')
          prevBtn.classList.remove('cursor-pointer')
        } else {
          prevBtn.classList.remove('opacity-40', 'cursor-not-allowed')
          prevBtn.classList.add('cursor-pointer')
        }
      }

      if (nextBtn) {
        const isLast = currentIndex === -1 || currentIndex >= list.length - 1
        nextBtn.disabled = isLast
        if (isLast) {
          nextBtn.classList.add('opacity-40', 'cursor-not-allowed')
          nextBtn.classList.remove('cursor-pointer')
        } else {
          nextBtn.classList.remove('opacity-40', 'cursor-not-allowed')
          nextBtn.classList.add('cursor-pointer')
        }
      }

      // Dynamic Switch State for Approve vs Reject Buttons in Drawer View
      const approveBtn = document.getElementById('view-approve-btn')
      const rejectBtn = document.getElementById('view-reject-btn')

      if (approveBtn && rejectBtn) {
        if (entry.status === 'Approved') {
          // Already Approved: Disable Approve with off-colors; Enable Reject
          approveBtn.disabled = true
          approveBtn.className = 'py-3 px-4 text-xs sm:text-sm font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 dark:text-slate-500 rounded-xl border border-slate-300 dark:border-slate-700 opacity-60 cursor-not-allowed flex items-center justify-center space-x-2'
          approveBtn.title = 'Currently Approved'

          rejectBtn.disabled = false
          rejectBtn.className = 'py-3 px-4 text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-md shadow-rose-600/30 transition flex items-center justify-center space-x-2 cursor-pointer'
          rejectBtn.title = 'Switch to Declined'
        } else if (entry.status === 'Declined') {
          // Already Declined: Disable Reject with off-colors; Enable Approve
          rejectBtn.disabled = true
          rejectBtn.className = 'py-3 px-4 text-xs sm:text-sm font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 dark:text-slate-500 rounded-xl border border-slate-300 dark:border-slate-700 opacity-60 cursor-not-allowed flex items-center justify-center space-x-2'
          rejectBtn.title = 'Currently Declined'

          approveBtn.disabled = false
          approveBtn.className = 'py-3 px-4 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md shadow-emerald-600/30 transition flex items-center justify-center space-x-2 cursor-pointer'
          approveBtn.title = 'Switch to Approved'
        } else {
          // Pending status: Both buttons fully active and clickable
          approveBtn.disabled = false
          approveBtn.className = 'py-3 px-4 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md shadow-emerald-600/30 transition flex items-center justify-center space-x-2 cursor-pointer'
          approveBtn.title = 'Approve Request'

          rejectBtn.disabled = false
          rejectBtn.className = 'py-3 px-4 text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-md shadow-rose-600/30 transition flex items-center justify-center space-x-2 cursor-pointer'
          rejectBtn.title = 'Reject Request'
        }
      }
    }
    // END: HabwaViewDrawerController.renderRequestView
    // END: HabwaViewDrawerController.openView

    // START: HabwaViewDrawerController.show - Slides view drawer into viewport with backdrop
    show() {
      const drawer = document.getElementById('drawer-view')
      if (!drawer) return

      // On mobile: slides up from bottom (removes translate-y-full)
      // On desktop (sm+): slides from right (removes sm:translate-x-full)
      drawer.classList.remove('translate-y-full', 'sm:translate-x-full')
      drawer.classList.add('translate-y-0', 'sm:translate-x-0')

      // Lock outside body scroll
      this.parent.lockBodyScroll()

      let backdrop = document.getElementById('drawer-backdrop')
      if (!backdrop) {
        backdrop = document.createElement('div')
        backdrop.id = 'drawer-backdrop'
        backdrop.className = 'fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300'
        backdrop.addEventListener('click', () => {
          this.close()
          this.parent.habwaDrawer.close()
        })
        document.body.appendChild(backdrop)
      }
    }
    // END: HabwaViewDrawerController.show

    // START: HabwaViewDrawerController.close - Slides view drawer out of viewport
    close() {
      const drawer = document.getElementById('drawer-view')
      if (drawer) {
        drawer.classList.add('translate-y-full', 'sm:translate-x-full')
        drawer.classList.remove('translate-y-0', 'sm:translate-x-0')
      }
      document.getElementById('drawer-backdrop')?.remove()

      // Unlock outside body scroll
      this.parent.unlockBodyScroll()
    }
    // END: HabwaViewDrawerController.close
  }
  // END: HabwaViewDrawerController - Subchild ready

  // ==========================================
  // SUBCHILD CLASS: ReviewNoteDrawerController
  // ==========================================
  // START: ReviewNoteDrawerController - Coordinates the Admin Review & Reason Note Drawer before Approved/Rejected status is sent to owners
  ReviewNoteDrawerController = class {
    constructor(parent) {
      this.parent = parent
      this.currentEntry = null
      this.actionType = 'Approved' // 'Approved' or 'Declined'
    }

    init() {
      const closeBtn = document.getElementById('close-review-note')
      const cancelBtn = document.getElementById('cancel-review-note')
      const form = document.getElementById('review-note-form')

      closeBtn?.addEventListener('click', () => this.close())
      cancelBtn?.addEventListener('click', () => this.close())
      form?.addEventListener('submit', (e) => this.submitReview(e))
    }

    open(entry, actionType = 'Approved') {
      this.currentEntry = entry
      this.actionType = actionType

      const titleEl = document.getElementById('review-note-title')
      const descEl = document.getElementById('review-note-desc')
      const targetOwnerEl = document.getElementById('review-target-owner')
      const targetReqEl = document.getElementById('review-target-req')
      const targetAmtEl = document.getElementById('review-target-amount')
      const textareaEl = document.getElementById('review-note-text')
      const submitBtn = document.getElementById('submit-review-note')

      const isApprove = actionType === 'Approved'

      if (titleEl) {
        titleEl.textContent = isApprove ? 'Confirm Approval & Note' : 'Decline Request & Reason'
      }
      if (descEl) {
        descEl.textContent = isApprove
          ? 'Attach an optional confirmation message or remittance receipt note for the owner.'
          : 'Please provide a clear reason why this request is declined so the owner is informed.'
      }
      if (targetOwnerEl) targetOwnerEl.textContent = entry.owner || 'Unit Owner'
      if (targetReqEl) targetReqEl.textContent = `${entry.id} • ${entry.category}`
      if (targetAmtEl) {
        targetAmtEl.textContent = `₱${Math.ceil(parseFloat(entry.amount || 0)).toLocaleString('en-PH', {
          maximumFractionDigits: 0
        })}`
      }

      if (textareaEl) {
        textareaEl.value = isApprove
          ? 'Approved. Deduction applied against this month\'s habwa balance.'
          : 'Declined: Request amount exceeds current available profit pool.'
        textareaEl.placeholder = isApprove
          ? 'e.g. Approved. Food delivery funds handed over.'
          : 'e.g. Reason for declining (insufficient profit, invalid receipt)...'
      }

      if (submitBtn) {
        if (isApprove) {
          submitBtn.className = 'w-1/2 py-2.5 px-4 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md shadow-emerald-600/30 transition flex items-center justify-center space-x-1.5 cursor-pointer'
          submitBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            <span>Confirm Approve</span>
          `
        } else {
          submitBtn.className = 'w-1/2 py-2.5 px-4 text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-md shadow-rose-600/30 transition flex items-center justify-center space-x-1.5 cursor-pointer'
          submitBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            <span>Confirm Decline</span>
          `
        }
      }

      this.show()
    }

    show() {
      const drawer = document.getElementById('drawer-review-note')
      if (!drawer) return

      drawer.classList.remove('translate-x-full')
      drawer.classList.add('translate-x-0')
      this.parent.lockBodyScroll()

      let backdrop = document.getElementById('drawer-backdrop')
      if (!backdrop) {
        backdrop = document.createElement('div')
        backdrop.id = 'drawer-backdrop'
        backdrop.className = 'fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300'
        backdrop.addEventListener('click', () => this.close())
        document.body.appendChild(backdrop)
      }
    }

    close() {
      const drawer = document.getElementById('drawer-review-note')
      if (drawer) {
        drawer.classList.add('translate-x-full')
        drawer.classList.remove('translate-x-0')
      }
      document.getElementById('drawer-backdrop')?.remove()
      this.parent.unlockBodyScroll()
    }

    submitReview(e) {
      e.preventDefault()
      if (!this.currentEntry) return

      const textareaEl = document.getElementById('review-note-text')
      const note = textareaEl?.value.trim() || ''

      this.parent.tableManager?.updateRequestStatus?.(this.currentEntry.id, this.actionType, note)
      this.close()
    }
  }
  // END: ReviewNoteDrawerController - Subchild ready

  // ==========================================
  // SUBCHILD CLASS: OwnersDrawerController
  // ==========================================
  // START: OwnersDrawerController - Handles Creating, Editing & Viewing Pisonet Owners
  OwnersDrawerController = class {
    constructor(parent) {
      this.parent = parent
      this.editingId = null
      this.categories = [
        'VIP Gaming Rig',
        'Standard Pisonet',
        'Dual Coin Slot',
        'High-Yield Terminal',
        'Coin Slot Arcade'
      ]
    }

    init() {
      const form = document.getElementById('owner-form')
      const closeBtn = document.getElementById('close-drawer')
      const cancelBtn = document.getElementById('cancel-btn')
      const addBtn = document.getElementById('add-btn')
      const closeViewBtn = document.getElementById('close-view')

      closeBtn?.addEventListener('click', () => this.close())
      cancelBtn?.addEventListener('click', () => this.close())
      addBtn?.addEventListener('click', () => this.openCreate())
      closeViewBtn?.addEventListener('click', () => this.closeView())

      // Auto trim username from Name input during typing if creating (plain title / name)
      const nameInput = document.getElementById('owner-name')
      const userInput = document.getElementById('owner-user')
      nameInput?.addEventListener('input', (e) => {
        if (!this.editingId && userInput) {
          userInput.value = userAccountManager.generateUsername(e.target.value)
        }
      })

      // Subchild phone formatter: 09## -> 9###, hyphen formatting, capped at 11 raw digits
      this.initPhoneFormatter()

      // Password visibility toggle in Owner drawer
      const togglePassBtn = document.getElementById('toggle-owner-pass')
      const passField = document.getElementById('owner-pass')
      const eyeIcon = document.getElementById('eye-owner-icon')
      let isPassVisible = false
      togglePassBtn?.addEventListener('click', () => {
        isPassVisible = !isPassVisible
        if (passField) {
          passField.setAttribute('type', isPassVisible ? 'text' : 'password')
        }
        if (eyeIcon) {
          eyeIcon.innerHTML = isPassVisible
            ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"></path>`
            : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>`
        }
      })

      form?.addEventListener('submit', (e) => this.saveEntry(e))

      // Check URL parameters for direct #add
      if (
        new URLSearchParams(window.location.search).get('action') === 'add' ||
        window.location.hash === '#add'
      ) {
        setTimeout(() => this.openCreate(), 250)
      }

      // Bind Flowbite dropdown menu items for Category
      document.querySelectorAll('[data-cat-choice]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault()
          const val = btn.getAttribute('data-cat-choice')
          this.setCategory(val)
          document.getElementById('owner-category-menu')?.classList.add('hidden')
        })
      })

      // Bind Flowbite dropdown menu items for Status
      document.querySelectorAll('[data-status-choice]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault()
          const val = btn.getAttribute('data-status-choice')
          this.setStatus(val)
          document.getElementById('owner-status-menu')?.classList.add('hidden')
        })
      })
    }

    // Subchild phone formatter for owner-phone: +63 prefix static, auto convert 09## -> 9###, hyphen formatting
    initPhoneFormatter() {
      const phoneInput = document.getElementById('owner-phone')
      if (!phoneInput) return

      phoneInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '') // extract digits only

        // If user typed 09##..., convert to 9###...
        if (val.startsWith('09')) {
          val = val.slice(1)
        } else if (val.startsWith('0')) {
          val = val.slice(1)
        }

        // Limit to max 10 digits (9XXXXXXXXX) since +63 is static
        if (val.length > 10) {
          val = val.slice(0, 10)
        }

        // Auto format with hyphens: 9XX-XXX-XXXX
        let formatted = ''
        if (val.length > 0) {
          formatted = val.substring(0, 3)
        }
        if (val.length >= 4) {
          formatted += '-' + val.substring(3, 6)
        }
        if (val.length >= 7) {
          formatted += '-' + val.substring(6, 10)
        }

        e.target.value = formatted
      })
    }

    setCategory(val) {
      const catInput = document.getElementById('owner-category')
      const catLabel = document.getElementById('owner-category-label')
      if (catInput) catInput.value = val
      if (catLabel) catLabel.textContent = val
    }

    setStatus(val) {
      const statusInput = document.getElementById('owner-status')
      const statusLabel = document.getElementById('owner-status-label')
      if (statusInput) statusInput.value = val
      if (statusLabel) {
        let dotColor = 'bg-emerald-500'
        if (val === 'Pending') dotColor = 'bg-amber-500'
        if (val === 'Declined') dotColor = 'bg-rose-500'
        statusLabel.innerHTML = `
          <span class="w-2 h-2 rounded-full ${dotColor} me-2"></span>
          ${val}
        `
      }
    }

    openCreate() {
      this.editingId = null
      const form = document.getElementById('owner-form')
      form?.reset()

      const title = document.getElementById('drawer-title')
      if (title) title.textContent = 'Register New Pisonet Owner'

      const passInput = document.getElementById('owner-pass')
      if (passInput) passInput.value = userAccountManager.defaultPassword

      const unitsInput = document.getElementById('owner-units')
      if (unitsInput) unitsInput.value = '1'

      const dateInput = document.getElementById('owner-date')
      if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10)

      this.setStatus('Approved')
      this.setCategory(this.categories[0])

      this.show()
    }

    openEdit(entry) {
      this.editingId = entry.id
      const title = document.getElementById('drawer-title')
      if (title) title.textContent = `Edit Owner - ${entry.name}`

      const nameInput = document.getElementById('owner-name')
      const userInput = document.getElementById('owner-user')
      const passInput = document.getElementById('owner-pass')
      const phoneInput = document.getElementById('owner-phone')
      const unitsInput = document.getElementById('owner-units')
      const dateInput = document.getElementById('owner-date')

      if (nameInput) nameInput.value = entry.name || ''
      if (userInput) userInput.value = entry.username || ''
      if (passInput) passInput.value = entry.password || userAccountManager.defaultPassword
      
      // Clean phone prefix if already present for editing input
      if (phoneInput) {
        let p = (entry.phone || '').replace(/^\+63\s*/, '')
        phoneInput.value = p
      }

      // Extract number of units
      if (unitsInput) {
        const numMatch = String(entry.units || '1').match(/\d+/)
        unitsInput.value = numMatch ? numMatch[0] : '1'
      }

      if (dateInput) dateInput.value = entry.dateCreated || new Date().toISOString().slice(0, 10)

      this.setCategory(entry.category || this.categories[0])
      this.setStatus(entry.status || 'Pending')

      this.show()
    }

    openView(entry) {
      const drawer = document.getElementById('drawer-owner-view')
      if (!drawer) return

      const avatarEl = document.getElementById('view-owner-avatar')
      const nameEl = document.getElementById('view-owner-name')
      const userEl = document.getElementById('view-owner-user')
      const idEl = document.getElementById('view-owner-id')
      const phoneEl = document.getElementById('view-owner-phone')
      const catEl = document.getElementById('view-owner-category')
      const unitsEl = document.getElementById('view-owner-units')
      const dateEl = document.getElementById('view-owner-date')
      const passEl = document.getElementById('view-owner-pass')
      const statusBadge = document.getElementById('view-owner-status')
      const editBtn = document.getElementById('view-owner-edit')

      if (avatarEl) avatarEl.src = entry.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      if (nameEl) nameEl.textContent = entry.name || 'Owner Profile'
      if (userEl) userEl.textContent = `@${entry.username || 'user'}`
      if (idEl) idEl.textContent = entry.id || 'USR-1'
      
      const phoneDisplay = entry.phone ? (entry.phone.startsWith('+63') ? entry.phone : `+63 ${entry.phone}`) : '+63 917-000-0000'
      if (phoneEl) phoneEl.textContent = phoneDisplay

      if (catEl) catEl.textContent = entry.category || 'VIP Gaming Rig'
      if (unitsEl) unitsEl.textContent = entry.units || '1 Unit'
      if (dateEl) dateEl.textContent = entry.dateCreated || new Date().toISOString().slice(0, 10)

      if (statusBadge) {
        const curStatus = entry.status || 'Pending'
        statusBadge.textContent = curStatus
        const stLower = curStatus.toLowerCase()
        if (stLower === 'approved') {
          statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-500/30'
        } else if (stLower === 'declined') {
          statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-500/30'
        } else {
          statusBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-500/30'
        }
      }

      const approveBtn = document.getElementById('view-owner-approve')
      const approveLabel = document.getElementById('view-approve-label')

      if (approveBtn) {
        const isApproved = (entry.status || '').toLowerCase() === 'approved'
        if (isApproved) {
          approveBtn.disabled = true
          approveBtn.className = 'w-full py-2.5 px-4 text-xs sm:text-sm font-bold text-emerald-800/60 dark:text-emerald-300/40 bg-emerald-100/60 dark:bg-emerald-950/30 border border-emerald-300/30 dark:border-emerald-800/30 rounded-xl cursor-not-allowed opacity-60 flex items-center justify-center space-x-2'
          if (approveLabel) approveLabel.textContent = 'Approved'
        } else {
          approveBtn.disabled = false
          approveBtn.className = 'w-full py-2.5 px-4 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md shadow-emerald-600/30 transition flex items-center justify-center space-x-2 cursor-pointer'
          if (approveLabel) approveLabel.textContent = 'Approve'
          approveBtn.onclick = async () => {
            entry.status = 'Approved'
            await userAccountManager.updateUser(entry.id, { status: 'Approved' })
            if (this.parent.tableManager) {
              await this.parent.tableManager.loadFromSupabase()
              this.parent.tableManager.render()
            }
            this.parent.tableManager?.animations?.toast?.show(`Owner "${entry.name}" approved successfully!`)
            this.openView(entry)
          }
        }
      }

      if (editBtn) {
        editBtn.onclick = () => {
          this.closeView()
          this.openEdit(entry)
        }
      }

      drawer.classList.remove('translate-y-full', 'sm:translate-x-full')
      drawer.classList.add('translate-y-0', 'sm:translate-x-0')
      this.parent.lockBodyScroll()

      let backdrop = document.getElementById('drawer-backdrop')
      if (!backdrop) {
        backdrop = document.createElement('div')
        backdrop.id = 'drawer-backdrop'
        backdrop.className = 'fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300'
        backdrop.addEventListener('click', () => this.closeView())
        document.body.appendChild(backdrop)
      }
    }

    closeView() {
      const drawer = document.getElementById('drawer-owner-view')
      drawer?.classList.add('translate-y-full', 'sm:translate-x-full')
      drawer?.classList.remove('translate-y-0', 'sm:translate-x-0')
      document.getElementById('drawer-backdrop')?.remove()
      this.parent.unlockBodyScroll()
    }

    show() {
      const drawer = document.getElementById('drawer-owner')
      if (!drawer) return
      drawer.classList.remove('translate-x-full')
      drawer.classList.add('translate-x-0')
      this.parent.lockBodyScroll()

      let backdrop = document.getElementById('drawer-backdrop')
      if (!backdrop) {
        backdrop = document.createElement('div')
        backdrop.id = 'drawer-backdrop'
        backdrop.className = 'fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300'
        backdrop.addEventListener('click', () => this.close())
        document.body.appendChild(backdrop)
      }
    }

    close() {
      const drawer = document.getElementById('drawer-owner')
      drawer?.classList.add('translate-x-full')
      drawer?.classList.remove('translate-x-0')
      document.getElementById('drawer-backdrop')?.remove()
      this.parent.unlockBodyScroll()
    }

    async saveEntry(e) {
      e.preventDefault()
      const name = document.getElementById('owner-name')?.value.trim() || 'New Owner'
      const username = document.getElementById('owner-user')?.value.trim() || userAccountManager.generateUsername(name)
      const password = document.getElementById('owner-pass')?.value.trim() || userAccountManager.defaultPassword
      
      const rawPhone = document.getElementById('owner-phone')?.value.trim() || ''
      const phone = rawPhone ? `+63 ${rawPhone.replace(/^\+63\s*/, '')}` : '+63 917-000-0000'

      const category = document.getElementById('owner-category')?.value || 'VIP Gaming Rig'
      
      const unitNum = parseInt(document.getElementById('owner-units')?.value, 10) || 1
      const units = unitNum === 1 ? '1 Unit' : `${unitNum} Units`

      const dateCreated = document.getElementById('owner-date')?.value || new Date().toISOString().slice(0, 10)
      const status = document.getElementById('owner-status')?.value || 'Approved'

      const tableManager = this.parent.tableManager

      if (this.editingId) {
        // Update existing owner
        await userAccountManager.updateUser(this.editingId, {
          name,
          username,
          password,
          phone,
          category,
          units,
          dateCreated,
          status
        })

        if (tableManager) {
          await tableManager.loadFromSupabase()
          tableManager.render()
        }

        this.parent.animations?.toast?.show(`Owner "${name}" updated successfully!`)
      } else {
        // Create new owner
        await userAccountManager.createUser({
          name,
          username,
          password,
          phone,
          category,
          units,
          dateCreated,
          status
        })

        if (tableManager) {
          await tableManager.loadFromSupabase()
          tableManager.render()
        }

        this.parent.animations?.toast?.show(`Owner "${name}" registered with default password!`)
      }

      this.close()
    }
  }
  // END: OwnersDrawerController - Subchild ready

  // ==========================================
  // SUBCHILD CLASS: ExportsDrawerController
  // ==========================================
  // START: ExportsDrawerController - OOP coordinator for custom export configuration drawer
  ExportsDrawerController = class {
    constructor(parent) {
      this.parent = parent
      this.scopeDropdown = new this.ScopeDropdownController(this)
      this.ownerDropdown = new this.OwnerDropdownController(this)
      this.unitsDropdown = new this.UnitsDropdownController(this)
      this.dateController = new this.DateRangeController(this)
    }

    // START: ExportsDrawerController.init - Bootstraps all registered dropdown and filter subchildren
    init() {
      const exportBtn = document.getElementById('export-btn')
      const closeBtn = document.getElementById('close-drawer')
      const form = document.getElementById('export-form')

      // Main action triggers from drawer footer
      const printBtn = document.getElementById('print-export-btn')
      const csvBtn = document.getElementById('csv-export-btn')
      const jsonBtn = document.getElementById('json-export-btn')

      // Open drawer on main action button
      exportBtn?.addEventListener('click', () => {
        this.openCreate()
      })

      // Close drawer trigger (Top-right SVG close-drawer with hover rose)
      closeBtn?.addEventListener('click', () => this.close())

      // Initialize subchild controllers
      this.scopeDropdown.init()
      this.ownerDropdown.init()
      this.unitsDropdown.init()
      this.dateController.init()

      // Action triggers
      printBtn?.addEventListener('click', () => this.handleExportAction('print'))
      csvBtn?.addEventListener('click', () => this.handleExportAction('csv'))
      jsonBtn?.addEventListener('click', () => this.handleExportAction('json'))

      // Form submit default
      form?.addEventListener('submit', (e) => {
        e.preventDefault()
        this.applyToPreview()
      })
    }
    // END: ExportsDrawerController.init

    // START: ScopeDropdownController - Manages searchable and selectable Report Scope dropdown
    ScopeDropdownController = class {
      constructor(drawer) {
        this.drawer = drawer
        this.scopes = [
          { value: 'all', title: 'ALL SYSTEM DATA (Full Combined Ledger)', subtitle: 'All categories, logs, and telemetry combined' },
          { value: 'revenue', title: 'Coin Revenue & Habwa Collections', subtitle: 'Pisonet coin drop harvests & gross earnings' },
          { value: 'bills', title: 'Operational Expenses & Bills Deductions', subtitle: 'Electricity, fiber internet, water & repairs' },
          { value: 'requests', title: 'Owner Expense Requests & Advances', subtitle: 'Cash advances, meals, and allowances' },
          { value: 'terminals', title: 'Terminal Hardware & Pisonet Fleet', subtitle: 'Pisonet unit status, components & dual coin slots' },
          { value: 'owners', title: 'Registered Unit Owners & Credentials', subtitle: 'Partner owners, contact numbers & units assigned' }
        ]
        this.selectedScope = this.scopes[0]
      }

      init() {
        const input = document.getElementById('scope-btn')
        this.render()

        input?.addEventListener('focus', () => {
          input.select()
          this.render('')
          document.getElementById('scope-menu')?.classList.remove('hidden')
        })

        input?.addEventListener('click', () => {
          input.select()
          this.render('')
          document.getElementById('scope-menu')?.classList.remove('hidden')
        })

        input?.addEventListener('input', (e) => {
          this.render(e.target.value)
          document.getElementById('scope-menu')?.classList.remove('hidden')
        })

        input?.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            const match = this.scopes.find(s => s.title.toLowerCase().includes(input.value.toLowerCase())) || this.scopes[0]
            this.select(match)
          }
        })

        document.addEventListener('click', (e) => {
          const menu = document.getElementById('scope-menu')
          if (menu && !menu.contains(e.target) && e.target !== input) {
            menu.classList.add('hidden')
          }
        })
      }

      render(filter = '') {
        const listEl = document.getElementById('scope-list')
        if (!listEl) return

        const query = filter.trim().toLowerCase()
        const filtered = this.scopes.filter(s => !query || s.title.toLowerCase().includes(query) || s.subtitle.toLowerCase().includes(query))

        if (filtered.length === 0) {
          listEl.innerHTML = `<li class="p-2 text-center text-slate-400 text-xs">No matching scopes found.</li>`
          return
        }

        listEl.innerHTML = filtered.map(s => `
          <li class="group flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer" data-select-scope="${s.value}">
            <div class="flex items-center space-x-2.5 truncate flex-1">
              <div class="w-7 h-7 rounded-lg ${s.value === 'all' ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'} flex items-center justify-center font-bold text-xs shrink-0">
                ${s.value === 'all' ? '★' : '◆'}
              </div>
              <div class="truncate">
                <span class="block truncate text-xs font-bold text-slate-800 dark:text-slate-200">${s.title}</span>
                <span class="block text-[10px] text-slate-400">${s.subtitle}</span>
              </div>
            </div>
          </li>
        `).join('')

        listEl.querySelectorAll('[data-select-scope]').forEach(el => {
          el.addEventListener('click', () => {
            const val = el.getAttribute('data-select-scope')
            const item = this.scopes.find(s => s.value === val) || this.scopes[0]
            this.select(item)
          })
        })
      }

      select(scopeObj) {
        this.selectedScope = scopeObj
        const input = document.getElementById('scope-btn')
        const hidden = document.getElementById('export-scope')
        if (input) input.value = scopeObj.title
        if (hidden) hidden.value = scopeObj.value
        document.getElementById('scope-menu')?.classList.add('hidden')
        this.drawer.onFilterChanged()
      }
    }
    // END: ScopeDropdownController

    // START: OwnerDropdownController - Manages searchable and selectable Owner Fleet dropdown
    OwnerDropdownController = class {
      constructor(drawer) {
        this.drawer = drawer
        this.owners = [
          { value: 'all', title: 'ALL OWNERS (Full Fleet)', subtitle: 'System-wide telemetry across all partners' },
          { value: 'Kuya Jorgy', title: 'Kuya Jorgy (Unit 1 & 2)', subtitle: 'Station 1 & 2 • Dual coin slots' },
          { value: 'Boss Roldan', title: 'Boss Roldan (Unit 3 & 4)', subtitle: 'Station 3 & 4 • VIP Gaming rig' },
          { value: 'Ate Gina', title: 'Ate Gina (Unit 5 & 6)', subtitle: 'Station 5 & 6 • Standard pisonets' },
          { value: 'Nanay Tessie', title: 'Nanay Tessie (Unit 7 & 8)', subtitle: 'Station 7 & 8 • Dual coin units' },
          { value: 'Uncle Dan', title: 'Uncle Dan (Unit 9 & 10)', subtitle: 'Station 9 & 10 • High-yield rigs' }
        ]
        this.selectedOwner = this.owners[0]
      }

      init() {
        const input = document.getElementById('owner-btn')
        this.render()

        input?.addEventListener('focus', () => {
          input.select()
          this.render('')
          document.getElementById('owner-menu')?.classList.remove('hidden')
        })

        input?.addEventListener('click', () => {
          input.select()
          this.render('')
          document.getElementById('owner-menu')?.classList.remove('hidden')
        })

        input?.addEventListener('input', (e) => {
          this.render(e.target.value)
          document.getElementById('owner-menu')?.classList.remove('hidden')
        })

        input?.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            const match = this.owners.find(o => o.title.toLowerCase().includes(input.value.toLowerCase())) || this.owners[0]
            this.select(match)
          }
        })

        document.addEventListener('click', (e) => {
          const menu = document.getElementById('owner-menu')
          if (menu && !menu.contains(e.target) && e.target !== input) {
            menu.classList.add('hidden')
          }
        })
      }

      render(filter = '') {
        const listEl = document.getElementById('owner-list')
        if (!listEl) return

        const query = filter.trim().toLowerCase()
        const filtered = this.owners.filter(o => !query || o.title.toLowerCase().includes(query) || o.subtitle.toLowerCase().includes(query))

        if (filtered.length === 0) {
          listEl.innerHTML = `<li class="p-2 text-center text-slate-400 text-xs">No matching owners found.</li>`
          return
        }

        listEl.innerHTML = filtered.map(o => `
          <li class="group flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer" data-select-owner="${o.value}">
            <div class="flex items-center space-x-2.5 truncate flex-1">
              <div class="w-7 h-7 rounded-lg ${o.value === 'all' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400'} flex items-center justify-center font-bold text-xs shrink-0">
                ${o.value === 'all' ? '★' : o.title.slice(0, 1)}
              </div>
              <div class="truncate">
                <span class="block truncate text-xs font-bold text-slate-800 dark:text-slate-200">${o.title}</span>
                <span class="block text-[10px] text-slate-400">${o.subtitle}</span>
              </div>
            </div>
          </li>
        `).join('')

        listEl.querySelectorAll('[data-select-owner]').forEach(el => {
          el.addEventListener('click', () => {
            const val = el.getAttribute('data-select-owner')
            const item = this.owners.find(o => o.value === val) || this.owners[0]
            this.select(item)
          })
        })
      }

      select(ownerObj) {
        this.selectedOwner = ownerObj
        const input = document.getElementById('owner-btn')
        const hidden = document.getElementById('export-owner')
        if (input) input.value = ownerObj.title
        if (hidden) hidden.value = ownerObj.value
        document.getElementById('owner-menu')?.classList.add('hidden')
        this.drawer.onFilterChanged()
      }
    }
    // END: OwnerDropdownController

    // START: UnitsDropdownController - Manages searchable and selectable Units Coverage dropdown
    UnitsDropdownController = class {
      constructor(drawer) {
        this.drawer = drawer
        this.units = [
          { value: 'all', title: 'ALL PISONETS (Complete Fleet Units 1 to 10)', subtitle: 'Full 10-terminal gaming & coin slot network' },
          { value: '1 & 2', title: 'Unit 1 & 2 (Main Counter Units)', subtitle: 'Kuya Jorgy • High-traffic storefront' },
          { value: '3 & 4', title: 'Unit 3 & 4 (VIP Gaming Setup)', subtitle: 'Boss Roldan • Curved monitors & gaming rigs' },
          { value: '5 & 6', title: 'Unit 5 & 6 (Side Alley Terminal)', subtitle: 'Ate Gina • Standard pisonet units' },
          { value: '7 & 8', title: 'Unit 7 & 8 (Dual Coin Terminal)', subtitle: 'Nanay Tessie • Dual coin chutes' },
          { value: '9 & 10', title: 'Unit 9 & 10 (High-Yield Terminal)', subtitle: 'Uncle Dan • High uptime performance' }
        ]
        this.selectedUnits = this.units[0]
      }

      init() {
        const input = document.getElementById('units-btn')
        this.render()

        input?.addEventListener('focus', () => {
          input.select()
          this.render('')
          document.getElementById('units-menu')?.classList.remove('hidden')
        })

        input?.addEventListener('click', () => {
          input.select()
          this.render('')
          document.getElementById('units-menu')?.classList.remove('hidden')
        })

        input?.addEventListener('input', (e) => {
          this.render(e.target.value)
          document.getElementById('units-menu')?.classList.remove('hidden')
        })

        input?.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            const match = this.units.find(u => u.title.toLowerCase().includes(input.value.toLowerCase())) || this.units[0]
            this.select(match)
          }
        })

        document.addEventListener('click', (e) => {
          const menu = document.getElementById('units-menu')
          if (menu && !menu.contains(e.target) && e.target !== input) {
            menu.classList.add('hidden')
          }
        })
      }

      render(filter = '') {
        const listEl = document.getElementById('units-list')
        if (!listEl) return

        const query = filter.trim().toLowerCase()
        const filtered = this.units.filter(u => !query || u.title.toLowerCase().includes(query) || u.subtitle.toLowerCase().includes(query))

        if (filtered.length === 0) {
          listEl.innerHTML = `<li class="p-2 text-center text-slate-400 text-xs">No matching terminal units found.</li>`
          return
        }

        listEl.innerHTML = filtered.map(u => `
          <li class="group flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer" data-select-unit="${u.value}">
            <div class="flex items-center space-x-2.5 truncate flex-1">
              <div class="w-7 h-7 rounded-lg ${u.value === 'all' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'} flex items-center justify-center font-bold text-xs shrink-0">
                ${u.value === 'all' ? '★' : '💻'}
              </div>
              <div class="truncate">
                <span class="block truncate text-xs font-bold text-slate-800 dark:text-slate-200">${u.title}</span>
                <span class="block text-[10px] text-slate-400">${u.subtitle}</span>
              </div>
            </div>
          </li>
        `).join('')

        listEl.querySelectorAll('[data-select-unit]').forEach(el => {
          el.addEventListener('click', () => {
            const val = el.getAttribute('data-select-unit')
            const item = this.units.find(u => u.value === val) || this.units[0]
            this.select(item)
          })
        })
      }

      select(unitsObj) {
        this.selectedUnits = unitsObj
        const input = document.getElementById('units-btn')
        const hidden = document.getElementById('export-units')
        if (input) input.value = unitsObj.title
        if (hidden) hidden.value = unitsObj.value
        document.getElementById('units-menu')?.classList.add('hidden')
        this.drawer.onFilterChanged()
      }
    }
    // END: UnitsDropdownController

    // START: DateRangeController - Manages Flowbite Datepicker inputs and quick date range pills
    DateRangeController = class {
      constructor(drawer) {
        this.drawer = drawer
      }

      init() {
        const presetButtons = document.querySelectorAll('[data-date-preset]')
        const startInput = document.getElementById('export-start-date')
        const endInput = document.getElementById('export-end-date')

        presetButtons.forEach(btn => {
          btn.addEventListener('click', () => {
            presetButtons.forEach(b => {
              b.classList.remove('bg-blue-600', 'text-white', 'border-blue-600')
              b.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300', 'border-slate-300', 'dark:border-slate-700')
            })

            btn.classList.add('bg-blue-600', 'text-white', 'border-blue-600')
            btn.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300')

            const preset = btn.getAttribute('data-date-preset')
            if (preset === 'all') {
              if (startInput) startInput.value = '2026-01-01'
              if (endInput) endInput.value = '2026-10-31'
            } else if (preset === 'month') {
              if (startInput) startInput.value = '2026-10-01'
              if (endInput) endInput.value = '2026-10-31'
            } else if (preset === 'prev-month') {
              if (startInput) startInput.value = '2026-09-01'
              if (endInput) endInput.value = '2026-09-30'
            } else if (preset === 'year') {
              if (startInput) startInput.value = '2026-01-01'
              if (endInput) endInput.value = '2026-12-31'
            }

            this.drawer.onFilterChanged()
          })
        })

        if (window.Datepicker) {
          if (startInput && !startInput._datepicker) {
            startInput._datepicker = new window.Datepicker(startInput, { autohide: true, format: 'yyyy-mm-dd' })
            startInput.addEventListener('changeDate', () => this.drawer.onFilterChanged())
          }
          if (endInput && !endInput._datepicker) {
            endInput._datepicker = new window.Datepicker(endInput, { autohide: true, format: 'yyyy-mm-dd' })
            endInput.addEventListener('changeDate', () => this.drawer.onFilterChanged())
          }
        }
      }
    }
    // END: DateRangeController

    // START: ExportsDrawerController.onFilterChanged - Reactively updates preview sheet parameters
    onFilterChanged() {
      const scope = this.scopeDropdown.selectedScope
      const owner = this.ownerDropdown.selectedOwner
      const units = this.unitsDropdown.selectedUnits
      const start = document.getElementById('export-start-date')?.value || '2026-01-01'
      const end = document.getElementById('export-end-date')?.value || '2026-10-31'

      if (this.parent.tableManager && typeof this.parent.tableManager.updatePreviewFilters === 'function') {
        this.parent.tableManager.updatePreviewFilters({
          scope: scope.title,
          owner: owner.title,
          units: units.title,
          startDate: start,
          endDate: end
        })
      }
    }
    // END: ExportsDrawerController.onFilterChanged

    // START: ExportsDrawerController.applyToPreview - Saves filters and closes drawer
    applyToPreview() {
      this.onFilterChanged()
      this.close()
      this.parent.animations?.toast?.show('Custom export preview updated successfully!')
    }
    // END: ExportsDrawerController.applyToPreview

    // START: ExportsDrawerController.openCreate - Resets and opens export configuration drawer
    openCreate() {
      this.scopeDropdown.select(this.scopeDropdown.scopes[0])
      this.ownerDropdown.select(this.ownerDropdown.owners[0])
      this.unitsDropdown.select(this.unitsDropdown.units[0])

      const startInput = document.getElementById('export-start-date')
      const endInput = document.getElementById('export-end-date')
      if (startInput) startInput.value = '2026-01-01'
      if (endInput) endInput.value = '2026-10-31'

      this.show()
    }
    // END: ExportsDrawerController.openCreate

    // START: ExportsDrawerController.show - Slides drawer in and mounts backdrop
    show() {
      const drawer = document.getElementById('drawer-export')
      if (!drawer) return
      drawer.classList.remove('translate-x-full')
      drawer.classList.add('translate-x-0')

      this.parent.lockBodyScroll()

      let backdrop = document.getElementById('drawer-backdrop')
      if (!backdrop) {
        backdrop = document.createElement('div')
        backdrop.id = 'drawer-backdrop'
        backdrop.className = 'fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300'
        backdrop.addEventListener('click', () => this.close())
        document.body.appendChild(backdrop)
      }
    }
    // END: ExportsDrawerController.show

    // START: ExportsDrawerController.close - Slides drawer out and unmounts backdrop
    close() {
      const drawer = document.getElementById('drawer-export')
      if (drawer) {
        drawer.classList.add('translate-x-full')
        drawer.classList.remove('translate-x-0')
      }

      const backdrop = document.getElementById('drawer-backdrop')
      if (backdrop) backdrop.remove()

      this.parent.unlockBodyScroll()
    }
    // END: ExportsDrawerController.close

    // START: ExportsDrawerController.handleExportAction - Performs Print, CSV, or JSON export
    handleExportAction(format = 'csv') {
      this.onFilterChanged()
      const scope = this.scopeDropdown.selectedScope.title
      const owner = this.ownerDropdown.selectedOwner.title
      const units = this.unitsDropdown.selectedUnits.title
      const startDate = document.getElementById('export-start-date')?.value || '2026-01-01'
      const endDate = document.getElementById('export-end-date')?.value || '2026-10-31'

      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const ext = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'pdf'
      const cleanScope = scope.replace(/[^a-zA-Z0-9]/g, '_')
      const fileName = `JorgyNets_${cleanScope}_${timestamp}.${ext}`

      this.close()

      if (format === 'print') {
        this.parent.animations?.toast?.show(`Opening print preview for ${scope}...`, 1800, () => {
          window.print()
        })
      } else if (this.parent.tableManager && typeof this.parent.tableManager.triggerDownload === 'function') {
        this.parent.tableManager.triggerDownload(format, fileName)
      }
    }
    // END: ExportsDrawerController.handleExportAction
  }
  // END: ExportsDrawerController - Subchild ready
}
// END: DrawerManager - Drawer module ready

