/**
 * SavedIndicatorController - Global "Saved" indicator in the navbar
 *
 * Listens for 'status:saved' events on document.body and shows a subtle
 * confirmation indicator in the top-right of the navbar.
 *
 * Usage from any component:
 *   document.body.dispatchEvent(new CustomEvent('status:saved'));
 *
 * Features:
 * - Non-stacking: rapid saves just reset the timer
 * - Subtle fade animation
 * - Auto-hides after 2 seconds
 */
import { Controller } from "/assets/packages/themes/so-admin/js/stimulus.js"

export default class extends Controller {
    static targets = ['indicator']

    connect() {
        this._boundShowSaved = this.showSaved.bind(this)
        document.body.addEventListener('status:saved', this._boundShowSaved)
    }

    disconnect() {
        document.body.removeEventListener('status:saved', this._boundShowSaved)
        if (this._timeout) {
            clearTimeout(this._timeout)
        }
        if (this._flashTimeout) {
            clearTimeout(this._flashTimeout)
        }
    }

    showSaved() {
        if (!this.hasIndicatorTarget) return

        // Clear any existing timeout
        if (this._timeout) {
            clearTimeout(this._timeout)
        }
        if (this._flashTimeout) {
            clearTimeout(this._flashTimeout)
        }

        // If already visible, flash it (hide briefly, then show again)
        if (this.indicatorTarget.classList.contains('is-visible')) {
            this.indicatorTarget.classList.remove('is-visible')
            this._flashTimeout = setTimeout(() => {
                this.indicatorTarget.classList.add('is-visible')
            }, 100)
        } else {
            this.indicatorTarget.classList.add('is-visible')
        }

        // Hide after 2 seconds
        this._timeout = setTimeout(() => {
            this.indicatorTarget.classList.remove('is-visible')
        }, 2000)
    }
}
