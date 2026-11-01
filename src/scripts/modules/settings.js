// START: SettingsManager - Parent OOP coordinator for multi-tab settings modal, profile management, and preferences
import { themeController } from './theme.js'
import { usersApi, authApi, storageManager } from '../../api/index.js'

export class SettingsManager {
  constructor(animations = null) {
    this.animations = animations
    this.tabController = new this.TabController(this)
    this.generalController = new this.GeneralController(this)
    this.profileController = new this.ProfileController(this)
    this.securityController = new this.SecurityController(this)
    this.notificationsController = new this.NotificationsController(this)
    this.currentUserData = null
  }

  // START: SettingsManager.init - Bootstraps all settings subchild controllers and binds global modal toggles
  init() {
    this.bindModalTriggers()
    this.tabController.init()
    this.generalController.init()
    this.profileController.init()
    this.securityController.init()
    this.notificationsController.init()
    this.bindSaveAction()
  }
  // END: SettingsManager.init

  // START: SettingsManager.bindModalTriggers - Binds opening and closing triggers with backdrop blur
  bindModalTriggers() {
    const modal = document.getElementById('settings-modal')
    const closeBtn = document.getElementById('close-modal')
    const cancelBtn = document.getElementById('cancel-settings')

    // Open Modal Triggers (Sidebar navigation & quick settings)
    const openModal = async () => {
      if (!modal) return
      modal.classList.remove('hidden')
      modal.classList.add('flex')
      document.body.classList.add('overflow-hidden')
      await this.syncUI()
    }

    // Close Modal Triggers
    const closeModal = () => {
      if (!modal) return
      modal.classList.add('hidden')
      modal.classList.remove('flex')
      document.body.classList.remove('overflow-hidden')
    }

    document.getElementById('nav-sys-settings')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.tabController.switchTab('general')
      openModal()
    })

    document.getElementById('nav-profile-settings')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.tabController.switchTab('profile')
      openModal()
    })

    document.getElementById('quick-settings')?.addEventListener('click', (e) => {
      e.preventDefault()
      openModal()
    })

    document.getElementById('btn-notif')?.addEventListener('click', (e) => {
      e.preventDefault()
      this.tabController.switchTab('notifications')
      openModal()
    })

    closeBtn?.addEventListener('click', (e) => {
      e.preventDefault()
      closeModal()
    })

    cancelBtn?.addEventListener('click', (e) => {
      e.preventDefault()
      closeModal()
    })

    // Click outside modal backdrop to dismiss
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal()
      }
    })
  }
  // END: SettingsManager.bindModalTriggers

  // START: SettingsManager.syncUI - Synchronizes all input controls with stored preferences & Supabase backend
  async syncUI() {
    const sessionUser = storageManager.session.getUserData() || {}
    const userId = sessionUser.id || storageManager.session.getUserId()

    if (userId) {
      const res = await usersApi.getById(userId)
      if (res.success && res.data) {
        this.currentUserData = res.data
      }
    }

    this.generalController.sync(this.currentUserData)
    this.profileController.sync(this.currentUserData)
    this.securityController.sync(this.currentUserData)
    this.notificationsController.sync()
  }
  // END: SettingsManager.syncUI

  // START: SettingsManager.bindSaveAction - Saves all settings to Supabase, updates auth session, and displays feedback
  bindSaveAction() {
    const saveBtn = document.getElementById('save-settings')
    saveBtn?.addEventListener('click', async () => {
      // 1. General Settings
      const username = document.getElementById('set-user')?.value.trim() || 'admin'
      const phone = document.getElementById('set-phone')?.value.trim() || ''
      const isDark = document.getElementById('set-dark')?.checked ?? false
      const isRolling = document.getElementById('set-rolling')?.checked ?? true

      // 2. Profile Settings
      const fullName = document.getElementById('set-fullname')?.value.trim() || 'Jorgie Alcantara'
      const avatarSrc = document.getElementById('avatar-preview')?.getAttribute('src') || ''

      // 3. Security Settings
      const pin = document.getElementById('set-pin')?.value.trim() || '1234'
      const newPass = document.getElementById('new-pass')?.value.trim()
      const confirmPass = document.getElementById('confirm-pass')?.value.trim()

      if (newPass && newPass !== confirmPass) {
        alert('New password and confirm password do not match.')
        return
      }

      // 4. Notifications Settings
      const enableNotif = document.getElementById('set-notif')?.checked ?? true
      const enableSfx = document.getElementById('set-sfx')?.checked ?? false

      // Update Supabase Database
      const sessionUser = storageManager.session.getUserData() || {}
      const userId = sessionUser.id || storageManager.session.getUserId()

      if (userId) {
        const updatePayload = {
          full_name: fullName,
          username: username.toLowerCase(),
          phone: phone || null
        }
        if (newPass) {
          updatePayload.password = newPass
        }
        await usersApi.update(userId, updatePayload)
      }

      // Persist preferences to localStorage
      const userSettings = {
        username,
        phone,
        fullName,
        avatarSrc,
        pin,
        isRolling,
        enableNotif,
        enableSfx
      }
      localStorage.setItem('jn_settings', JSON.stringify(userSettings))

      // Sync active session username and display name
      sessionStorage.setItem('jn_session_user', fullName)
      sessionStorage.setItem('jn_session_handle', `@${username}`)

      // Update sidebar visual card elements if present
      const sideName = document.getElementById('user-fullname')
      const sideHandle = document.getElementById('user-handle')
      const dropName = document.getElementById('dropdown-user-fullname')
      const dropPhone = document.getElementById('dropdown-user-phone')
      const avatarInitials = document.getElementById('user-avatar-initials')

      if (sideName) sideName.textContent = fullName
      if (sideHandle) sideHandle.textContent = `@${username}`
      if (dropName) dropName.textContent = fullName
      if (dropPhone) dropPhone.textContent = phone || 'N/A'
      if (avatarInitials) {
        const initials = fullName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'JA'
        avatarInitials.textContent = initials
      }

      // Apply theme changes
      themeController.apply(isDark ? 'dark' : 'light')

      // Dismiss modal
      const modal = document.getElementById('settings-modal')
      if (modal) {
        modal.classList.add('hidden')
        modal.classList.remove('flex')
        document.body.classList.remove('overflow-hidden')
      }

      // Show toast if AnimationsManager is available
      if (this.animations?.toast) {
        this.animations.toast.show('Settings saved to database successfully!')
      }
    })
  }
  // END: SettingsManager.bindSaveAction

  // =========================================================================
  // SUBCHILD 1: TabController - Controls tab switching between General, Profile, Security, Notifications
  // =========================================================================
  TabController = class {
    constructor(parent) {
      this.parent = parent
      this.activeTab = 'general'
    }

    // START: TabController.init - Binds tab click events
    init() {
      const tabBtns = document.querySelectorAll('.settings-tab-btn')
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.getAttribute('data-tab')
          if (tab) this.switchTab(tab)
        })
      })
    }
    // END: TabController.init

    // START: TabController.switchTab - Activates target section and highlights active tab pill
    switchTab(targetTab) {
      this.activeTab = targetTab

      // Hide all sections, reveal selected
      document.querySelectorAll('.settings-section').forEach(sec => sec.classList.add('hidden'))
      const targetSec = document.getElementById(`section-${targetTab}`)
      if (targetSec) targetSec.classList.remove('hidden')

      // Update tab styles
      document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        const isSelected = btn.getAttribute('data-tab') === targetTab
        const iconSpan = btn.querySelector('span:first-child')

        if (isSelected) {
          btn.className = 'settings-tab-btn flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 shadow-2xs whitespace-nowrap cursor-pointer text-left'
          if (iconSpan) {
            iconSpan.className = 'w-6 h-6 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0'
          }
        } else {
          btn.className = 'settings-tab-btn flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 whitespace-nowrap cursor-pointer text-left'
          if (iconSpan) {
            iconSpan.className = 'w-6 h-6 rounded-lg bg-slate-200/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0'
          }
        }
      })
    }
    // END: TabController.switchTab
  }

  // =========================================================================
  // SUBCHILD 2: GeneralController - Handles username, phone, dark mode switch, and rolling counter toggle
  // =========================================================================
  GeneralController = class {
    constructor(parent) {
      this.parent = parent
    }

    // START: GeneralController.init - Binds dark mode toggle live listener
    init() {
      const darkToggle = document.getElementById('set-dark')
      darkToggle?.addEventListener('change', (e) => {
        themeController.apply(e.target.checked ? 'dark' : 'light')
      })
    }
    // END: GeneralController.init

    // START: GeneralController.sync - Loads database and stored values into general controls
    sync(userData = null) {
      const stored = JSON.parse(localStorage.getItem('jn_settings') || '{}')
      const userField = document.getElementById('set-user')
      const phoneField = document.getElementById('set-phone')
      const darkToggle = document.getElementById('set-dark')
      const rollingToggle = document.getElementById('set-rolling')

      if (userField) {
        userField.value = userData?.username || stored.username || 'admin'
      }
      if (phoneField) {
        phoneField.value = userData?.phone || stored.phone || ''
      }
      if (darkToggle) darkToggle.checked = themeController.getTheme() === 'dark'
      if (rollingToggle && stored.isRolling !== undefined) rollingToggle.checked = stored.isRolling
    }
    // END: GeneralController.sync
  }

  // =========================================================================
  // SUBCHILD 3: ProfileController - Handles avatar file upload, preview, full name, role label, and status badge
  // =========================================================================
  ProfileController = class {
    constructor(parent) {
      this.parent = parent
      this.defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    }

    // START: ProfileController.init - Binds avatar file picker and reset button
    init() {
      const fileInput = document.getElementById('avatar-file')
      const previewImg = document.getElementById('avatar-preview')
      const resetBtn = document.getElementById('avatar-reset')

      fileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (loadEvent) => {
          if (previewImg && loadEvent.target?.result) {
            previewImg.setAttribute('src', loadEvent.target.result)
          }
        }
        reader.readAsDataURL(file)
      })

      resetBtn?.addEventListener('click', () => {
        if (previewImg) previewImg.setAttribute('src', this.defaultAvatar)
        if (fileInput) fileInput.value = ''
      })
    }
    // END: ProfileController.init

    // START: ProfileController.sync - Loads profile settings and database roles & status
    sync(userData = null) {
      const stored = JSON.parse(localStorage.getItem('jn_settings') || '{}')
      const nameField = document.getElementById('set-fullname')
      const previewImg = document.getElementById('avatar-preview')
      const roleLabel = document.getElementById('set-role-label')
      const roleDesc = document.getElementById('set-role-desc')
      const statusBadge = document.getElementById('set-status-badge')

      if (nameField) {
        nameField.value = userData?.full_name || stored.fullName || 'Jorgie Alcantara'
      }
      if (previewImg) {
        previewImg.setAttribute('src', userData?.avatar_url || stored.avatarSrc || this.defaultAvatar)
      }

      // Sync Role Label from roles table FK (roles.label)
      if (roleLabel) {
        const roleName = userData?.roles?.label || (userData?.role_id === 0 ? 'System Administrator' : 'Pisonet Unit Owner')
        roleLabel.textContent = roleName
      }
      if (roleDesc) {
        roleDesc.textContent = userData?.role_id === 0 
          ? 'Full read & write clearance across fleet ledgers'
          : 'Restricted view for assigned machine revenue and deductions'
      }

      // Sync Status badge from users table status column
      if (statusBadge) {
        const status = userData?.status || 'Active'
        statusBadge.textContent = status
        if (status === 'Active') {
          statusBadge.className = 'px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/40'
        } else if (status === 'Pending') {
          statusBadge.className = 'px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/40'
        } else {
          statusBadge.className = 'px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300/40'
        }
      }
    }
    // END: ProfileController.sync
  }

  // =========================================================================
  // SUBCHILD 4: SecurityController - Handles master password modification and PIN code management
  // =========================================================================
  SecurityController = class {
    constructor(parent) {
      this.parent = parent
      this.isPinVisible = false
      this.isOldPasswordVerified = false
    }

    // START: SecurityController.init - Binds PIN visibility toggle, old pass validation, and new pass matching
    init() {
      const pinField = document.getElementById('set-pin')
      const pinRevealBtn = document.getElementById('pin-reveal')
      const oldPass = document.getElementById('old-pass')
      const newPass = document.getElementById('new-pass')
      const confirmPass = document.getElementById('confirm-pass')
      const oldFeedback = document.getElementById('old-pass-feedback')
      const matchFeedback = document.getElementById('pass-match-feedback')
      const saveBtn = document.getElementById('save-settings')

      pinRevealBtn?.addEventListener('click', () => {
        this.isPinVisible = !this.isPinVisible
        if (pinField) {
          pinField.setAttribute('type', this.isPinVisible ? 'text' : 'password')
        }
      })

      pinField?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
      })

      // Verification of Old Password against Supabase bcrypt hash
      const verifyOldPass = async () => {
        const val = oldPass?.value.trim()
        if (!val) {
          this.isOldPasswordVerified = false
          if (newPass) {
            newPass.disabled = true
            newPass.value = ''
          }
          if (confirmPass) {
            confirmPass.disabled = true
            confirmPass.value = ''
          }
          if (oldFeedback) {
            oldFeedback.classList.add('hidden')
          }
          return
        }

        const sessionUser = storageManager.session.getUserData() || {}
        const userId = sessionUser.id || storageManager.session.getUserId()

        if (!userId) return

        const res = await usersApi.verifyPassword(userId, val)
        if (res.success) {
          this.isOldPasswordVerified = true
          if (newPass) newPass.disabled = false
          if (confirmPass) confirmPass.disabled = false
          if (oldFeedback) {
            oldFeedback.textContent = '✓ Old password verified. You can now set a new password.'
            oldFeedback.className = 'text-[10px] mt-1 font-semibold text-emerald-600 dark:text-emerald-400'
            oldFeedback.classList.remove('hidden')
          }
        } else {
          this.isOldPasswordVerified = false
          if (newPass) {
            newPass.disabled = true
            newPass.value = ''
          }
          if (confirmPass) {
            confirmPass.disabled = true
            confirmPass.value = ''
          }
          if (oldFeedback) {
            oldFeedback.textContent = '✗ Old password is incorrect.'
            oldFeedback.className = 'text-[10px] mt-1 font-semibold text-rose-500'
            oldFeedback.classList.remove('hidden')
          }
          this.checkSaveState()
        }
      }

      oldPass?.addEventListener('change', verifyOldPass)
      oldPass?.addEventListener('blur', verifyOldPass)

      // Confirm Password Matching Live Check
      const checkPasswordMatch = () => {
        const p1 = newPass?.value.trim() || ''
        const p2 = confirmPass?.value.trim() || ''

        if (!p1 && !p2) {
          if (matchFeedback) matchFeedback.classList.add('hidden')
          this.checkSaveState()
          return
        }

        if (p1.length < 6) {
          if (matchFeedback) {
            matchFeedback.textContent = 'Password must be at least 6 characters.'
            matchFeedback.className = 'text-[10px] mt-1 font-semibold text-amber-500'
            matchFeedback.classList.remove('hidden')
          }
          this.checkSaveState()
          return
        }

        if (p1 !== p2) {
          if (matchFeedback) {
            matchFeedback.textContent = 'Passwords do not match.'
            matchFeedback.className = 'text-[10px] mt-1 font-semibold text-rose-500'
            matchFeedback.classList.remove('hidden')
          }
        } else {
          if (matchFeedback) {
            matchFeedback.textContent = '✓ Passwords match.'
            matchFeedback.className = 'text-[10px] mt-1 font-semibold text-emerald-500'
            matchFeedback.classList.remove('hidden')
          }
        }
        this.checkSaveState()
      }

      newPass?.addEventListener('input', checkPasswordMatch)
      confirmPass?.addEventListener('input', checkPasswordMatch)
    }
    // END: SecurityController.init

    checkSaveState() {
      const saveBtn = document.getElementById('save-settings')
      const oldPass = document.getElementById('old-pass')?.value.trim()
      const newPass = document.getElementById('new-pass')?.value.trim()
      const confirmPass = document.getElementById('confirm-pass')?.value.trim()

      if (oldPass || newPass || confirmPass) {
        // If user touched password change, disable save until old pass verified and new pass matches
        const isValid = this.isOldPasswordVerified && newPass.length >= 6 && newPass === confirmPass
        if (saveBtn) {
          saveBtn.disabled = !isValid
          if (!isValid) {
            saveBtn.classList.add('opacity-50', 'cursor-not-allowed')
          } else {
            saveBtn.classList.remove('opacity-50', 'cursor-not-allowed')
          }
        }
      } else {
        if (saveBtn) {
          saveBtn.disabled = false
          saveBtn.classList.remove('opacity-50', 'cursor-not-allowed')
        }
      }
    }

    // START: SecurityController.sync - Loads stored PIN and resets password inputs
    sync(userData = null) {
      const stored = JSON.parse(localStorage.getItem('jn_settings') || '{}')
      const pinField = document.getElementById('set-pin')
      const oldPass = document.getElementById('old-pass')
      const newPass = document.getElementById('new-pass')
      const confirmPass = document.getElementById('confirm-pass')
      const oldFeedback = document.getElementById('old-pass-feedback')
      const matchFeedback = document.getElementById('pass-match-feedback')
      const saveBtn = document.getElementById('save-settings')

      if (pinField) pinField.value = stored.pin || '1234'
      if (oldPass) oldPass.value = ''
      if (newPass) {
        newPass.value = ''
        newPass.disabled = true
      }
      if (confirmPass) {
        confirmPass.value = ''
        confirmPass.disabled = true
      }
      if (oldFeedback) oldFeedback.classList.add('hidden')
      if (matchFeedback) matchFeedback.classList.add('hidden')
      if (saveBtn) {
        saveBtn.disabled = false
        saveBtn.classList.remove('opacity-50', 'cursor-not-allowed')
      }
      this.isOldPasswordVerified = false
    }
    // END: SecurityController.sync
  }

  // =========================================================================
  // SUBCHILD 5: NotificationsController - Handles in-app audit alerts and SFX audio triggers
  // =========================================================================
  NotificationsController = class {
    constructor(parent) {
      this.parent = parent
    }

    // START: NotificationsController.init - Binds notification switches
    init() {
      // Subchild ready for listeners
    }
    // END: NotificationsController.init

    // START: NotificationsController.sync - Loads notification toggles
    sync() {
      const stored = JSON.parse(localStorage.getItem('jn_settings') || '{}')
      const notifToggle = document.getElementById('set-notif')
      const sfxToggle = document.getElementById('set-sfx')

      if (notifToggle && stored.enableNotif !== undefined) notifToggle.checked = stored.enableNotif
      if (sfxToggle && stored.enableSfx !== undefined) sfxToggle.checked = stored.enableSfx
    }
    // END: NotificationsController.sync
  }
}
// END: SettingsManager
