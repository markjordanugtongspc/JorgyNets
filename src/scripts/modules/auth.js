// START: AuthManager - Handles portal authentication, visibility toggle, and pincode mode
import { authApi, usersApi, storageManager } from '../../api/index.js'
import { AnimationsManager } from './animations.js'

export class AuthManager {
  constructor() {
    this.mode = 'credentials'
    this.isPasswordVisible = false
    this.animations = new AnimationsManager()
    this.passVisibilityController = new this.PassVisibilityController(this)
    this.loginModeController = new this.LoginModeController(this)
    this.validationAnimator = new this.FormValidationAnimator(this)
    this.authGuard = new this.AuthGuardController(this)
  }

  // START: AuthManager.init - Initializes subchild controllers, restores saved credentials, and binds form
  init() {
    this.passVisibilityController.init()
    this.loginModeController.init()
    this.restoreRememberedCredentials()
    this.bindForm()
    this.checkRedirectError()
  }
  // END: AuthManager.init - Controllers and form ready

  // START: AuthManager.restoreRememberedCredentials - Prepopulates saved credentials from client cookies/storage
  restoreRememberedCredentials() {
    try {
      const saved = storageManager.cookie.get('remember_auth') || storageManager.local.get('remember_auth')
      if (!saved) return

      const rememberCheck = document.getElementById('remember-check')
      if (rememberCheck) rememberCheck.checked = true

      if (saved.mode === 'pincode') {
        const pinBtn = document.getElementById('pin-btn')
        pinBtn?.click()
        const passField = document.getElementById('pass-field')
        if (passField && saved.pin) {
          passField.value = atob(saved.pin)
        }
      } else {
        const userField = document.getElementById('user-field')
        const passField = document.getElementById('pass-field')
        if (userField && saved.user) {
          userField.value = atob(saved.user)
        }
        if (passField && saved.pass) {
          passField.value = atob(saved.pass)
        }
      }
    } catch (e) {
      console.warn('[AuthManager] Could not restore saved credentials:', e)
    }
  }

  // START: AuthManager.saveRememberedCredentials - Saves or removes credentials based on remember-check
  saveRememberedCredentials({ username, password, isPinMode }) {
    try {
      const rememberCheck = document.getElementById('remember-check')
      if (rememberCheck && rememberCheck.checked) {
        const payload = isPinMode
          ? { mode: 'pincode', pin: btoa(password) }
          : { mode: 'credentials', user: btoa(username), pass: btoa(password) }
        
        // Save to cookie (30 days) and local storage backup
        storageManager.cookie.set('remember_auth', payload, 30)
        storageManager.local.set('remember_auth', payload)
      } else {
        storageManager.cookie.remove('remember_auth')
        storageManager.local.remove('remember_auth')
      }
    } catch (e) {
      console.warn('[AuthManager] Could not save credentials:', e)
    }
  }

  checkRedirectError() {
    const errorMsg = sessionStorage.getItem('jn_auth_error')
    if (errorMsg) {
      sessionStorage.removeItem('jn_auth_error')
      const errorBox = document.getElementById('login-error')
      if (errorBox) {
        errorBox.textContent = errorMsg
        errorBox.classList.remove('hidden')
      }
    }
  }

