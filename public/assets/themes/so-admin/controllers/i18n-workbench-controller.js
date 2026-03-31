/**
 * I18n Workbench Controller
 *
 * Manages the translation management workbench:
 * - DataTables server-side grid with locale/domain/search filters
 * - Always-editable inline translation inputs with debounced autosave
 * - Reviewed checkbox metadata
 * - Translation memory suggestions panel
 */
import { Controller } from "/assets/packages/themes/so-admin/js/stimulus.js"
import { t } from "/assets/packages/themes/so-admin/js/i18n.js"
import { renderBlockLoader, renderInlineLoader } from "/assets/packages/themes/so-admin/js/async-loader.js"

export default class extends Controller {
    static targets = ['table', 'tmBackdrop', 'tmPanel', 'tmKey', 'tmMeta', 'tmSource', 'tmExact', 'tmFuzzy', 'localeSelect', 'domainSelect', 'searchInput']

    static values = {
        ajaxLoadUrl: String,
        ajaxSaveUrl: String,
        ajaxTmUrl: String,
        ajaxTmFuzzyUrl: String,
    }

    connect() {
        this._dataTable = null
        this._tmRequestId = 0
        this._rowsByKey = new Map()
        this._saveTimers = new Map()
        this._saveRequests = new Map()
        this._saveIndicatorTimers = new Map()
        this._dirtyRows = new Set()
        this._beforeUnloadHandler = (event) => {
            if (!this._hasPendingChanges()) {
                return
            }

            event.preventDefault()
            event.returnValue = ''
        }

        window.addEventListener('beforeunload', this._beforeUnloadHandler)
        this._initDataTable()
        this._bindFilters()
        this._bindTableActions()
    }

    disconnect() {
        this._saveTimers.forEach((timerId) => clearTimeout(timerId))
        this._saveTimers.clear()
        this._saveIndicatorTimers.forEach((timerId) => clearTimeout(timerId))
        this._saveIndicatorTimers.clear()
        this._saveRequests.clear()
        this._dirtyRows.clear()
        this._rowsByKey.clear()

        if (this._dataTable) {
            this._dataTable.destroy()
            this._dataTable = null
        }

        window.removeEventListener('beforeunload', this._beforeUnloadHandler)
        document.body.classList.remove('i18n-tm-open')
    }

    // -------------------------------------------------------------------------
    // DataTables
    // -------------------------------------------------------------------------

    _initDataTable() {
        const self = this

        this._dataTable = $(this.tableTarget).DataTable({
            serverSide: true,
            searching: false,
            drawCallback: () => this._autoResizeVisibleTextareas(),
            ajax: function (data, callback) {
                self._flushDirtyRows().finally(() => {
                    const filters = self._getFilters()

                    $.ajax({
                        url: self.ajaxLoadUrlValue,
                        data: { draw: data.draw, start: data.start, length: data.length, ...filters },
                        success: function (response) {
                            self._rowsByKey.clear()

                            ;(response.data || []).forEach((row) => {
                                self._decorateRowData(row, filters.locale)
                            })

                            callback(response)
                        },
                        error: function () {
                            callback({ draw: data.draw, data: [], recordsTotal: 0, recordsFiltered: 0 })
                        },
                    })
                })
            },
            createdRow: function (row, rowData) {
                row.dataset.i18nRowKey = rowData._row_key
            },
            columns: [
                { data: 'domain' },
                { data: 'key' },
                {
                    data: 'source_text',
                    defaultContent: '',
                    render: (value) => `<div class="i18n-source-text">${self._esc(value)}</div>`,
                },
                {
                    data: null,
                    orderable: false,
                    render: (_, __, rowData) => self._renderTranslationCell(rowData),
                },
                {
                    data: null,
                    className: 'i18n-reviewed-cell',
                    orderable: false,
                    render: (_, __, rowData) => self._renderReviewedCell(rowData),
                },
                {
                    data: null,
                    orderable: false,
                    render: (_, __, rowData) => self._renderActionsCell(rowData),
                },
            ],
            pageLength: 25,
        })
    }

    _decorateRowData(rowData, locale) {
        rowData.locale = rowData.locale || locale
        rowData._locale = locale
        rowData.text = String(rowData.text || '')
        rowData.human_reviewed = Number(rowData.human_reviewed || 0) === 1
        rowData._row_key = this._rowKey(rowData)
        rowData._last_saved_text = rowData.text
        rowData._last_saved_human_reviewed = rowData.human_reviewed
        rowData._save_state = ''
        rowData._save_after_current = false
        rowData._save_indicator_visible = false
        rowData._save_indicator_started_at = 0

        this._rowsByKey.set(rowData._row_key, rowData)
    }

