import { Controller } from "/assets/themes/so-admin/js/stimulus.js"

export default class extends Controller {
    static values = {
        inputName: String,
        internalValue: {
            type: String,
            default: "belso",
        },
        urlRowId: String,
        pageRowId: String,
    }

    connect() {
        this.boundSync = this.sync.bind(this)
        this.element.addEventListener("change", this.boundSync)
        this.sync()
    }

    disconnect() {
        if (!this.boundSync) {
            return
        }

        this.element.removeEventListener("change", this.boundSync)
    }

    sync() {
        if (!this.hasInputNameValue) {
            return
        }

        const selectedInput = this.element.querySelector(`input[name="${this.inputNameValue}"]:checked`)
        const selectedValue = selectedInput?.value ?? ""
        const isInternal = selectedValue === this.internalValueValue

        this.toggleRow(this.urlRowIdValue, !isInternal)
        this.toggleRow(this.pageRowIdValue, isInternal)
    }

    toggleRow(rowId, show) {
        if (!rowId) {
            return
        }

        const row = document.getElementById(rowId)

        if (!row) {
            return
        }

        row.style.display = show ? "" : "none"
    }
}