  // START: AuthManager.bindForm - Authenticates via Supabase Backend with bcrypt verification
  bindForm() {
    const form = document.getElementById('login-form')
    const errorBox = document.getElementById('login-error')
    const loginBtn = document.getElementById('login-btn')

    form?.addEventListener('submit', async (e) => {
      e.preventDefault()

      if (errorBox) {
        errorBox.classList.add('hidden')
        errorBox.textContent = ''
      }

      const isPinMode = this.mode === 'pincode'
      let username = document.getElementById('user-field')?.value.trim() || ''
      const password = document.getElementById('pass-field')?.value || ''

      if (isPinMode) {
        // If pin mode was selected, check if user typed an admin pin or fallback
        if (password === '1234' || password === '09269958724') {
          username = 'admin'
        }
      }

      if (!username && !isPinMode) {
        this.validationAnimator.animateField('username', 'Please enter your username.')
        return
      }

      if (!password) {
        this.validationAnimator.animateField(
          isPinMode ? 'pincode' : 'password',
          isPinMode ? 'Please enter your pincode.' : 'Please enter your password.'
        )
        return
      }

      // UI Loading state
      const originalBtnText = loginBtn ? loginBtn.innerHTML : 'Sign In'
      if (loginBtn) {
        loginBtn.disabled = true
        loginBtn.innerHTML = `
          <span class="inline-flex items-center gap-2">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Signing In...
          </span>
        `
      }

      try {
        const result = await authApi.login({ username, password })

        if (!result.success) {
          const isPin = this.mode === 'pincode'
          const errorMsg = result.error || 'Invalid credentials. Please verify your login details.'
          
          if (isPin) {
            this.validationAnimator.animateField('pincode', 'Pincode is incorrect.')
          } else if (result.field === 'username' || errorMsg.toLowerCase().includes('username')) {
            this.validationAnimator.animateField('username', 'Username is incorrect.')
          } else if (result.field === 'password' || errorMsg.toLowerCase().includes('password')) {
            this.validationAnimator.animateField('password', 'Password is incorrect.')
          } else {
            this.validationAnimator.animateField('password', errorMsg)
          }

          if (loginBtn) {
            loginBtn.disabled = false
            loginBtn.innerHTML = originalBtnText
          }
          return
        }

        // Save or update remembered credentials if remember-check is checked
        this.saveRememberedCredentials({ username, password, isPinMode })

        // Redirect based on database role
        const roleId = Number(result.user?.role_id ?? 1)
        if (roleId === 0) {
          window.location.href = '/frontend/pages/dashboard/'
        } else {
          window.location.href = '/frontend/users/dashboard/'
        }
      } catch {
        this.validationAnimator.animateField(
          this.mode === 'pincode' ? 'pincode' : 'password',
          'Unable to connect to database service. Please check your internet connection.'
        )
        if (loginBtn) {
          loginBtn.disabled = false
          loginBtn.innerHTML = originalBtnText
        }
      }
    })
  }
  // END: AuthManager.bindForm - Submit handler attached

  // START: FormValidationAnimator - Handles field shakes, border color transitions, and error alert rendering
  FormValidationAnimator = class {
    constructor(parent) {
      this.parent = parent
    }

    animateField(field, message) {
      const errorBox = document.getElementById('login-error')
      const isPin = this.parent.mode === 'pincode'

      if (errorBox) {
        errorBox.textContent = message
        errorBox.classList.remove('hidden')
      }

      if (field === 'username' && !isPin) {
        const userField = document.getElementById('user-field')
        const userLabel = document.querySelector('label[for="user-field"]')
        this.parent.animations.shake.shake(userField, userLabel)
        userField?.focus()
      } else {
        // password or pincode
        const passWrapper = document.getElementById('pass-wrapper')
        const passLabel = document.querySelector('label[for="pass-field"]')
        this.parent.animations.shake.shake(passWrapper, passLabel)
        document.getElementById('pass-field')?.focus()
      }
    }
  }
  // END: FormValidationAnimator

  // START: AuthManager.logout - Clears all user credentials and redirects to login root
  static logout() {
    authApi.logout()
  }
  // END: AuthManager.logout - Session destroyed and redirected