    _getFilters() {
        return {
            locale: this.localeSelectTarget.value,
            domain: this.domainSelectTarget.value,
            search: this.searchInputTarget.value,
        }
    }

    _bindTableActions() {
        $(this.element).on('input', '.i18n-translation-input', (event) => this._handleTextInput(event))
        $(this.element).on('change', '.i18n-reviewed-checkbox', (event) => this._handleReviewedChange(event))
        $(this.element).on('click', '.i18n-tm-btn', (event) => this.showTm(event))
    }

    _bindFilters() {
        const reload = () => this._reloadTable()
        const debouncedReload = this._debounce(reload, 400)

        this.localeSelectTarget.addEventListener('change', reload)
        this.domainSelectTarget.addEventListener('change', reload)
        this.searchInputTarget.addEventListener('input', debouncedReload)
    }

    _reloadTable() {
        this._flushDirtyRows().finally(() => {
            this._dataTable?.ajax.reload()
        })
    }

    // -------------------------------------------------------------------------
    // Inline editing
    // -------------------------------------------------------------------------

    _handleTextInput(event) {
        const context = this._getRowContextFromElement(event.currentTarget)

        if (!context) {
            return
        }

        this._autoResizeTextarea(event.currentTarget)

        const { rowData, rowElement } = context
        rowData.text = String(event.currentTarget.value || '')

        if (rowData.text.trim() === '' || rowData.text !== rowData._last_saved_text) {
            rowData.human_reviewed = false
        }

        rowData._save_state = ''
        this._dirtyRows.add(rowData._row_key)
        this._syncVisibleRow(rowData, { rowElement })
        this._scheduleSave(rowData, 700)
    }

    _handleReviewedChange(event) {
        const context = this._getRowContextFromElement(event.currentTarget)

        if (!context) {
            return
        }

        const { rowData, rowElement } = context
        rowData.human_reviewed = event.currentTarget.checked && rowData.text.trim() !== ''
        rowData._save_state = ''
        this._dirtyRows.add(rowData._row_key)
        this._syncVisibleRow(rowData, { rowElement })
        this._scheduleSave(rowData, 0)
    }

    _scheduleSave(rowData, delay) {
        const existingTimer = this._saveTimers.get(rowData._row_key)

        if (existingTimer) {
            clearTimeout(existingTimer)
        }

        const timerId = window.setTimeout(() => {
            this._saveTimers.delete(rowData._row_key)
            this._flushRowSave(rowData)
        }, delay)

        this._saveTimers.set(rowData._row_key, timerId)
    }

    _flushDirtyRows() {
        const timerRowKeys = Array.from(this._saveTimers.keys())

        timerRowKeys.forEach((rowKey) => {
            const timerId = this._saveTimers.get(rowKey)

            if (timerId) {
                clearTimeout(timerId)
            }

            this._saveTimers.delete(rowKey)

            const rowData = this._rowsByKey.get(rowKey)

            if (rowData) {
                this._flushRowSave(rowData)
            }
        })

        const requests = Array.from(this._saveRequests.values())

        if (!requests.length) {
            return Promise.resolve()
        }

        return Promise.allSettled(requests).then(() => {
            if (this._saveTimers.size || this._saveRequests.size) {
                return this._flushDirtyRows()
            }
        })
    }

