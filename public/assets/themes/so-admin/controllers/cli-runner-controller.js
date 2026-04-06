import { Controller } from "/assets/packages/themes/so-admin/js/stimulus.js"
import { t } from "/assets/packages/themes/so-admin/js/i18n.js"
import { renderBlockLoader } from "/assets/packages/themes/so-admin/js/async-loader.js"

export default class extends Controller {
    static targets = [
        'commandPanel',
        'commandName',
        'commandDocs',
        'paramForm',
        'paramFields',
        'runButton',
        'placeholder',
        'terminalCard',
        'terminal',
        'confirmDialog',
        'confirmMessage',
        'confirmCommand',
    ]

    static values = {
        executeUrl: String,
        commands: Object,
    }

    _selectedSlug = null
    _selectedMeta = null
    _running = false
    /** @type {Map<string, AbortController>} */
    _pendingFetches = new Map()
    /** @type {Map<string, Object>} Cached source data for prefill lookups */
    _sourceData = new Map()

    connect() {
        // Initialize Bootstrap tooltips
        this.element.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
            if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                new bootstrap.Tooltip(el)
            }
        })

        // Size the container to fill the remaining viewport
        this._sizeContainer()

        // Restore command from URL hash
        this._onHashChange = () => this._selectFromHash()
        window.addEventListener('hashchange', this._onHashChange)
        this._selectFromHash()
    }

    disconnect() {
        if (this._onHashChange) {
            window.removeEventListener('hashchange', this._onHashChange)
        }
    }

    selectCommand(event) {
        const slug = event.params.slug
        if (!slug) return

        this._activateCommand(slug, true)
    }

    _selectFromHash() {
        const hash = location.hash.slice(1) // remove '#'
        if (!hash) return
        if (hash === this._selectedSlug) return

        this._activateCommand(hash, false)
    }

    _activateCommand(slug, updateHash) {
        const meta = this._findCommand(slug)
        if (!meta) return

        this._selectedSlug = slug
        this._selectedMeta = meta

        // Update URL hash without triggering hashchange
        if (updateHash) {
            history.replaceState(null, '', '#' + slug)
        }

        // Highlight active button
        this.element.querySelectorAll('.cli-cmd-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.cliRunnerSlugParam === slug)
        })

        // Show command panel
        this.commandPanelTarget.hidden = false
        this.placeholderTarget.hidden = true

        // Populate info
        this.commandNameTarget.textContent = `${slug} — ${meta.name}`
        this.commandDocsTarget.textContent = this._dedentDocs(meta.docs)

        // Build param form
        this._renderParamForm(meta)

        // Scroll the active button into view within the sidebar only
        const activeBtn = this.element.querySelector('.cli-cmd-btn.active')
        const sidebar = this.element.querySelector('.cli-runner-sidebar')
        if (activeBtn && sidebar) {
            const btnRect = activeBtn.getBoundingClientRect()
            const sidebarRect = sidebar.getBoundingClientRect()
            if (btnRect.top < sidebarRect.top || btnRect.bottom > sidebarRect.bottom) {
                sidebar.scrollTop += btnRect.top - sidebarRect.top - sidebar.clientHeight / 2
            }
        }
    }

    async runCommand(event) {
        event.preventDefault()

        if (this._running || !this._selectedMeta) return

        // Non-read-only commands need confirmation before web execution.
        if (this._selectedMeta.risk_level === 'mutation' || this._selectedMeta.risk_level === 'build') {
            this._showConfirm()
            return
        }

        await this._executeCurrentCommand()
    }

    async confirmRun() {
        this._closeDialog()
        await this._executeCurrentCommand()
    }

    closeConfirm() {
        this._closeDialog()
    }

    clearOutput() {
        this.terminalTarget.innerHTML = ''
        this.terminalCardTarget.hidden = true
    }

    async copyOutput(event) {
        const btn = event.currentTarget
        const text = this.terminalTarget.innerText
        if (!text.trim()) return

        try {
            await navigator.clipboard.writeText(text)
            const originalHTML = btn.innerHTML
            btn.innerHTML = `<i class="bi bi-check me-1"></i>${this._esc(t('cli_runner.action.copied'))}`
            setTimeout(() => { btn.innerHTML = originalHTML }, 1500)
        } catch (_) {
            // Clipboard API unavailable
        }
    }

    // --- Private ---

    _findCommand(slug) {
        const groups = this.commandsValue
        for (const category of Object.keys(groups)) {
            for (const cmd of groups[category]) {
                if (cmd.slug === slug) return cmd
            }
        }
        return null
    }

    _renderParamForm(meta) {
        const container = this.paramFieldsTarget
        container.innerHTML = ''
        this._abortAllFetches()
        this._sourceData.clear()

        if (!meta.params || meta.params.length === 0) return

        for (const param of meta.params) {
            const div = document.createElement('div')
            div.className = 'mb-2'

            if (param.type === 'flag') {
                div.innerHTML = `
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox"
                               id="cli-param-${this._esc(param.name)}"
                               name="${this._esc(param.name)}"
                               ${param.default === '1' ? 'checked' : ''}>
                        <label class="form-check-label" for="cli-param-${this._esc(param.name)}">
                            ${this._esc(param.label)}
                        </label>
                    </div>
                `
            } else if (param.source_command) {
                // Combobox field — custom dropdown
                const required = param.required ? 'required' : ''
                const inputType = param.type === 'main_arg' ? 'main_arg' : (param.type === 'extra_arg' ? 'extra_arg' : 'option')
                div.className = 'mb-2 cli-combobox'
                div.innerHTML = `
                    <label for="cli-param-${this._esc(param.name)}" class="form-label form-label-sm">
                        <strong>${this._esc(param.label)}</strong>
                        ${param.required ? '<span class="text-danger">*</span>' : ''}
                    </label>
                    <input type="text"
                           class="form-control form-control-sm cli-combobox-input"
                           id="cli-param-${this._esc(param.name)}"
                           name="${this._esc(param.name)}"
                           data-param-type="${inputType}"
                           placeholder="${this._esc(param.label)}"
                           autocomplete="off"
                           value="${this._esc(param.default || '')}"
                           ${required}>
                    <div class="cli-combobox-dropdown" id="cli-choices-${this._esc(param.name)}"></div>
                `
                this._wireCombobox(div)

                // Load choices (immediately or after dependency resolves)
                if (!param.depends_on) {
                    this._loadChoices(param, div)
                }
            } else {
                const required = param.required ? 'required' : ''
                const inputType = param.type === 'main_arg' ? 'main_arg' : (param.type === 'extra_arg' ? 'extra_arg' : 'option')
                div.innerHTML = `
                    <label for="cli-param-${this._esc(param.name)}" class="form-label form-label-sm">
                        <strong>${this._esc(param.label)}</strong>
                        ${param.required ? '<span class="text-danger">*</span>' : ''}
                    </label>
                    <input type="text"
                           class="form-control form-control-sm"
                           id="cli-param-${this._esc(param.name)}"
                           name="${this._esc(param.name)}"
                           data-param-type="${inputType}"
                           placeholder="${this._esc(param.label)}"
                           value="${this._esc(param.default || '')}"
                           ${required}>
                `
            }

            container.appendChild(div)
        }

        // Wire up dependency listeners
        this._wireDependencies(meta.params)
    }

    /**
     * Wire change/input listeners for dependent fields (depends_on, prefill_from).
     *
     * Listens on both 'change' (fires on datalist selection / blur) and
     * 'input' (fires on every keystroke, debounced) so the cascade works
     * whether the user selects from the dropdown or types manually.
     */
    _wireDependencies(params) {
        for (const param of params) {
            // depends_on: when the source field changes, reload this field's choices
            if (param.depends_on) {
                const sourceInput = this.paramFieldsTarget.querySelector(`[name="${param.depends_on}"]`)
                if (sourceInput) {
                    let lastVal = ''
                    const handler = () => {
                        const val = sourceInput.value.trim()
                        if (val === lastVal) return
                        lastVal = val

                        const targetInput = this.paramFieldsTarget.querySelector(`[name="${param.name}"]`)
                        if (targetInput) {
                            targetInput.value = ''
                        }
                        if (val) {
                            this._loadChoices(param, targetInput?.closest('.mb-2'))
                        } else {
                            this._clearDatalist(param.name)
                        }
                    }
                    sourceInput.addEventListener('change', handler)
                    sourceInput.addEventListener('input', this._debounce(handler, 400))
                }
            }

            // prefill_from: when the referenced field changes, look up value from its cached source data
            if (param.prefill_from) {
                const sourceInput = this.paramFieldsTarget.querySelector(`[name="${param.prefill_from}"]`)
                if (sourceInput) {
                    const handler = () => {
                        const selectedKey = sourceInput.value.trim()
                        const targetInput = this.paramFieldsTarget.querySelector(`[name="${param.name}"]`)
                        if (!targetInput) return

                        if (selectedKey) {
                            const cachedData = this._sourceData.get(param.prefill_from)
                            if (cachedData && selectedKey in cachedData) {
                                targetInput.value = String(cachedData[selectedKey])
                            } else {
                                targetInput.value = ''
                            }
                        } else {
                            targetInput.value = ''
                        }
                    }
                    sourceInput.addEventListener('change', handler)
                    sourceInput.addEventListener('input', handler)
                }
            }
        }
    }

    _debounce(fn, ms) {
        let timer
        return (...args) => {
            clearTimeout(timer)
            timer = setTimeout(() => fn.apply(this, args), ms)
        }
    }

    /**
     * Load combobox choices by running a CLI command via the execute endpoint.
     */
    async _loadChoices(param, containerDiv) {
        const fetchKey = `choices-${param.name}`
        this._abortFetch(fetchKey)

        const abortController = new AbortController()
        this._pendingFetches.set(fetchKey, abortController)

        try {
            const args = this._resolveArgs(param.source_args || {})
            const result = await this._runBackgroundCommand(
                param.source_command,
                args.main_arg || '',
                args.options || {},
                ['json'],
                abortController.signal
            )

            if (!result?.data?.json_data) return

            const choices = this._extractChoices(result.data.json_data, param.source_field)
            this._populateDatalist(param.name, choices)

            // Cache raw source data for prefill_from lookups
            this._cacheSourceData(param.name, result.data.json_data, param.source_field)
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.warn('Failed to load choices for', param.name, e)
            }
        } finally {
            this._pendingFetches.delete(fetchKey)
        }
    }

    /**
     * Cache raw source data from a choices response for prefill_from lookups.
     * For 'configs{}' pattern, stores the raw object so values can be read by key.
     */
    _cacheSourceData(paramName, jsonData, sourceField) {
        if (!sourceField || !jsonData) return

        const objectMatch = sourceField.match(/^(\w+)\{\}$/)
        if (objectMatch) {
            const obj = jsonData[objectMatch[1]]
            if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                this._sourceData.set(paramName, obj)
            }
        }
    }

    /**
     * Resolve argument placeholders like $username to current form values.
     */
    _resolveArgs(argsTemplate) {
        const result = { main_arg: '', options: {} }
        for (const [key, value] of Object.entries(argsTemplate)) {
            let resolved = value
            if (typeof value === 'string' && value.startsWith('$')) {
                const fieldName = value.slice(1)
                const input = this.paramFieldsTarget.querySelector(`[name="${fieldName}"]`)
                resolved = input?.value?.trim() || ''
            }
            if (key === 'main_arg') {
                result.main_arg = resolved
            } else {
                result.options[key] = resolved
            }
        }
        return result
    }

    /**
     * Run a CLI command in the background (for loading choices/prefill).
     */
    async _runBackgroundCommand(commandSlug, mainArg, options, flags, signal) {
        const body = new FormData()
        body.set('command', commandSlug)
        body.set('main_arg', mainArg)
        body.set('options', JSON.stringify(options))
        body.set('flags', JSON.stringify(flags))

        const response = await fetch(this.executeUrlValue, {
            method: 'POST',
            body,
            signal,
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })

        return response.json()
    }

    /**
     * Extract choice values from JSON data using a field path.
     *
     * Supported patterns:
     *   'users[].username'  → array of objects, pluck field
     *   'configs{}'         → object keys as choices
     */
    _extractChoices(data, fieldPath) {
        if (!fieldPath || !data) return []

        // Pattern: 'field[].subfield' — array of objects, pluck subfield
        const arrayMatch = fieldPath.match(/^(\w+)\[\]\.(\w+)$/)
        if (arrayMatch) {
            const [, arrayKey, subKey] = arrayMatch
            const arr = data[arrayKey]
            if (!Array.isArray(arr)) return []
            return arr.map(item => String(item[subKey] ?? '')).filter(v => v !== '')
        }

        // Pattern: 'field{}' — object, use keys as choices
        const objectMatch = fieldPath.match(/^(\w+)\{\}$/)
        if (objectMatch) {
            const obj = data[objectMatch[1]]
            if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                return Object.keys(obj)
            }
            return []
        }

        // Simple field name — expect an array
        if (Array.isArray(data[fieldPath])) {
            return data[fieldPath].map(String)
        }

        return []
    }

    /**
     * Extract a single value from JSON data using a simple field name.
     */
    _extractValue(data, fieldName) {
        if (!data || !fieldName) return null
        return data[fieldName] ?? null
    }

    /**
     * Wire up combobox behavior: show/hide dropdown, filter, select.
     */
    _wireCombobox(container) {
        const input = container.querySelector('.cli-combobox-input')
        const dropdown = container.querySelector('.cli-combobox-dropdown')
        if (!input || !dropdown) return

        let allChoices = []

        const showFiltered = () => {
            const term = input.value.toLowerCase().trim()
            const filtered = term
                ? allChoices.filter(c => c.toLowerCase().includes(term))
                : allChoices

            if (filtered.length === 0 || (filtered.length === 1 && filtered[0] === input.value)) {
                dropdown.classList.remove('open')
                return
            }

            dropdown.innerHTML = filtered.map(c =>
                `<div class="cli-combobox-option" data-value="${this._esc(c)}">${this._esc(c)}</div>`
            ).join('')
            dropdown.classList.add('open')
        }

        input.addEventListener('focus', () => {
            allChoices = this._getChoices(input.name)
            if (allChoices.length > 0) showFiltered()
        })

        input.addEventListener('input', () => {
            allChoices = this._getChoices(input.name)
            showFiltered()
        })

        input.addEventListener('blur', () => {
            // Delay so click on option registers first
            setTimeout(() => dropdown.classList.remove('open'), 150)
        })

        dropdown.addEventListener('mousedown', (e) => {
            // Prevent blur on input
            e.preventDefault()
        })

        dropdown.addEventListener('click', (e) => {
            const option = e.target.closest('.cli-combobox-option')
            if (!option) return

            input.value = option.dataset.value
            dropdown.classList.remove('open')
            input.dispatchEvent(new Event('change', { bubbles: true }))
            input.dispatchEvent(new Event('input', { bubbles: true }))
        })
    }

    /** @type {Map<string, string[]>} stored choices per param name */
    _choices = new Map()

    _getChoices(paramName) {
        return this._choices.get(paramName) || []
    }

    _populateDatalist(paramName, choices) {
        this._choices.set(paramName, choices)
    }

    _clearDatalist(paramName) {
        this._choices.delete(paramName)
        const dropdown = this.paramFieldsTarget.querySelector(`#cli-choices-${paramName}`)
        if (dropdown) {
            dropdown.innerHTML = ''
            dropdown.classList.remove('open')
        }
    }

    _abortFetch(key) {
        const existing = this._pendingFetches.get(key)
        if (existing) {
            existing.abort()
            this._pendingFetches.delete(key)
        }
    }

    _abortAllFetches() {
        for (const [key, controller] of this._pendingFetches) {
            controller.abort()
        }
        this._pendingFetches.clear()
    }

    async _executeCurrentCommand() {
        if (this._running || !this._selectedSlug) return
        this._running = true

        const slug = this._selectedSlug
        const formData = this._collectFormData()

        // Show terminal with loading state
        this.terminalCardTarget.hidden = false
        this.runButtonTarget.disabled = true

        const entry = document.createElement('div')
        entry.className = 'cli-terminal-entry'
        entry.innerHTML = `
            <div class="cli-terminal-prompt">$ radaptor ${this._esc(slug)}${formData.main_arg ? ' ' + this._esc(formData.main_arg) : ''}${formData.flagStr}</div>
            <div class="cli-terminal-loading">${renderBlockLoader({ label: t('cli_runner.output.running'), size: 20, minHeight: '2rem', visibleLabel: true })}</div>
        `
        this.terminalTarget.appendChild(entry)
        this.terminalTarget.scrollTop = this.terminalTarget.scrollHeight

        try {
            const body = new FormData()
            body.set('command', slug)
            body.set('main_arg', formData.main_arg)
            body.set('extra_args', JSON.stringify(formData.extra_args))
            body.set('options', JSON.stringify(formData.options))
            body.set('flags', JSON.stringify(formData.flags))

            const response = await fetch(this.executeUrlValue, {
                method: 'POST',
                body,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            })

            const payload = await response.json()
            this._renderResult(entry, payload)
        } catch (error) {
            this._renderResult(entry, {
                ok: false,
                data: {
                    ok: false,
                    output: '',
                    output_html: '',
                    error: error?.message || t('common.error'),
                    exit_code: -1,
                    duration_ms: 0,
                    json_data: null,
                },
            })
        } finally {
            this._running = false
            this.runButtonTarget.disabled = false
        }
    }

    _collectFormData() {
        const fields = this.paramFieldsTarget
        let main_arg = ''
        const extra_args = []
        const options = {}
        const flags = []
        const flagParts = []

        fields.querySelectorAll('input').forEach(input => {
            const name = input.name
            if (!name) return

            if (input.type === 'checkbox') {
                if (input.checked) {
                    flags.push(name)
                    flagParts.push(` --${name}`)
                }
            } else if (input.dataset.paramType === 'main_arg') {
                main_arg = input.value.trim()
            } else if (input.dataset.paramType === 'extra_arg') {
                const val = input.value.trim()
                if (val !== '') {
                    extra_args.push(val)
                    flagParts.push(` ${val}`)
                }
            } else {
                const val = input.value.trim()
                if (val !== '') {
                    options[name] = val
                    flagParts.push(` --${name} ${val}`)
                }
            }
        })

        return { main_arg, extra_args, options, flags, flagStr: flagParts.join('') }
    }

    _renderResult(entry, payload) {
        const loading = entry.querySelector('.cli-terminal-loading')
        if (loading) loading.remove()

        const data = payload?.data || payload
        const ok = data?.ok ?? payload?.ok ?? false
        const output_html = data?.output_html || ''
        const error = data?.error || ''
        const duration = data?.duration_ms ?? 0
        const exitCode = data?.exit_code ?? -1

        let html = ''

        if (output_html) {
            html += output_html
        }

        if (error) {
            html += `\n<span class="ansi-red">${this._esc(error)}</span>`
        }

        if (!output_html && !error) {
            html = `<span class="cli-terminal-meta">${this._esc(t('cli_runner.output.empty'))}</span>`
        }

        // Status line
        const statusClass = ok ? 'ansi-green' : 'ansi-red'
        const statusText = ok
            ? t('cli_runner.output.completed', { duration: String(duration) })
            : (exitCode === -1
                ? t('cli_runner.output.timeout')
                : t('cli_runner.output.failed', { code: String(exitCode) }))

        html += `\n<span class="cli-terminal-meta ${statusClass}">${this._esc(statusText)} (${duration}ms)</span>`

        const outputDiv = document.createElement('div')
        outputDiv.innerHTML = html
        entry.appendChild(outputDiv)

        this.terminalTarget.scrollTop = this.terminalTarget.scrollHeight
    }

    _showConfirm() {
        const slug = this._selectedSlug
        const formData = this._collectFormData()

        this.confirmCommandTarget.textContent = `radaptor ${slug}${formData.main_arg ? ' ' + formData.main_arg : ''}${formData.flagStr}`

        if (typeof this.confirmDialogTarget.showModal === 'function') {
            if (!this.confirmDialogTarget.open) {
                this.confirmDialogTarget.showModal()
            }
        } else {
            this.confirmDialogTarget.hidden = false
        }
    }

    _closeDialog() {
        if (typeof this.confirmDialogTarget.close === 'function' && this.confirmDialogTarget.open) {
            this.confirmDialogTarget.close()
        } else {
            this.confirmDialogTarget.hidden = true
        }
    }

    /**
     * Remove leading tab indentation from heredoc docs strings.
     */
    _dedentDocs(text) {
        if (!text) return ''
        const lines = text.split('\n')
        // Find minimum leading tab count (ignoring empty lines)
        let minTabs = Infinity
        for (const line of lines) {
            if (line.trim() === '') continue
            const match = line.match(/^(\t+)/)
            const tabs = match ? match[1].length : 0
            if (tabs < minTabs) minTabs = tabs
        }
        if (minTabs === Infinity || minTabs === 0) return text.trim()
        const prefix = '\t'.repeat(minTabs)
        return lines.map(line => line.startsWith(prefix) ? line.slice(minTabs) : line).join('\n').trim()
    }

    _sizeContainer() {
        const rect = this.element.getBoundingClientRect()
        const available = window.innerHeight - rect.top - 16
        this.element.style.height = Math.max(400, available) + 'px'
    }

    _esc(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;')
    }
}
