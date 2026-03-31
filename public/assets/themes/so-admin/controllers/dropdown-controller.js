/**
 * Dropdown Controller
 * Custom dropdown handling (supplements Bootstrap dropdowns)
 */
import { Controller } from "/assets/packages/themes/so-admin/js/stimulus.js"

export default class extends Controller {
    static targets = ['menu']
    static values = { open: Boolean }

    connect() {
        this.handleOutsideClick = this.handleOutsideClick.bind(this)
        document.addEventListener('click', this.handleOutsideClick)
    }

    disconnect() {
        document.removeEventListener('click', this.handleOutsideClick)
    }

    toggle(event) {
        event.stopPropagation()
        this.openValue = !this.openValue
        this.menuTarget.classList.toggle('show', this.openValue)
    }

    handleOutsideClick(event) {
        if (!this.element.contains(event.target) && this.openValue) {
            this.openValue = false
            this.menuTarget.classList.remove('show')
        }
    }
}