  // START: PassVisibilityController - Toggles password masking and eye icon
  PassVisibilityController = class {
    constructor(parent) {
      this.parent = parent
    }

    init() {
      const toggleBtn = document.getElementById('toggle-pass')
      const passField = document.getElementById('pass-field')
      const eyeIcon = document.getElementById('eye-icon')

      toggleBtn?.addEventListener('click', () => {
        this.parent.isPasswordVisible = !this.parent.isPasswordVisible
        const isVisible = this.parent.isPasswordVisible

        if (passField) {
          passField.setAttribute('type', isVisible ? 'text' : 'password')
        }

        if (eyeIcon) {
          eyeIcon.innerHTML = isVisible
            ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"></path>`
            : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>`
        }
      })
    }
  }

  // START: LoginModeController - Toggles between username/password and pincode mode
  LoginModeController = class {
    constructor(parent) {
      this.parent = parent
      this.staticSvg = `<g id="_21-Password" data-name="21-Password"><path d="m152.724 106.649a37.325 37.325 0 1 1 37.324-37.325 37.367 37.367 0 0 1 -37.324 37.325zm0-54.649a17.325 17.325 0 1 0 17.324 17.324 17.344 17.344 0 0 0 -17.324-17.324z"/><path d="m252.782 106.649a37.325 37.325 0 1 1 37.325-37.325 37.367 37.367 0 0 1 -37.325 37.325zm0-54.649a17.325 17.325 0 1 0 17.325 17.324 17.343 17.343 0 0 0 -17.325-17.324z"/><path d="m352.841 106.649a37.325 37.325 0 1 1 37.324-37.325 37.367 37.367 0 0 1 -37.324 37.325zm0-54.649a17.325 17.325 0 1 0 17.324 17.324 17.344 17.344 0 0 0 -17.324-17.324z"/><path d="m152.724 203.155a37.325 37.325 0 1 1 37.324-37.324 37.367 37.367 0 0 1 -37.324 37.324zm0-54.649a17.325 17.325 0 1 0 17.324 17.325 17.345 17.345 0 0 0 -17.324-17.325z"/><path d="m352.841 203.155a37.325 37.325 0 1 1 37.324-37.324 37.366 37.366 0 0 1 -37.324 37.324zm0-54.649a17.325 17.325 0 1 0 17.324 17.325 17.344 17.344 0 0 0 -17.324-17.325z"/><path d="m378.884 289.089a37.333 37.333 0 1 0 -62.35-18.1 30.267 30.267 0 0 0 -33.772-9.345v-57.622a30.112 30.112 0 0 0 -2.789-12.674 37.3 37.3 0 1 0 -54.834-.446 30.119 30.119 0 0 0 -2.991 13.12v103.07l-20.547-13.2q-.354-.228-.728-.426a57.205 57.205 0 0 0 -20.248-6.375 37.307 37.307 0 1 0 -36.059 11.662c-6.1 6-11.33 14.235-11.169 23.049a21.915 21.915 0 0 0 .609 4.729 37.331 37.331 0 1 0 52.251 48.684 174.76 174.76 0 0 1 33.681 54.294c10.671 27.266 10.9 48.306 10.9 48.491a10 10 0 0 0 10 10h123.505a10 10 0 0 0 9.689-7.528c3.036-11.9 8.425-25.056 13.635-37.778 8.325-20.326 16.934-41.344 16.934-59.606v-64.04a30.353 30.353 0 0 0 -25.717-29.959zm-26.043-44.076a17.329 17.329 0 0 1 6.765 33.281 19.2 19.2 0 0 1 -8.507 1.522 30.156 30.156 0 0 0 -9.778-4.551 17.317 17.317 0 0 1 11.52-30.252zm-100.059-96.507a17.307 17.307 0 0 1 13.267 28.442 30.242 30.242 0 0 0 -26.735-.232 17.316 17.316 0 0 1 13.468-28.21zm-117.382 113.831a17.325 17.325 0 1 1 17.325 17.325 17.344 17.344 0 0 1 -17.325-17.325zm17.325 113.831a17.329 17.329 0 0 1 -5.578-33.735 204.588 204.588 0 0 1 22.872 17 17.332 17.332 0 0 1 -17.295 16.735zm216.435 58.946c-4.441 10.843-9 21.986-12.374 32.886h-106.643a183.23 183.23 0 0 0 -11.228-44.873c-10.812-28.038-33.947-67.919-82.769-98.684-1.019-.642-2.731-1.886-2.752-3.007-.046-2.541 3.662-7.94 9.058-11.623 4.442-3.031 16.12-5.359 28.714 1.147l30.982 19.9v7.487a10 10 0 0 0 20 0v-134.325a10.307 10.307 0 0 1 20.614 0v106.548a10 10 0 0 0 20 0v-20.43a10.307 10.307 0 1 1 20.613 0v36.305a10 10 0 0 0 20 0v-21.851a10.307 10.307 0 0 1 20.613 0v36.306a10 10 0 0 0 20 0v-21.852a10.307 10.307 0 0 1 20.613 0v64.04c-.001 14.325-7.85 33.491-15.442 52.026z"/></g>`
      this.dynamicSvg = `<g id="_21-Password" data-name="21-Password"><path d="m152.724 106.649a37.325 37.325 0 1 1 37.324-37.325 37.367 37.367 0 0 1 -37.324 37.325z"/><path d="m252.782 106.649a37.325 37.325 0 1 1 37.325-37.325 37.367 37.367 0 0 1 -37.325 37.325zm0-54.649a17.325 17.325 0 1 0 17.325 17.324 17.343 17.343 0 0 0 -17.325-17.324z"/><path d="m352.841 106.649a37.325 37.325 0 1 1 37.324-37.325 37.367 37.367 0 0 1 -37.324 37.325z"/><path d="m152.724 203.155a37.325 37.325 0 1 1 37.324-37.324 37.367 37.367 0 0 1 -37.324 37.324zm0-54.649a17.325 17.325 0 1 0 17.324 17.325 17.345 17.345 0 0 0 -17.324-17.325z"/><path d="m352.841 203.155a37.325 37.325 0 1 1 37.324-37.324 37.366 37.366 0 0 1 -37.324 37.324zm0-54.649a17.325 17.325 0 1 0 17.324 17.325 17.344 17.344 0 0 0 -17.324-17.325z"/><path d="m378.884 289.089a37.333 37.333 0 1 0 -62.35-18.1 30.267 30.267 0 0 0 -33.772-9.345v-57.622a30.112 30.112 0 0 0 -2.789-12.674 37.3 37.3 0 1 0 -54.834-.446 30.119 30.119 0 0 0 -2.991 13.12v103.07l-20.547-13.2q-.354-.228-.728-.426a57.205 57.205 0 0 0 -20.248-6.375 37.307 37.307 0 1 0 -36.059 11.662c-6.1 6-11.33 14.235-11.169 23.049a21.915 21.915 0 0 0 .609 4.729 37.331 37.331 0 1 0 52.251 48.684 174.76 174.76 0 0 1 33.681 54.294c10.671 27.266 10.9 48.306 10.9 48.491a10 10 0 0 0 10 10h123.505a10 10 0 0 0 9.689-7.528c3.036-11.9 8.425-25.056 13.635-37.778 8.325-20.326 16.934-41.344 16.934-59.606v-64.04a30.353 30.353 0 0 0 -25.717-29.959zm-226.16 87.079a17.329 17.329 0 0 1 -5.578-33.735 204.588 204.588 0 0 1 22.872 17 17.332 17.332 0 0 1 -17.294 16.735zm216.435 58.946c-4.441 10.843-9 21.986-12.374 32.886h-106.642a183.23 183.23 0 0 0 -11.228-44.873c-10.812-28.038-33.947-67.919-82.769-98.684-1.019-.642-2.731-1.886-2.752-3.007-.046-2.541 3.662-7.94 9.058-11.623 4.442-3.031 16.12-5.359 28.714 1.147l30.982 19.9v7.487a10 10 0 0 0 20 0v-134.325a10.307 10.307 0 0 1 20.614 0v106.548a10 10 0 0 0 20 0v-20.43a10.307 10.307 0 1 1 20.613 0v36.305a10 10 0 0 0 20 0v-21.851a10.307 10.307 0 0 1 20.613 0v36.306a10 10 0 0 0 20 0v-21.852a10.307 10.307 0 0 1 20.613 0v64.04c-.001 14.325-7.85 33.491-15.442 52.026z"/></g>`
      this.credStaticSvg = `<g><g><g><path d="M469.333,149.333H42.667C19.135,149.333,0,168.469,0,192v128c0,23.531,19.135,42.667,42.667,42.667h426.667 C492.865,362.667,512,343.531,512,320V192C512,168.469,492.865,149.333,469.333,149.333z M490.667,320 c0,11.76-9.573,21.333-21.333,21.333H42.667c-11.76,0-21.333-9.573-21.333-21.333V192c0-11.76,9.573-21.333,21.333-21.333 h426.667c11.76,0,21.333,9.573,21.333,21.333V320z"/><path d="M132.948,234.667c-2.958-5.125-9.51-6.844-14.573-3.906l-11.708,6.76V224c0-5.896-4.771-10.667-10.667-10.667 S85.333,218.104,85.333,224v13.521l-11.708-6.76c-5.094-2.938-11.625-1.219-14.573,3.906c-2.948,5.104-1.198,11.625,3.906,14.573 L74.665,256l-11.707,6.76c-5.104,2.948-6.854,9.469-3.906,14.573c1.979,3.427,5.563,5.333,9.25,5.333 c1.813,0,3.646-0.458,5.323-1.427l11.708-6.76V288c0,5.896,4.771,10.667,10.667,10.667s10.667-4.771,10.667-10.667v-13.521 l11.708,6.76c1.677,0.969,3.51,1.427,5.323,1.427c3.688,0,7.271-1.906,9.25-5.333c2.948-5.104,1.198-11.625-3.906-14.573 L117.335,256l11.707-6.76C134.146,246.292,135.896,239.771,132.948,234.667z"/><path d="M239.615,234.667c-2.969-5.125-9.5-6.844-14.573-3.906l-11.708,6.76V224c0-5.896-4.771-10.667-10.667-10.667 c-5.896,0-10.667,4.771-10.667,10.667v13.521l-11.708-6.76c-5.104-2.938-11.635-1.219-14.573,3.906 c-2.948,5.104-1.198,11.625,3.906,14.573l11.707,6.76l-11.707,6.76c-5.104,2.948-6.854,9.469-3.906,14.573 c1.979,3.427,5.563,5.333,9.25,5.333c1.813,0,3.646-0.458,5.323-1.427l11.708-6.76V288c0,5.896,4.771,10.667,10.667,10.667 c5.896,0,10.667-4.771,10.667-10.667v-13.521l11.708,6.76c1.677,0.969,3.51,1.427,5.323,1.427c3.688,0,7.271-1.906,9.25-5.333 c2.948-5.104,1.198-11.625-3.906-14.573L224.001,256l11.707-6.76C240.813,246.292,242.563,239.771,239.615,234.667z"/><path d="M346.281,234.667c-2.958-5.125-9.51-6.844-14.573-3.906L320,237.521V224c0-5.896-4.771-10.667-10.667-10.667 c-5.896,0-10.667,4.771-10.667,10.667v13.521l-11.708-6.76c-5.094-2.938-11.625-1.219-14.573,3.906 c-2.948,5.104-1.198,11.625,3.906,14.573l11.707,6.76l-11.707,6.76c-5.104,2.948-6.854,9.469-3.906,14.573 c1.979,3.427,5.563,5.333,9.25,5.333c1.813,0,3.646-0.458,5.323-1.427l11.708-6.76V288c0,5.896,4.771,10.667,10.667,10.667 c5.896,0,10.667-4.771,10.667-10.667v-13.521l11.708,6.76c1.677,0.969,3.51,1.427,5.323,1.427c3.688,0,7.271-1.906,9.25-5.333 c2.948-5.104,1.198-11.625-3.906-14.573L330.668,256l11.707-6.76C347.479,246.292,349.229,239.771,346.281,234.667z"/><path d="M452.948,234.667c-2.948-5.125-9.5-6.844-14.573-3.906l-11.708,6.76V224c0-5.896-4.771-10.667-10.667-10.667 c-5.896,0-10.667,4.771-10.667,10.667v13.521l-11.708-6.76c-5.115-2.938-11.615-1.219-14.573,3.906 c-2.948,5.104-1.198,11.625,3.906,14.573l11.707,6.76l-11.707,6.76c-5.104,2.948-6.854,9.469-3.906,14.573 c1.979,3.427,5.563,5.333,9.25,5.333c1.813,0,3.646-0.458,5.323-1.427l11.708-6.76V288c0,5.896,4.771,10.667,10.667,10.667 c5.896,0,10.667-4.771,10.667-10.667v-13.521l11.708,6.76c1.677,0.969,3.51,1.427,5.323,1.427c3.688,0,7.271-1.906,9.25-5.333 c2.948-5.104,1.198-11.625-3.906-14.573L437.335,256l11.707-6.76C454.146,246.292,455.896,239.771,452.948,234.667z"/></g></g></g>`
      this.credDynamicSvg = `<g><g><path d="M469.333,149.333H42.667C19.135,149.333,0,168.469,0,192v128c0,23.531,19.135,42.667,42.667,42.667h426.667 C492.865,362.667,512,343.531,512,320V192C512,168.469,492.865,149.333,469.333,149.333z M129.042,262.76 c5.104,2.948,6.854,9.469,3.906,14.573c-1.979,3.427-5.563,5.333-9.25,5.333c-1.813,0-3.646-0.458-5.323-1.427l-11.708-6.76V288 c0,5.896-4.771,10.667-10.667,10.667S85.333,293.896,85.333,288v-13.521l-11.708,6.76c-1.677,0.969-3.51,1.427-5.323,1.427 c-3.688,0-7.271-1.906-9.25-5.333c-2.948-5.104-1.198-11.625,3.906-14.573L74.665,256l-11.707-6.76 c-5.104-2.948-6.854-9.469-3.906-14.573c2.948-5.125,9.479-6.844,14.573-3.906l11.708,6.76V224 c0-5.896,4.771-10.667,10.667-10.667s10.667,4.771,10.667,10.667v13.521l11.708-6.76c5.063-2.938,11.615-1.219,14.573,3.906 c2.948,5.104,1.198,11.625-3.906,14.573L117.335,256L129.042,262.76z M235.708,262.76c5.104,2.948,6.854,9.469,3.906,14.573 c-1.979,3.427-5.563,5.333-9.25,5.333c-1.813,0-3.646-0.458-5.323-1.427l-11.708-6.76V288c0,5.896-4.771,10.667-10.667,10.667 c-5.896,0-10.667-4.771-10.667-10.667v-13.521l-11.708,6.76c-1.677,0.969-3.51,1.427-5.323,1.427c-3.688,0-7.271-1.906-9.25-5.333 c-2.948-5.104-1.198-11.625-3.906-14.573l11.707-6.76l-11.707-6.76c-5.104-2.948-6.854-9.469-3.906-14.573 c2.938-5.125,9.469-6.844,14.573-3.906l11.708,6.76V224c0-5.896,4.771-10.667,10.667-10.667c5.896,0,10.667,4.771,10.667,10.667 v13.521l11.708-6.76c5.073-2.938,11.604-1.219,14.573,3.906c2.948,5.104,1.198,11.625-3.906,14.573L224.001,256L235.708,262.76z M342.375,262.76c5.104,2.948,6.854,9.469,3.906,14.573c-1.979,3.427-5.563,5.333-9.25,5.333c-1.813,0-3.646-0.458-5.323-1.427 L320,274.479V288c0,5.896-4.771,10.667-10.667,10.667c-5.896,0-10.667-4.771-10.667-10.667v-13.521l-11.708,6.76 c-1.677,0.969-3.51,1.427-5.323,1.427c-3.688,0-7.271-1.906-9.25-5.333c-2.948-5.104-1.198-11.625,3.906-14.573l11.707-6.76 l-11.707-6.76c-5.104-2.948-6.854-9.469-3.906-14.573c2.948-5.125,9.479-6.844,14.573-3.906l11.708,6.76V224 c0-5.896,4.771-10.667,10.667-10.667c5.896,0,10.667,4.771,10.667,10.667v13.521l11.708-6.76 c5.063-2.938,11.615-1.219,14.573,3.906c2.948,5.104,1.198,11.625-3.906,14.573L330.668,256L342.375,262.76z M449.042,262.76 c5.104,2.948,6.854,9.469,3.906,14.573c-1.979,3.427-5.563,5.333-9.25,5.333c-1.813,0-3.646-0.458-5.323-1.427l-11.708-6.76V288 c0,5.896-4.771,10.667-10.667,10.667c-5.896,0-10.667-4.771-10.667-10.667v-13.521l-11.708,6.76 c-1.677,0.969-3.51,1.427-5.323,1.427c-3.688,0-7.271-1.906-9.25-5.333c-2.948-5.104-1.198-11.625,3.906-14.573l11.707-6.76 l-11.707-6.76c-5.104-2.948-6.854-9.469-3.906-14.573c2.958-5.125,9.458-6.844,14.573-3.906l11.708,6.76V224 c0-5.896,4.771-10.667,10.667-10.667c5.896,0,10.667,4.771,10.667,10.667v13.521l11.708-6.76 c5.073-2.938,11.625-1.219,14.573,3.906c2.948,5.104,1.198,11.625-3.906,14.573L437.335,256L449.042,262.76z"/></g></g>`
    }

    init() {
      const pinBtn = document.getElementById('pin-btn')
      const pinText = document.getElementById('pin-text')
      const userGroup = document.getElementById('user-group')
      const userField = document.getElementById('user-field')
      const passField = document.getElementById('pass-field')
      const passLabel = document.getElementById('pass-label')
      const forgotLink = document.getElementById('forgot-link')
      const pinSvg = document.getElementById('pin-svg')

      pinBtn?.addEventListener('mouseenter', () => {
        if (pinSvg) {
          if (this.parent.mode === 'pincode') {
            pinSvg.setAttribute('viewBox', '0 0 512 512')
            pinSvg.innerHTML = this.credDynamicSvg
          } else {
            pinSvg.setAttribute('viewBox', '0 0 520 520')
            pinSvg.innerHTML = this.dynamicSvg
          }
        }
      })

      pinBtn?.addEventListener('mouseleave', () => {
        if (pinSvg) {
          if (this.parent.mode === 'pincode') {
            pinSvg.setAttribute('viewBox', '0 0 512 512')
            pinSvg.innerHTML = this.credStaticSvg
          } else {
            pinSvg.setAttribute('viewBox', '0 0 520 520')
            pinSvg.innerHTML = this.staticSvg
          }
        }
      })

      pinBtn?.addEventListener('click', () => {
        this.parent.mode = this.parent.mode === 'credentials' ? 'pincode' : 'credentials'
        const isPin = this.parent.mode === 'pincode'

        if (isPin) {
          userGroup?.classList.add('hidden')
          userField?.removeAttribute('required')
          
          if (passLabel) passLabel.textContent = 'Pincode'
          if (forgotLink) forgotLink.textContent = 'Forgot pincode?'
          if (passField) {
            passField.setAttribute('placeholder', 'Enter Admin Pin or Terminal Pin')
            passField.setAttribute('inputmode', 'numeric')
          }
          if (pinText) pinText.textContent = 'Use Credentials'
          if (pinSvg) {
            pinSvg.setAttribute('viewBox', '0 0 512 512')
            pinSvg.innerHTML = this.credStaticSvg
          }
        } else {
          userGroup?.classList.remove('hidden')
          userField?.setAttribute('required', 'true')

          if (passLabel) passLabel.textContent = 'Password'
          if (forgotLink) forgotLink.textContent = 'Forgot password?'
          if (passField) {
            passField.setAttribute('placeholder', '••••••••')
            passField.removeAttribute('inputmode')
          }
          if (pinText) pinText.textContent = 'Pincode'
          if (pinSvg) {
            pinSvg.setAttribute('viewBox', '0 0 520 520')
            pinSvg.innerHTML = this.staticSvg
          }
        }
      })
    }
  }

  // SUBCHILD CLASS: UserAccountController - communicates directly with Supabase via usersApi
  UserAccountController = class {
    constructor(parent) {
      this.parent = parent
      this.defaultPassword = '@JorgyPisonets#123'
      this.cachedUsers = []
    }

    // Live query from backend Supabase
    async fetchUsers() {
      const res = await usersApi.getAll()
      if (res.success && Array.isArray(res.data)) {
        this.cachedUsers = res.data.map((u) => ({
          id: u.id,
          name: u.full_name,
          username: u.username,
          phone: u.phone || '0917-000-0000',
          category: u.category,
          units: u.units,
          role: u.roles?.label || (u.role_id === 0 ? 'Admin' : 'Owner'),
          status: u.status,
          dateCreated: u.created_at ? u.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          avatar: u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        }))
        return this.cachedUsers
      }
      return this.cachedUsers
    }

    getUsers() {
      return this.cachedUsers
    }

    generateUsername(name) {
      if (!name) return 'user'
      const clean = name.replace(/\(.*?\)/g, '').trim()
      const parts = clean.split(/\s+/).filter(Boolean)
      const honorifics = ['kuya', 'boss', 'ate', 'nanay', 'uncle', 'tita', 'tito', 'tatay']
      let first = parts[0] || 'user'
      if (parts.length > 1 && honorifics.includes(first.toLowerCase())) {
        first = parts[1]
      }
      return first.toLowerCase().replace(/[^a-z0-9]/g, '')
    }

    async createUser(data = {}) {
      const name = data.name || 'New Unit Owner'
      const username = data.username || this.generateUsername(name)
      const password = data.password || this.defaultPassword
      const phone = data.phone || '0917-000-0000'
      const category = data.category || 'VIP Gaming Rig'
      const units = data.units || '1 Unit'
      const status = data.status || 'Pending'
      const avatar = data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      const dateCreated = data.dateCreated || new Date().toISOString().slice(0, 10)

      const res = await usersApi.create({
        username,
        password,
        full_name: name,
        phone,
        category,
        units,
        status,
        dateCreated,
        avatar_url: avatar
      })

      if (res.success && res.data) {
        await this.fetchUsers()
        return res.data
      }
      return null
    }

    async updateUser(id, updates = {}) {
      const res = await usersApi.update(id, updates)
      if (res.success) {
        await this.fetchUsers()
        return res.data
      }
      return null
    }

    async deleteUser(id) {
      const res = await usersApi.delete(id)
      if (res.success) {
        await this.fetchUsers()
        return true
      }
      return false
    }
  }

  // =========================================================================
  // SUBCHILD 5: AuthGuardController - Protects /frontend/pages/ & /frontend/users/ routes
  // Blur masks page content immediately and redirects unauthorized users to login portal
  // =========================================================================
  AuthGuardController = class {
    constructor(parent) {
      this.parent = parent
      this.overlayId = 'jn-auth-guard-overlay'
    }

    protect() {
      const path = window.location.pathname
      const isProtected = path.includes('/frontend/pages') || path.includes('/frontend/users')
      if (!isProtected) return true

      // Session Persistence Fix: Recover session from persistent storage on reload/refresh
      this.restoreSessionOnRefresh()

      const validation = authApi.validateRouteAccess(path)
      if (!validation.allowed) {
        this.renderShield()
        if (validation.reason) {
          sessionStorage.setItem('jn_auth_error', validation.reason)
        }
        window.location.replace(validation.redirectTo)
        return false
      }
      return true
    }

    // START: AuthGuardController.restoreSessionOnRefresh - Ensures refreshing or reloading maintains session
    restoreSessionOnRefresh() {
      try {
        const rawRole = sessionStorage.getItem('jn_session_role')
        const rawUser = sessionStorage.getItem('jn_session_user')
        if (!rawRole || !rawUser) {
          const backupRaw = localStorage.getItem('jn_auth_session')
          if (backupRaw) {
            const backup = JSON.parse(backupRaw)
            if (backup && backup.role !== undefined && backup.id) {
              sessionStorage.setItem('jn_session_role', String(backup.role))
              sessionStorage.setItem('jn_session_user', backup.user || '')
              sessionStorage.setItem('jn_session_user_id', backup.id)
              sessionStorage.setItem('jn_session_username', backup.username || '')
              storageManager.session.set('role', String(backup.role))
              storageManager.session.set('user', backup.user || '')
              storageManager.session.set('user_id', backup.id)
              storageManager.session.set('username', backup.username || '')
              storageManager.session.set('units', backup.units || '')
              storageManager.session.set('avatar', backup.avatar || '')
            }
          }
        }
      } catch (err) {
        console.warn('[AuthManager] Session restore check on refresh:', err)
      }
    }
    // END: AuthGuardController.restoreSessionOnRefresh

    renderShield() {
      // Instantly blur and hide all page contents
      const existing = document.getElementById(this.overlayId)
      if (existing) return

      const overlay = document.createElement('div')
      overlay.id = this.overlayId
      overlay.className = 'fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none'
      overlay.innerHTML = `
        <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-pulse">
          <div class="w-12 h-12 mx-auto rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <svg class="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div class="space-y-2">
            <div class="h-4 bg-slate-700/60 rounded-full w-3/4 mx-auto"></div>
            <div class="h-3 bg-slate-800 rounded-full w-1/2 mx-auto"></div>
          </div>
          <p class="text-xs font-semibold text-slate-400">Authenticating JorgyNets secure clearance...</p>
        </div>
      `
      document.body.prepend(overlay)
    }
  }

  static logout(reason = null) {
    authApi.logout(reason)
  }
}

export const userAccountManager = new (new AuthManager()).UserAccountController()
