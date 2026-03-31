/**
 * Flash Controller
 * Handle flash message auto-dismiss and close button
 */
import { Controller } from "/assets/packages/themes/so-admin/js/stimulus.js"

export default class extends Controller {
    static values = {
        autoDismiss: { type: Boolean, default: true },
        duration: { type: Number, default: 5000 }
    }

    connect() {
        if (this.autoDismissValue) {
            this.dismissTimeout = setTimeout(() => {
                this.dismiss()
            }, this.durationValue)
        }
    }

    disconnect() {
        if (this.dismissTimeout) {
            clearTimeout(this.dismissTimeout)
        }
    }

    dismiss() {
        this.element.classList.add('hiding')
        setTimeout(() => {
            this.element.remove()
        }, 300)
    }

    close() {
        if (this.dismissTimeout) {
            clearTimeout(this.dismissTimeout)
        }
        this.dismiss()
    }
}
