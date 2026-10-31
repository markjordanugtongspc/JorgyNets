// START: AuthManager - Handles portal authentication, visibility toggle, and pincode mode
export class AuthManager {
  constructor() {
    this.mode = 'credentials'
    this.isPasswordVisible = false
    this.passVisibilityController = new this.PassVisibilityController(this)
    this.loginModeController = new this.LoginModeController(this)
  }

  // START: AuthManager.init - Initializes subchild controllers and binds form
  init() {
    this.passVisibilityController.init()
    this.loginModeController.init()
    this.bindForm()
  }
  // END: AuthManager.init - Controllers and form ready

  // START: AuthManager.bindForm - Redirects on login form submit
  bindForm() {
    const form = document.getElementById('login-form')
    form?.addEventListener('submit', (e) => {
      e.preventDefault()
      sessionStorage.setItem('jn_session_user', 'Admin Jorgie')
      sessionStorage.setItem('jn_session_role', 'Administrator')
      window.location.href = '/frontend/pages/dashboard/'
    })
  }
  // END: AuthManager.bindForm - Submit handler attached

  // START: AuthManager.logout - Clears all user credentials and redirects to login root
  static logout() {
    sessionStorage.clear()
    localStorage.removeItem('jn_token')
    localStorage.removeItem('jn_user')
    window.location.href = '/'
  }
  // END: AuthManager.logout - Session destroyed and redirected

  // START: PassVisibilityController - Toggles password masking and eye icon
  PassVisibilityController = class {
    constructor(parent) {
      this.parent = parent
    }

    // START: PassVisibilityController.init - Attaches click listener to toggle pass visibility
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
    // END: PassVisibilityController.init - Pass visibility listener bound
  }
  // END: PassVisibilityController - Subchild ready

