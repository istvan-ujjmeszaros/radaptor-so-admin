/**
 * Tabs Controller
 * Handle tab switching without page reload
 */
import { Controller } from "/assets/themes/so-admin/js/stimulus.js"

export default class extends Controller {
    static targets = ['tab', 'panel']
    static values = { index: Number }

    connect() {
        // Activate first tab by default
        if (this.tabTargets.length > 0 && this.indexValue === 0) {
            this.showTab(0)
        }
    }

    select(event) {
        event.preventDefault()
        const index = this.tabTargets.indexOf(event.currentTarget)
        this.showTab(index)
    }

    showTab(index) {
        this.indexValue = index

        // Update tab states
        this.tabTargets.forEach((tab, i) => {
            tab.classList.toggle('active', i === index)
            tab.setAttribute('aria-selected', i === index)
        })

        // Update panel visibility
        this.panelTargets.forEach((panel, i) => {
            panel.classList.toggle('show', i === index)
            panel.classList.toggle('active', i === index)
        })
    }
}