    _flushRowSave(rowData) {
        const rowKey = rowData._row_key

        if (this._saveRequests.has(rowKey)) {
            rowData._save_after_current = true
            return this._saveRequests.get(rowKey)
        }

        const payload = this._currentPayload(rowData)

        if (
            payload.text === rowData._last_saved_text
            && payload.humanReviewed === rowData._last_saved_human_reviewed
        ) {
            this._dirtyRows.delete(rowKey)
            rowData._save_state = ''
            this._syncVisibleRow(rowData)

            return Promise.resolve()
        }

        rowData._save_state = 'saving'
        this._showSaveIndicator(rowData)
        this._syncVisibleRow(rowData)

        const request = new Promise((resolve, reject) => {
            $.post(this.ajaxSaveUrlValue, {
                domain: rowData.domain,
                key: rowData.key,
                context: rowData.context || '',
                locale: rowData._locale,
                text: payload.text,
                human_reviewed: payload.humanReviewed ? '1' : '0',
            })
            .done(resolve)
            .fail(reject)
        })

        this._saveRequests.set(rowKey, request)

        request
            .then((response) => {
                const savedText = String(response?.text ?? payload.text)
                const savedHumanReviewed = savedText.trim() !== '' && !!response?.human_reviewed
                const changedDuringSave = rowData.text !== payload.text || rowData.human_reviewed !== payload.humanReviewed

                rowData._last_saved_text = savedText
                rowData._last_saved_human_reviewed = savedHumanReviewed
                rowData._save_state = ''
                this._hideSaveIndicator(rowData)

                if (!changedDuringSave) {
                    rowData.text = savedText
                    rowData.human_reviewed = savedHumanReviewed
                    this._dirtyRows.delete(rowKey)
                }

                this._syncVisibleRow(rowData, { updateText: true })

                if (changedDuringSave || rowData._save_after_current) {
                    rowData._save_after_current = false
                    this._scheduleSave(rowData, 0)
                }
            })
            .catch(() => {
                rowData._save_state = 'error'
                this._hideSaveIndicator(rowData)
                this._dirtyRows.add(rowKey)
                this._syncVisibleRow(rowData)
            })
            .finally(() => {
                this._saveRequests.delete(rowKey)
            })

        return request
    }

    _currentPayload(rowData) {
        return {
            text: rowData.text || '',
            humanReviewed: rowData.text.trim() !== '' && !!rowData.human_reviewed,
        }
    }

    _syncVisibleRow(rowData, options = {}) {
        const rowElement = options.rowElement || this._findRowElement(rowData)

        if (!rowElement) {
            return
        }

        const textarea = rowElement.querySelector('.i18n-translation-input')
        const checkbox = rowElement.querySelector('.i18n-reviewed-checkbox')
        const saveIndicator = rowElement.querySelector('.i18n-inline-save-indicator')
        const state = rowElement.querySelector('.i18n-row-state')

        if (textarea && options.updateText && textarea.value !== rowData.text) {
            textarea.value = rowData.text
        }

        if (textarea) {
            this._autoResizeTextarea(textarea)
        }

        if (checkbox) {
            const hasText = rowData.text.trim() !== ''
            checkbox.disabled = !hasText
            checkbox.checked = hasText && !!rowData.human_reviewed
        }

        if (saveIndicator) {
            saveIndicator.classList.toggle('is-visible', !!rowData._save_indicator_visible)
        }

        if (state) {
            state.className = 'i18n-row-state'

            if (rowData._save_state === 'error') {
                state.classList.add('i18n-row-state--error')
                state.textContent = t('common.error_save')
            } else {
                state.textContent = ''
            }
        }
    }

    _getRowContextFromElement(element) {
        const rowElement = element.closest('tr')

        if (!rowElement) {
            return null
        }

        const rowData = this._dataTable?.row($(rowElement)).data()

        if (!rowData) {
            return null
        }

        return { rowElement, rowData }
    }

    _findRowElement(rowData) {
        const selectorValue = this._escapeSelectorValue(rowData._row_key)

        return this.tableTarget.querySelector(`tbody tr[data-i18n-row-key="${selectorValue}"]`)
    }

    _rowKey(rowData) {
        return [
            rowData.domain || '',
            rowData.key || '',
            rowData.context || '',
            rowData.locale || rowData._locale || '',
        ].join('|')
    }

    _renderTranslationCell(rowData) {
        return (
            `<div class="i18n-translation-cell">` +
                `<div class="i18n-translation-input-wrap">` +
                    `<textarea class="form-control form-control-sm i18n-translation-input" rows="1" data-row-key="${this._escAttr(rowData._row_key)}">` +
                        `${this._esc(rowData.text || '')}` +
                    `</textarea>` +
                    `<div class="i18n-inline-save-indicator" data-row-key="${this._escAttr(rowData._row_key)}">${renderInlineLoader({ label: t('common.loading'), size: 14, color: '#64748b' })}</div>` +
                `</div>` +
                `<div class="small mt-1 i18n-row-state" data-row-key="${this._escAttr(rowData._row_key)}">${this._renderRowState(rowData)}</div>` +
            `</div>`
        )
    }

