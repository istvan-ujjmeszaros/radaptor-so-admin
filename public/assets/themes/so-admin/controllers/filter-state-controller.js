import { Controller } from "/assets/packages/themes/so-admin/js/stimulus.js"

export default class extends Controller {
    static targets = ['field']

    static values = {
        debounceMs: {
            type: Number,
            default: 400,
        },
    }

    connect() {
        this._fieldListeners = []
        this._debouncedSync = this._debounce(() => this._syncUrl(), this.debounceMsValue)

        this._applyUrlState()
        this._bindFields()
    }

    disconnect() {
        this._fieldListeners.forEach(({ element, eventName, handler }) => {
            element.removeEventListener(eventName, handler)
        })

        this._fieldListeners = []
    }

    _applyUrlState() {
        const params = new URLSearchParams(window.location.search)

        this.fieldTargets.forEach((field) => {
            const paramName = this._getParamName(field)

            if (!paramName || !params.has(paramName)) {
                return
            }

            this._setFieldValue(field, params.get(paramName) || '')
        })
    }

    _bindFields() {
        this.fieldTargets.forEach((field) => {
            const syncMode = this._getSyncMode(field)

            if (syncMode === 'live') {
                this._addFieldListener(field, 'input', this._debouncedSync)
                this._addFieldListener(field, 'change', () => this._syncUrl())
                return
            }

            this._addFieldListener(field, 'change', () => this._syncUrl())
        })
    }

    _addFieldListener(element, eventName, handler) {
        element.addEventListener(eventName, handler)
        this._fieldListeners.push({ element, eventName, handler })
    }

    _syncUrl() {
        const url = new URL(window.location.href)
        const nextParams = url.searchParams
        const collectedParams = this._collectParams()

        collectedParams.forEach((value, paramName) => {
            if (value === '') {
                nextParams.delete(paramName)
                return
            }

            nextParams.set(paramName, value)
        })

        const nextUrl = `${url.pathname}${url.search}${url.hash}`
        const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`

        if (nextUrl !== currentUrl) {
            window.history.replaceState(window.history.state, '', nextUrl)
        }

        this.dispatch('changed', {
            detail: {
                params: Object.fromEntries(collectedParams.entries()),
            },
        })
    }

    _collectParams() {
        const groups = new Map()

        this.fieldTargets.forEach((field) => {
            const paramName = this._getParamName(field)

            if (!paramName) {
                return
            }

            const existing = groups.get(paramName) || []
            existing.push(field)
            groups.set(paramName, existing)
        })

        const collected = new Map()

        groups.forEach((fields, paramName) => {
            if (!fields.length) {
                return
            }

            const firstField = fields[0]
            const inputType = (firstField.type || '').toLowerCase()

            if (inputType === 'radio') {
                const checkedField = fields.find((field) => field.checked)
                collected.set(paramName, checkedField ? String(checkedField.value || '') : '')
                return
            }

            if (inputType === 'checkbox' && fields.length > 1) {
                const values = fields
                    .filter((field) => field.checked)
                    .map((field) => String(field.value || '1'))
                    .filter(Boolean)

                collected.set(paramName, values.join(','))
                return
            }

            collected.set(paramName, this._getFieldValue(firstField))
        })

        return collected
    }

    _getParamName(field) {
        return field.dataset.filterStateParam || field.name || ''
    }

    _getSyncMode(field) {
        if (field.dataset.filterStateSync) {
            return field.dataset.filterStateSync
        }

        const tagName = field.tagName.toLowerCase()
        const inputType = (field.type || '').toLowerCase()

        if (tagName === 'textarea') {
            return 'live'
        }

        if (tagName === 'input' && ['text', 'search', 'email', 'number', 'url', 'tel'].includes(inputType)) {
            return 'live'
        }

        return 'change'
    }

    _getFieldValue(field) {
        const tagName = field.tagName.toLowerCase()
        const inputType = (field.type || '').toLowerCase()

        if (tagName === 'select' && field.multiple) {
            return Array.from(field.selectedOptions)
                .map((option) => option.value)
                .filter(Boolean)
                .join(',')
        }

        if (inputType === 'checkbox') {
            return field.checked ? (field.value || '1') : ''
        }

        if (inputType === 'radio') {
            return field.checked ? field.value : ''
        }

        return String(field.value || '').trim()
    }

    _setFieldValue(field, rawValue) {
        const tagName = field.tagName.toLowerCase()
        const inputType = (field.type || '').toLowerCase()

        if (tagName === 'select' && field.multiple) {
            const values = new Set(String(rawValue || '').split(',').filter(Boolean))
            Array.from(field.options).forEach((option) => {
                option.selected = values.has(option.value)
            })
            return
        }

        if (inputType === 'checkbox') {
            const values = new Set(String(rawValue || '').split(',').filter(Boolean))
            field.checked = values.has(field.value || '1')
            return
        }

        if (inputType === 'radio') {
            field.checked = rawValue === field.value
            return
        }

        field.value = rawValue
    }

    _debounce(fn, delay) {
        let timerId

        return (...args) => {
            clearTimeout(timerId)
            timerId = window.setTimeout(() => fn.apply(this, args), delay)
        }
    }
}