  // START: LoginModeController - Toggles between username/password and pincode mode
  LoginModeController = class {
    constructor(parent) {
      this.parent = parent
      // Static / Default 520x520 Keypad Password SVG Markup (Outline nodes)
      this.staticSvg = `<g id="_21-Password" data-name="21-Password"><path d="m152.724 106.649a37.325 37.325 0 1 1 37.324-37.325 37.367 37.367 0 0 1 -37.324 37.325zm0-54.649a17.325 17.325 0 1 0 17.324 17.324 17.344 17.344 0 0 0 -17.324-17.324z"/><path d="m252.782 106.649a37.325 37.325 0 1 1 37.325-37.325 37.367 37.367 0 0 1 -37.325 37.325zm0-54.649a17.325 17.325 0 1 0 17.325 17.324 17.343 17.343 0 0 0 -17.325-17.324z"/><path d="m352.841 106.649a37.325 37.325 0 1 1 37.324-37.325 37.367 37.367 0 0 1 -37.324 37.325zm0-54.649a17.325 17.325 0 1 0 17.324 17.324 17.344 17.344 0 0 0 -17.324-17.324z"/><path d="m152.724 203.155a37.325 37.325 0 1 1 37.324-37.324 37.367 37.367 0 0 1 -37.324 37.324zm0-54.649a17.325 17.325 0 1 0 17.324 17.325 17.345 17.345 0 0 0 -17.324-17.325z"/><path d="m352.841 203.155a37.325 37.325 0 1 1 37.324-37.324 37.366 37.366 0 0 1 -37.324 37.324zm0-54.649a17.325 17.325 0 1 0 17.324 17.325 17.344 17.344 0 0 0 -17.324-17.325z"/><path d="m378.884 289.089a37.333 37.333 0 1 0 -62.35-18.1 30.267 30.267 0 0 0 -33.772-9.345v-57.622a30.112 30.112 0 0 0 -2.789-12.674 37.3 37.3 0 1 0 -54.834-.446 30.119 30.119 0 0 0 -2.991 13.12v103.07l-20.547-13.2q-.354-.228-.728-.426a57.205 57.205 0 0 0 -20.248-6.375 37.307 37.307 0 1 0 -36.059 11.662c-6.1 6-11.33 14.235-11.169 23.049a21.915 21.915 0 0 0 .609 4.729 37.331 37.331 0 1 0 52.251 48.684 174.76 174.76 0 0 1 33.681 54.294c10.671 27.266 10.9 48.306 10.9 48.491a10 10 0 0 0 10 10h123.505a10 10 0 0 0 9.689-7.528c3.036-11.9 8.425-25.056 13.635-37.778 8.325-20.326 16.934-41.344 16.934-59.606v-64.04a30.353 30.353 0 0 0 -25.717-29.959zm-26.043-44.076a17.329 17.329 0 0 1 6.765 33.281 19.2 19.2 0 0 1 -8.507 1.522 30.156 30.156 0 0 0 -9.778-4.551 17.317 17.317 0 0 1 11.52-30.252zm-100.059-96.507a17.307 17.307 0 0 1 13.267 28.442 30.242 30.242 0 0 0 -26.735-.232 17.316 17.316 0 0 1 13.468-28.21zm-117.382 113.831a17.325 17.325 0 1 1 17.325 17.325 17.344 17.344 0 0 1 -17.325-17.325zm17.325 113.831a17.329 17.329 0 0 1 -5.578-33.735 204.588 204.588 0 0 1 22.872 17 17.332 17.332 0 0 1 -17.295 16.735zm216.435 58.946c-4.441 10.843-9 21.986-12.374 32.886h-106.643a183.23 183.23 0 0 0 -11.228-44.873c-10.812-28.038-33.947-67.919-82.769-98.684-1.019-.642-2.731-1.886-2.752-3.007-.046-2.541 3.662-7.94 9.058-11.623 4.442-3.031 16.12-5.359 28.714 1.147l30.982 19.9v7.487a10 10 0 0 0 20 0v-134.325a10.307 10.307 0 0 1 20.614 0v106.548a10 10 0 0 0 20 0v-20.43a10.307 10.307 0 1 1 20.613 0v36.305a10 10 0 0 0 20 0v-21.851a10.307 10.307 0 0 1 20.613 0v36.306a10 10 0 0 0 20 0v-21.852a10.307 10.307 0 0 1 20.613 0v64.04c-.001 14.325-7.85 33.491-15.442 52.026z"/></g>`
      // Dynamic / Hover + Click (Solid Nodes) 520x520 Keypad Password SVG Markup
      this.dynamicSvg = `<g id="_21-Password" data-name="21-Password"><path d="m152.724 106.649a37.325 37.325 0 1 1 37.324-37.325 37.367 37.367 0 0 1 -37.324 37.325z"/><path d="m252.782 106.649a37.325 37.325 0 1 1 37.325-37.325 37.367 37.367 0 0 1 -37.325 37.325zm0-54.649a17.325 17.325 0 1 0 17.325 17.324 17.343 17.343 0 0 0 -17.325-17.324z"/><path d="m352.841 106.649a37.325 37.325 0 1 1 37.324-37.325 37.367 37.367 0 0 1 -37.324 37.325z"/><path d="m152.724 203.155a37.325 37.325 0 1 1 37.324-37.324 37.367 37.367 0 0 1 -37.324 37.324zm0-54.649a17.325 17.325 0 1 0 17.324 17.325 17.345 17.345 0 0 0 -17.324-17.325z"/><path d="m352.841 203.155a37.325 37.325 0 1 1 37.324-37.324 37.366 37.366 0 0 1 -37.324 37.324zm0-54.649a17.325 17.325 0 1 0 17.324 17.325 17.344 17.344 0 0 0 -17.324-17.325z"/><path d="m378.884 289.089a37.333 37.333 0 1 0 -62.35-18.1 30.267 30.267 0 0 0 -33.772-9.345v-57.622a30.112 30.112 0 0 0 -2.789-12.674 37.3 37.3 0 1 0 -54.834-.446 30.119 30.119 0 0 0 -2.991 13.12v103.07l-20.547-13.2q-.354-.228-.728-.426a57.205 57.205 0 0 0 -20.248-6.375 37.307 37.307 0 1 0 -36.059 11.662c-6.1 6-11.33 14.235-11.169 23.049a21.915 21.915 0 0 0 .609 4.729 37.331 37.331 0 1 0 52.251 48.684 174.76 174.76 0 0 1 33.681 54.294c10.671 27.266 10.9 48.306 10.9 48.491a10 10 0 0 0 10 10h123.505a10 10 0 0 0 9.689-7.528c3.036-11.9 8.425-25.056 13.635-37.778 8.325-20.326 16.934-41.344 16.934-59.606v-64.04a30.353 30.353 0 0 0 -25.717-29.959zm-226.16 87.079a17.329 17.329 0 0 1 -5.578-33.735 204.588 204.588 0 0 1 22.872 17 17.332 17.332 0 0 1 -17.294 16.735zm216.435 58.946c-4.441 10.843-9 21.986-12.374 32.886h-106.642a183.23 183.23 0 0 0 -11.228-44.873c-10.812-28.038-33.947-67.919-82.769-98.684-1.019-.642-2.731-1.886-2.752-3.007-.046-2.541 3.662-7.94 9.058-11.623 4.442-3.031 16.12-5.359 28.714 1.147l30.982 19.9v7.487a10 10 0 0 0 20 0v-134.325a10.307 10.307 0 0 1 20.614 0v106.548a10 10 0 0 0 20 0v-20.43a10.307 10.307 0 1 1 20.613 0v36.305a10 10 0 0 0 20 0v-21.851a10.307 10.307 0 0 1 20.613 0v36.306a10 10 0 0 0 20 0v-21.852a10.307 10.307 0 0 1 20.613 0v64.04c-.001 14.325-7.85 33.491-15.442 52.026z"/></g>`
      // Use Credentials - Static (Outline Asterisk Nodes) 512x512 SVG Markup
      this.credStaticSvg = `<g><g><g><path d="M469.333,149.333H42.667C19.135,149.333,0,168.469,0,192v128c0,23.531,19.135,42.667,42.667,42.667h426.667 C492.865,362.667,512,343.531,512,320V192C512,168.469,492.865,149.333,469.333,149.333z M490.667,320 c0,11.76-9.573,21.333-21.333,21.333H42.667c-11.76,0-21.333-9.573-21.333-21.333V192c0-11.76,9.573-21.333,21.333-21.333 h426.667c11.76,0,21.333,9.573,21.333,21.333V320z"/><path d="M132.948,234.667c-2.958-5.125-9.51-6.844-14.573-3.906l-11.708,6.76V224c0-5.896-4.771-10.667-10.667-10.667 S85.333,218.104,85.333,224v13.521l-11.708-6.76c-5.094-2.938-11.625-1.219-14.573,3.906c-2.948,5.104-1.198,11.625,3.906,14.573 L74.665,256l-11.707,6.76c-5.104,2.948-6.854,9.469-3.906,14.573c1.979,3.427,5.563,5.333,9.25,5.333 c1.813,0,3.646-0.458,5.323-1.427l11.708-6.76V288c0,5.896,4.771,10.667,10.667,10.667s10.667-4.771,10.667-10.667v-13.521 l11.708,6.76c1.677,0.969,3.51,1.427,5.323,1.427c3.688,0,7.271-1.906,9.25-5.333c2.948-5.104,1.198-11.625-3.906-14.573 L117.335,256l11.707-6.76C134.146,246.292,135.896,239.771,132.948,234.667z"/><path d="M239.615,234.667c-2.969-5.125-9.5-6.844-14.573-3.906l-11.708,6.76V224c0-5.896-4.771-10.667-10.667-10.667 c-5.896,0-10.667,4.771-10.667,10.667v13.521l-11.708-6.76c-5.104-2.938-11.635-1.219-14.573,3.906 c-2.948,5.104-1.198,11.625,3.906,14.573l11.707,6.76l-11.707,6.76c-5.104,2.948-6.854,9.469-3.906,14.573 c1.979,3.427,5.563,5.333,9.25,5.333c1.813,0,3.646-0.458,5.323-1.427l11.708-6.76V288c0,5.896,4.771,10.667,10.667,10.667 c5.896,0,10.667-4.771,10.667-10.667v-13.521l11.708,6.76c1.677,0.969,3.51,1.427,5.323,1.427c3.688,0,7.271-1.906,9.25-5.333 c2.948-5.104,1.198-11.625-3.906-14.573L224.001,256l11.707-6.76C240.813,246.292,242.563,239.771,239.615,234.667z"/><path d="M346.281,234.667c-2.958-5.125-9.51-6.844-14.573-3.906L320,237.521V224c0-5.896-4.771-10.667-10.667-10.667 c-5.896,0-10.667,4.771-10.667,10.667v13.521l-11.708-6.76c-5.094-2.938-11.625-1.219-14.573,3.906 c-2.948,5.104-1.198,11.625,3.906,14.573l11.707,6.76l-11.707,6.76c-5.104,2.948-6.854,9.469-3.906,14.573 c1.979,3.427,5.563,5.333,9.25,5.333c1.813,0,3.646-0.458,5.323-1.427l11.708-6.76V288c0,5.896,4.771,10.667,10.667,10.667 c5.896,0,10.667-4.771,10.667-10.667v-13.521l11.708,6.76c1.677,0.969,3.51,1.427,5.323,1.427c3.688,0,7.271-1.906,9.25-5.333 c2.948-5.104,1.198-11.625-3.906-14.573L330.668,256l11.707-6.76C347.479,246.292,349.229,239.771,346.281,234.667z"/><path d="M452.948,234.667c-2.948-5.125-9.5-6.844-14.573-3.906l-11.708,6.76V224c0-5.896-4.771-10.667-10.667-10.667 c-5.896,0-10.667,4.771-10.667,10.667v13.521l-11.708-6.76c-5.115-2.938-11.615-1.219-14.573,3.906 c-2.948,5.104-1.198,11.625,3.906,14.573l11.707,6.76l-11.707,6.76c-5.104,2.948-6.854,9.469-3.906,14.573 c1.979,3.427,5.563,5.333,9.25,5.333c1.813,0,3.646-0.458,5.323-1.427l11.708-6.76V288c0,5.896,4.771,10.667,10.667,10.667 c5.896,0,10.667-4.771,10.667-10.667v-13.521l11.708,6.76c1.677,0.969,3.51,1.427,5.323,1.427c3.688,0,7.271-1.906,9.25-5.333 c2.948-5.104,1.198-11.625-3.906-14.573L437.335,256l11.707-6.76C454.146,246.292,455.896,239.771,452.948,234.667z"/></g></g></g>`
      // Use Credentials - Dynamic (Hover / Click Solid Asterisk Nodes) 512x512 SVG Markup
      this.credDynamicSvg = `<g><g><path d="M469.333,149.333H42.667C19.135,149.333,0,168.469,0,192v128c0,23.531,19.135,42.667,42.667,42.667h426.667 C492.865,362.667,512,343.531,512,320V192C512,168.469,492.865,149.333,469.333,149.333z M129.042,262.76 c5.104,2.948,6.854,9.469,3.906,14.573c-1.979,3.427-5.563,5.333-9.25,5.333c-1.813,0-3.646-0.458-5.323-1.427l-11.708-6.76V288 c0,5.896-4.771,10.667-10.667,10.667S85.333,293.896,85.333,288v-13.521l-11.708,6.76c-1.677,0.969-3.51,1.427-5.323,1.427 c-3.688,0-7.271-1.906-9.25-5.333c-2.948-5.104-1.198-11.625,3.906-14.573L74.665,256l-11.707-6.76 c-5.104-2.948-6.854-9.469-3.906-14.573c2.948-5.125,9.479-6.844,14.573-3.906l11.708,6.76V224 c0-5.896,4.771-10.667,10.667-10.667s10.667,4.771,10.667,10.667v13.521l11.708-6.76c5.063-2.938,11.615-1.219,14.573,3.906 c2.948,5.104,1.198,11.625-3.906,14.573L117.335,256L129.042,262.76z M235.708,262.76c5.104,2.948,6.854,9.469,3.906,14.573 c-1.979,3.427-5.563,5.333-9.25,5.333c-1.813,0-3.646-0.458-5.323-1.427l-11.708-6.76V288c0,5.896-4.771,10.667-10.667,10.667 c-5.896,0-10.667-4.771-10.667-10.667v-13.521l-11.708,6.76c-1.677,0.969-3.51,1.427-5.323,1.427c-3.688,0-7.271-1.906-9.25-5.333 c-2.948-5.104-1.198-11.625-3.906-14.573l11.707-6.76l-11.707-6.76c-5.104-2.948-6.854-9.469-3.906-14.573 c2.938-5.125,9.469-6.844,14.573-3.906l11.708,6.76V224c0-5.896,4.771-10.667,10.667-10.667c5.896,0,10.667,4.771,10.667,10.667 v13.521l11.708-6.76c5.073-2.938,11.604-1.219,14.573,3.906c2.948,5.104,1.198,11.625-3.906,14.573L224.001,256L235.708,262.76z M342.375,262.76c5.104,2.948,6.854,9.469,3.906,14.573c-1.979,3.427-5.563,5.333-9.25,5.333c-1.813,0-3.646-0.458-5.323-1.427 L320,274.479V288c0,5.896-4.771,10.667-10.667,10.667c-5.896,0-10.667-4.771-10.667-10.667v-13.521l-11.708,6.76 c-1.677,0.969-3.51,1.427-5.323,1.427c-3.688,0-7.271-1.906-9.25-5.333c-2.948-5.104-1.198-11.625,3.906-14.573l11.707-6.76 l-11.707-6.76c-5.104-2.948-6.854-9.469-3.906-14.573c2.948-5.125,9.479-6.844,14.573-3.906l11.708,6.76V224 c0-5.896,4.771-10.667,10.667-10.667c5.896,0,10.667,4.771,10.667,10.667v13.521l11.708-6.76 c5.063-2.938,11.615-1.219,14.573,3.906c2.948,5.104,1.198,11.625-3.906,14.573L330.668,256L342.375,262.76z M449.042,262.76 c5.104,2.948,6.854,9.469,3.906,14.573c-1.979,3.427-5.563,5.333-9.25,5.333c-1.813,0-3.646-0.458-5.323-1.427l-11.708-6.76V288 c0,5.896-4.771,10.667-10.667,10.667c-5.896,0-10.667-4.771-10.667-10.667v-13.521l-11.708,6.76 c-1.677,0.969-3.51,1.427-5.323,1.427c-3.688,0-7.271-1.906-9.25-5.333c-2.948-5.104-1.198-11.625,3.906-14.573l11.707-6.76 l-11.707-6.76c-5.104-2.948-6.854-9.469-3.906-14.573c2.958-5.125,9.458-6.844,14.573-3.906l11.708,6.76V224 c0-5.896,4.771-10.667,10.667-10.667c5.896,0,10.667,4.771,10.667,10.667v13.521l11.708-6.76 c5.073-2.938,11.625-1.219,14.573,3.906c2.948,5.104,1.198,11.625-3.906,14.573L437.335,256L449.042,262.76z"/></g></g>`
    }

    // Returns current static SVG based on active mode
    getActiveStaticSvg() {
      return this.parent.mode === 'pincode' ? this.credStaticSvg : this.staticSvg
    }

    // Returns current dynamic SVG based on active mode
    getActiveDynamicSvg() {
      return this.parent.mode === 'pincode' ? this.credDynamicSvg : this.dynamicSvg
    }

    // START: LoginModeController.init - Handles pincode button click and input adjustments
    init() {
      const pinBtn = document.getElementById('pin-btn')
      const pinText = document.getElementById('pin-text')
      const userGroup = document.getElementById('user-group')
      const userField = document.getElementById('user-field')
      const passField = document.getElementById('pass-field')
      const passLabel = document.getElementById('pass-label')
      const forgotLink = document.getElementById('forgot-link')
      const pinSvg = document.getElementById('pin-svg')

      // Hover dynamic swap: switch to dynamic icon on mouseenter, revert to static on mouseleave
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
          
          if (passLabel) {
            passLabel.textContent = 'Pincode'
          }
          if (forgotLink) {
            forgotLink.textContent = 'Forgot pincode?'
          }
          if (passField) {
            passField.setAttribute('placeholder', 'Enter 4-6 digit Terminal Pin')
            passField.setAttribute('maxlength', '6')
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

          if (passLabel) {
            passLabel.textContent = 'Password'
          }
          if (forgotLink) {
            forgotLink.textContent = 'Forgot password?'
          }
          if (passField) {
            passField.setAttribute('placeholder', '••••••••')
            passField.removeAttribute('maxlength')
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
    // END: LoginModeController.init - Pincode mode listener bound
  }
  // END: LoginModeController - Subchild ready

  // SUBCHILD CLASS: UserAccountController
  // START: UserAccountController - Handles user registration, automatic password assignment, and username trimming
  UserAccountController = class {
    constructor(parent) {
      this.parent = parent
      this.storageKey = 'jn_owners_users_v3'
      this.defaultPassword = '@JorgyPisonets#123'
    }

    // Default seeded owners matching active fleet (Admin is 0, owners auto-increment from 1)
    getDefaultUsers() {
      return [
        {
          id: 'USR-1',
          name: 'Kuya Jorgy (Unit 1 & 2)',
          username: 'jorgy',
          password: this.defaultPassword,
          phone: '0917-882-1401',
          category: 'Dual Coin Slot',
          units: 'Unit 1 & 2',
          role: 'Owner',
          status: 'Approved',
          dateCreated: '2026-09-15',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        },
        {
          id: 'USR-2',
          name: 'Boss Roldan (Unit 3 & 4)',
          username: 'roldan',
          password: this.defaultPassword,
          phone: '0920-554-9210',
          category: 'VIP Gaming Rig',
          units: 'Unit 3 & 4',
          role: 'Owner',
          status: 'Approved',
          dateCreated: '2026-09-20',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
        },
        {
          id: 'USR-3',
          name: 'Ate Gina (Unit 5 & 6)',
          username: 'gina',
          password: this.defaultPassword,
          phone: '0918-332-8419',
          category: 'Standard Pisonet',
          units: 'Unit 5 & 6',
          role: 'Owner',
          status: 'Pending',
          dateCreated: '2026-10-01',
          avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
        },
        {
          id: 'USR-4',
          name: 'Nanay Tessie (Unit 7 & 8)',
          username: 'tessie',
          password: this.defaultPassword,
          phone: '0929-114-6320',
          category: 'High-Yield Terminal',
          units: 'Unit 7 & 8',
          role: 'Owner',
          status: 'Approved',
          dateCreated: '2026-10-05',
          avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80'
        },
        {
          id: 'USR-5',
          name: 'Uncle Dan (Unit 9 & 10)',
          username: 'dan',
          password: this.defaultPassword,
          phone: '0995-771-2904',
          category: 'Standard Pisonet',
          units: 'Unit 9 & 10',
          role: 'Owner',
          status: 'Declined',
          dateCreated: '2026-10-10',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
        }
      ]
    }

    getUsers() {
      try {
        const stored = localStorage.getItem(this.storageKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        }
      } catch (e) {
        console.error('Failed to parse cached users:', e)
      }
      const defaults = this.getDefaultUsers()
      this.saveUsers(defaults)
      return defaults
    }

    saveUsers(users) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(users))
      } catch (e) {
        console.error('Failed to persist users:', e)
      }
    }

    // Automatically trims the first name, filtering out common Filipino titles
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

    // Next auto-incrementing ID for owners (Admin is 0; owners start at 1, 2, 3...)
    getNextId(users) {
      let maxNum = 0
      users.forEach((u) => {
        if (u.id) {
          const match = String(u.id).match(/\d+/)
          if (match) {
            const num = parseInt(match[0], 10)
            if (num > maxNum) maxNum = num
          }
        }
      })
      return `USR-${maxNum + 1}`
    }

    // Controller logic: creates user with default password '@JorgyPisonets#123' and auto-trimmed username
    createUser(data = {}) {
      const users = this.getUsers()
      const name = data.name || 'New Unit Owner'
      const username = data.username || this.generateUsername(name)
      const password = data.password || this.defaultPassword
      const phone = data.phone || '0917-000-0000'
      const category = data.category || 'Standard Pisonet'
      const units = data.units || 'Unassigned Units'
      const dateCreated = data.dateCreated || new Date().toISOString().slice(0, 10)
      const status = data.status || 'Pending'
      const avatar = data.avatar || `https://images.unsplash.com/photo-${1534528741775 + users.length}?w=150&auto=format&fit=crop&q=80`
      const id = data.id || this.getNextId(users)

      const newUser = {
        id,
        name,
        username,
        password,
        phone,
        category,
        units,
        role: 'Owner',
        status,
        dateCreated,
        avatar
      }

      users.unshift(newUser)
      this.saveUsers(users)
      return newUser
    }

    // Admin password or phone modification directly without asking for old password
    updateUser(id, updates = {}) {
      const users = this.getUsers()
      const idx = users.findIndex((u) => u.id === id)
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...updates }
        this.saveUsers(users)
        return users[idx]
      }
      return null
    }

    deleteUser(id) {
      const users = this.getUsers()
      const filtered = users.filter((u) => u.id !== id)
      this.saveUsers(filtered)
      return filtered
    }
  }
  // END: UserAccountController - Subchild ready
}
// END: AuthManager - Auth manager module ready

export const userAccountManager = new (new AuthManager()).UserAccountController()