    _renderReviewedCell(rowData) {
        const hasText = String(rowData.text || '').trim() !== ''
        const checked = hasText && !!rowData.human_reviewed ? ' checked' : ''
        const disabled = hasText ? '' : ' disabled'

        return (
            `<div class="form-check d-inline-flex justify-content-center m-0">` +
                `<input type="checkbox" class="form-check-input i18n-reviewed-checkbox" data-row-key="${this._escAttr(rowData._row_key)}"${checked}${disabled}>` +
            `</div>`
        )
    }

    _renderActionsCell(rowData) {
        return `<button class="btn btn-sm btn-outline-info i18n-tm-btn" data-row-key="${this._escAttr(rowData._row_key)}">TM</button>`
    }

    _renderRowState(rowData) {
        if (rowData._save_state === 'error') {
            return this._esc(t('common.error_save'))
        }

        return ''
    }

    _hasPendingChanges() {
        return this._dirtyRows.size > 0 || this._saveRequests.size > 0 || this._saveTimers.size > 0
    }

    // -------------------------------------------------------------------------
    // TM suggestions
    // -------------------------------------------------------------------------

    showTm(event) {
        const context = this._getRowContextFromElement(event.currentTarget)

        if (!context) {
            return
        }

        const { rowData } = context
        const locale = this.localeSelectTarget.value
        const requestId = ++this._tmRequestId

        this.tmKeyTarget.textContent = rowData.context
            ? `${rowData.domain}.${rowData.key}.${rowData.context}`
            : `${rowData.domain}.${rowData.key}`
        this.tmMetaTarget.textContent = locale
        this.tmSourceTarget.textContent = rowData.source_text || ''

        $(this.tmExactTarget).html(renderBlockLoader({
            label: t('common.loading'),
            size: 20,
            minHeight: '3.5rem',
        }))
        $(this.tmFuzzyTarget).html(renderBlockLoader({
            label: t('common.loading'),
            size: 22,
            minHeight: '4rem',
        }))

        this.tmBackdropTarget.classList.add('is-open')
        this.tmPanelTarget.classList.add('is-open')
        this.tmPanelTarget.setAttribute('aria-hidden', 'false')
        document.body.classList.add('i18n-tm-open')

        $.get(this.ajaxTmUrlValue, {
            domain: rowData.domain,
            key: rowData.key,
            message_context: rowData.context || '',
            locale,
        })
        .done((response) => {
            if (requestId !== this._tmRequestId) return

            this._renderExactSuggestions(response, rowData, locale)
            this._loadFuzzySuggestions(rowData, locale, requestId)
        })
        .fail(() => {
            if (requestId !== this._tmRequestId) return

            $(this.tmExactTarget).html(`<p class="text-danger mb-0">${t('common.error')}</p>`)
            $(this.tmFuzzyTarget).empty()
        })
    }

    _loadFuzzySuggestions(rowData, locale, requestId) {
        $(this.tmFuzzyTarget).html(renderBlockLoader({
            label: t('common.loading'),
            size: 22,
            minHeight: '4rem',
        }))

        $.get(this.ajaxTmFuzzyUrlValue, {
            domain: rowData.domain,
            key: rowData.key,
            message_context: rowData.context || '',
            locale,
        })
        .done((response) => {
            if (requestId !== this._tmRequestId) return

            this._renderSuggestionList($(this.tmFuzzyTarget), response.suggestions || [], rowData, locale, {
                emptyLabel: t('admin.i18n.tm.no_similar_matches'),
                includeSimilarity: true,
                includeSourceExample: true,
            })
        })
        .fail(() => {
            if (requestId !== this._tmRequestId) return

            $(this.tmFuzzyTarget).html(`<p class="text-danger mb-0">${t('common.error')}</p>`)
        })
    }

    _renderExactSuggestions(response, rowData, locale) {
        this._renderSuggestionList($(this.tmExactTarget), response.suggestions || [], rowData, locale, {
            emptyLabel: t('admin.i18n.tm.no_exact_matches'),
            includeSimilarity: false,
            includeSourceExample: false,
        })
    }

