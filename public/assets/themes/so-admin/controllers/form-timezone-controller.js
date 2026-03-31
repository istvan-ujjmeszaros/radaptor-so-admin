import { Controller } from "/assets/themes/so-admin/js/stimulus.js"

export default class extends Controller {
    connect() {
        let timezoneInput = this.element.querySelector('input[name="client_timezone"]')

        if (!timezoneInput) {
            timezoneInput = document.createElement('input')
            timezoneInput.type = 'hidden'
            timezoneInput.name = 'client_timezone'
            this.element.appendChild(timezoneInput)
        }

        timezoneInput.value = this.detectTimezone()
    }

    detectTimezone() {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        } catch (e) {
            return 'UTC'
        }
    }
}
