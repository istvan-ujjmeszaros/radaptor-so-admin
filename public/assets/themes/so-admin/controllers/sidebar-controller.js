/**
 * Sidebar Controller
 * Handles sidebar toggle and mobile responsive behavior
 */
import { Controller } from "/assets/themes/so-admin/js/stimulus.js"

export default class extends Controller {
    static targets = ['sidebar']

    connect() {
        this.handleResize = this.handleResize.bind(this)
        window.addEventListener('resize', this.handleResize)
    }

    disconnect() {
        window.removeEventListener('resize', this.handleResize)
    }

    toggle() {
        // Mobile only: toggle sidebar visibility
        if (window.innerWidth <= 991.98) {
            this.sidebarTarget.classList.toggle('show')
        }
    }

    close() {
        this.sidebarTarget.classList.remove('show')
    }

    handleResize() {
        // Close mobile sidebar on resize to desktop
        if (window.innerWidth > 991.98) {
            this.sidebarTarget.classList.remove('show')
        }
    }
}
