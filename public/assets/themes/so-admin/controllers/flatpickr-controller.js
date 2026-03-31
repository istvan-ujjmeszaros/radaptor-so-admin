/**
 * Flatpickr Controller
 * Date/datetime picker using Flatpickr library
 *
 * Waits for flatpickr to be available since it may be loaded separately.
 */
import { Controller } from "/assets/themes/so-admin/js/stimulus.js"

export default class extends Controller {
    static values = {
        enableTime: { type: Boolean, default: false },
        dateFormat: { type: String, default: "Y-m-d" }
    }

    connect() {
        this.initAttempts = 0
        this.maxAttempts = 50 // 5 seconds max wait
        this.waitForFlatpickr()
    }

    waitForFlatpickr() {
        if (typeof flatpickr !== 'undefined') {
            this.initializePicker()
            return
        }

        this.initAttempts++
        if (this.initAttempts < this.maxAttempts) {
            setTimeout(() => this.waitForFlatpickr(), 100)
        } else {
            console.error('Flatpickr library failed to load after 5 seconds')
        }
    }

    initializePicker() {
        this.picker = flatpickr(this.element, {
            dateFormat: this.dateFormatValue,
            enableTime: this.enableTimeValue,
            time_24hr: true,
            locale: "hu",
            allowInput: true
        })
    }

    disconnect() {
        if (this.picker) {
            this.picker.destroy()
        }
    }
}