    _renderSuggestionList($container, suggestions, rowData, locale, options = {}) {
        $container.empty()

        if (!suggestions.length) {
            $container.html(`<p class="i18n-tm-empty mb-0">${this._esc(options.emptyLabel || t('workbench.tm_no_results'))}</p>`)
            return
        }

        suggestions.forEach((suggestion) => {
            const $item = $('<article class="i18n-tm-item">')
            const $apply = $(`<button class="btn btn-sm btn-success">${t('workbench.tm_apply')}</button>`)
            const $top = $('<div class="i18n-tm-item__top">')
            const originPath = [suggestion.domain || '', suggestion.source_key || '', suggestion.context || '']
                .filter(Boolean)
                .join('.')

            $top.append(`<div class="i18n-tm-item__text">${this._esc(suggestion.target_text)}</div>`)
            $top.append($('<div class="i18n-tm-item__actions">').append($apply))
            $item.append($top)
            $item.append(`<div class="i18n-tm-item__meta">${this._esc(suggestion.quality_score)} · ${suggestion.usage_count} ${t('workbench.tm_uses')}</div>`)
            $item.append(
                `<div class="i18n-tm-item__origin"><span class="i18n-tm-item__origin-label">${this._esc(t('admin.i18n.tm.origin'))}:</span>${this._esc(originPath)}</div>`
            )

            if (options.includeSourceExample && suggestion.source_text_raw) {
                $item.append(
                    `<div class="i18n-tm-item__source"><strong>${this._esc(t('admin.i18n.tm.source_example'))}:</strong> ${this._esc(suggestion.source_text_raw)}</div>`
                )
            }

            const badges = []

            if (options.includeSimilarity && typeof suggestion.similarity_percent === 'number') {
                badges.push(`<span class="i18n-tm-item__badge i18n-tm-item__badge--similarity">${this._esc(t('admin.i18n.tm.similarity'))}: ${suggestion.similarity_percent}%</span>`)
            }

            if (suggestion.safety === 'review_placeholders') {
                badges.push(`<span class="i18n-tm-item__badge i18n-tm-item__badge--review">${this._esc(t('admin.i18n.tm.review_placeholders'))}</span>`)
            } else {
                badges.push(`<span class="i18n-tm-item__badge i18n-tm-item__badge--safe">${this._esc(t('admin.i18n.tm.safe'))}</span>`)
            }

            $item.append(`<div class="i18n-tm-item__badges">${badges.join('')}</div>`)

            $apply.on('click', () => {
                rowData.text = String(suggestion.target_text || '')
                rowData.human_reviewed = false
                rowData._save_state = ''
                this._dirtyRows.add(rowData._row_key)
                this._syncVisibleRow(rowData, { updateText: true })
                this._scheduleSave(rowData, 0)
                this.closeTmPanel()
            })

            $container.append($item)
        })
    }

    closeTmPanel() {
        this._tmRequestId += 1
        this.tmBackdropTarget.classList.remove('is-open')
        this.tmPanelTarget.classList.remove('is-open')
        this.tmPanelTarget.setAttribute('aria-hidden', 'true')
        document.body.classList.remove('i18n-tm-open')
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    _esc(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
    }

    _escAttr(value) {
        return this._esc(value).replace(/'/g, '&#39;')
    }

    _escapeSelectorValue(value) {
        return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    }

    _showSaveIndicator(rowData) {
        const existingTimer = this._saveIndicatorTimers.get(rowData._row_key)

        if (existingTimer) {
            clearTimeout(existingTimer)
            this._saveIndicatorTimers.delete(rowData._row_key)
        }

        rowData._save_indicator_visible = true
        rowData._save_indicator_started_at = Date.now()
    }

    _hideSaveIndicator(rowData) {
        const existingTimer = this._saveIndicatorTimers.get(rowData._row_key)

        if (existingTimer) {
            clearTimeout(existingTimer)
        }

        const elapsedMs = Math.max(Date.now() - Number(rowData._save_indicator_started_at || 0), 0)
        const delayMs = Math.max(200 - elapsedMs, 0)

        const timerId = window.setTimeout(() => {
            rowData._save_indicator_visible = false
            this._saveIndicatorTimers.delete(rowData._row_key)
            this._syncVisibleRow(rowData)
        }, delayMs)

        this._saveIndicatorTimers.set(rowData._row_key, timerId)
    }

    _autoResizeVisibleTextareas() {
        this.tableTarget
            .querySelectorAll('.i18n-translation-input')
            .forEach((textarea) => this._autoResizeTextarea(textarea))
    }

    _autoResizeTextarea(textarea) {
        textarea.style.height = 'auto'
        textarea.style.height = `${textarea.scrollHeight}px`
    }

    _debounce(fn, delay) {
        let timerId

        return (...args) => {
            clearTimeout(timerId)
            timerId = setTimeout(() => fn.apply(this, args), delay)
        }
    }
}
