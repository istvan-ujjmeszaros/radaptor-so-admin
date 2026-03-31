/**
 * ACL Selector Controller
 *
 * Handles resource ACL (Access Control List) management:
 * - Inheritance toggle (inherit permissions from parent)
 * - User/usergroup autocomplete search
 * - Adding subjects to ACL
 * - Permission checkbox changes
 * - Deleting ACL entries
 *
 * Visual feedback:
 * - Buttons show spinner during request
 * - Checkboxes are disabled during save, flash red on error
 * - Rows fade out on successful delete
 * - Success messages trigger the global "Saved" indicator via renderSystemMessages()
 */
import { Controller } from "/assets/packages/themes/so-admin/js/stimulus.js"

export default class extends Controller {
    static targets = [
        'inheritCheckbox',
        'inheritedPanel',
        'inheritedTable',
        'inheritedBody',
        'specificTable',
        'specificBody',
        'autocompleteInput',
        'addButton',
        'inputError'
    ]

    static values = {
        ajaxUrl: String,
        inheriting: Boolean
    }

    connect() {
        this._selectedObject = null
        this._checkboxValues = {}

        // Wait for jQuery UI to load
        this.initAttempts = 0
        this.maxAttempts = 50
        this.waitForJQueryUI()
    }

    disconnect() {
        // Destroy autocomplete if initialized
        if (this.hasAutocompleteInputTarget && this._autocompleteInitialized) {
            try {
                $(this.autocompleteInputTarget).autocomplete('destroy')
            } catch (e) {
                // Ignore if already destroyed
            }
        }
    }

    waitForJQueryUI() {
        if (typeof $ !== 'undefined' && typeof $.ui !== 'undefined' && typeof $.ui.autocomplete !== 'undefined') {
            this.initialize()
            return
        }

        this.initAttempts++
        if (this.initAttempts < this.maxAttempts) {
            setTimeout(() => this.waitForJQueryUI(), 100)
        } else {
            console.error('jQuery UI autocomplete failed to load after 5 seconds')
            // Still initialize tables without autocomplete
            this.loadTables()
        }
    }

    initialize() {
        this.initAutocomplete()
        this.loadTables()
    }

    /**
     * Initialize jQuery UI autocomplete
     */
    initAutocomplete() {
        const self = this
        const $input = $(this.autocompleteInputTarget)

        $input.autocomplete({
            source: (request, response) => {
                $.getJSON(this.ajaxUrlValue + 'ObjectListAutocomplete', {
                    term: request.term
                }, response)
            },
            minLength: 1,
            select: (event, ui) => {
                // Store selected object data
                this._selectedObject = {
                    type: ui.item.object_type,
                    name: ui.item.object_name
                }
                // Display clean name (strip HTML)
                $input.val(this.stripTags(ui.item.object_name))
                return false
            },
            focus: () => false
        })

        // Custom rendering for autocomplete items
        const autocomplete = $input.data('ui-autocomplete')
        if (autocomplete) {
            autocomplete._renderItem = function(ul, item) {
                // Bold matching text
                const searchTerm = $.ui.autocomplete.escapeRegex($.trim(this.term))
                const label = item.object_name.replace(
                    new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + searchTerm + ")(?![^<>]*>)(?![^&;]+;)", "gi"),
                    "<strong>$1</strong>"
                )

                // Icon based on type
                let icon = ''
                if (item.object_type === 'user') {
                    icon = '<i class="bi bi-person me-2"></i>'
                } else if (item.object_type === 'usergroup') {
                    icon = '<i class="bi bi-people me-2"></i>'
                }

                return $('<li></li>')
                    .data('item.autocomplete', item)
                    .append('<div class="autocomplete-item">' + icon + label + '</div>')
                    .appendTo(ul)
            }
        }

        // Clear selected object on typing
        $input.on('keyup', (e) => {
            if (e.keyCode !== $.ui.keyCode.ENTER && e.keyCode !== $.ui.keyCode.TAB) {
                this._selectedObject = null
                this.hideInputError()
            }
        })

        // Submit on Enter
        $input.on('keydown', (e) => {
            if (e.keyCode === $.ui.keyCode.ENTER) {
                e.preventDefault()
                this.addSubject()
            }
        })

        this._autocompleteInitialized = true
    }

    /**
     * Load both inherited and specific tables
     */
    loadTables() {
        this.loadInheritedTable()
        this.loadSpecificTable()
    }

    /**
     * Load inherited permissions table
     */
    loadInheritedTable() {
        if (!this.hasInheritedBodyTarget) return

        fetch(this.ajaxUrlValue + 'SubjectList&type=inherited')
            .then(response => response.json())
            .then(payload => {
                if (!payload || payload.ok !== true) {
                    throw new Error(payload?.error?.message || 'Failed to load inherited ACL')
                }
                this.renderTable(this.inheritedBodyTarget, payload.data?.aaData, true)
            })
            .catch(error => {
                console.error('Failed to load inherited ACL:', error)
                this.inheritedBodyTarget.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Hiba a betöltés közben</td></tr>'
            })
    }

    /**
     * Load specific permissions table
     */
    loadSpecificTable() {
        if (!this.hasSpecificBodyTarget) return

        fetch(this.ajaxUrlValue + 'SubjectList&type=specific')
            .then(response => response.json())
            .then(payload => {
                if (!payload || payload.ok !== true) {
                    throw new Error(payload?.error?.message || 'Failed to load specific ACL')
                }
                this.renderTable(this.specificBodyTarget, payload.data?.aaData, false)
            })
            .catch(error => {
                console.error('Failed to load specific ACL:', error)
                this.specificBodyTarget.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Hiba a betöltés közben</td></tr>'
            })
    }

    /**
     * Render table rows from API data
     */
    renderTable(tbody, data, readonly) {
        if (!data || data.length === 0) {
            const colspan = readonly ? 6 : 7
            tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center text-muted">Nincs megjeleníthető elem</td></tr>`
            return
        }

        let html = ''
        data.forEach(row => {
            // row[0] = name with icon (HTML)
            // row[1-5] = checkbox HTML
            // row[6] = acl_id
            const aclId = row[6]

            html += '<tr>'
            html += `<td class="col-subject">${row[0]}</td>`

            // Permission columns (already contain checkbox HTML from server)
            for (let i = 1; i <= 5; i++) {
                html += `<td class="col-perm text-center">${row[i]}</td>`
            }

            // Delete button (only for specific, not inherited)
            if (!readonly) {
                html += `<td class="col-actions text-center">
                    <button type="button" class="btn btn-sm btn-outline-danger"
                            data-action="click->acl-selector#deleteAcl"
                            data-acl-id="${aclId}"
                            title="Törlés">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>`
            }

            html += '</tr>'
        })

        tbody.innerHTML = html

        // Bind checkbox change events for specific table (not readonly)
        if (!readonly) {
            tbody.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => this.handleCheckboxChange(e))
            })
        }
    }

    /**
     * Toggle inheritance setting
     */
    toggleInheritance() {
        const checked = this.inheritCheckboxTarget.checked ? 1 : 0

        fetch(this.ajaxUrlValue + 'SetInheritance&inheritance=' + checked)
            .then(response => response.json())
            .then(result => {
                if (!result || result.ok !== true) {
                    throw new Error(result?.error?.message || 'Failed to toggle inheritance')
                }
                // Toggle panel visibility with animation
                if (checked) {
                    this.inheritedPanelTarget.classList.add('is-visible')
                    // Reload inherited table
                    this.loadInheritedTable()
                } else {
                    this.inheritedPanelTarget.classList.remove('is-visible')
                }
                this.showSaved()
            })
            .catch(error => {
                console.error('Failed to toggle inheritance:', error)
                // Revert checkbox on error
                this.inheritCheckboxTarget.checked = !this.inheritCheckboxTarget.checked
                this.flashElement(this.inheritCheckboxTarget.closest('.form-check'), false)
                this.showError(error.message)
            })
    }

    /**
     * Handle permission checkbox change with element-level feedback
     */
    handleCheckboxChange(event) {
        const checkbox = event.target
        const aclId = checkbox.dataset.acl_id
        const operation = checkbox.dataset.operation
        const checked = checkbox.checked ? 1 : 0
        const originalState = !checkbox.checked // State before user clicked

        // Prevent duplicate saves
        const key = aclId + '_' + operation
        if (this._checkboxValues[key] === checked) return
        this._checkboxValues[key] = checked

        // Add saving state - disable checkbox during request
        checkbox.disabled = true

        const url = this.ajaxUrlValue + 'SetOperation&acl_id=' + aclId +
                    '&operation=' + operation + '&checked=' + checked

        fetch(url)
            .then(response => response.json())
            .then(result => {
                if (!result || result.ok !== true) {
                    // Revert and flash red
                    checkbox.checked = originalState
                    this._checkboxValues[key] = originalState ? 1 : 0
                    this.flashElement(checkbox.closest('td'), false)
                    this.showError(result?.error?.message)
                } else {
                    this.showSaved()
                }
            })
            .catch(error => {
                console.error('Failed to save operation:', error)
                // Revert and flash red
                checkbox.checked = originalState
                this._checkboxValues[key] = originalState ? 1 : 0
                this.flashElement(checkbox.closest('td'), false)
                this.showError()
            })
            .finally(() => {
                checkbox.disabled = false
            })
    }

    /**
     * Add a new subject (user/usergroup) to ACL with element-level feedback
     */
    addSubject() {
        const input = this.autocompleteInputTarget
        const value = input.value.trim()

        if (!value) return

        // Get button and show spinner
        const button = this.hasAddButtonTarget ? this.addButtonTarget : this.element.querySelector('[data-action*="addSubject"]')
        const icon = button?.querySelector('i')
        const originalIcon = icon?.className

        if (icon) {
            icon.className = 'bi bi-arrow-repeat spin'
        }
        if (button) {
            button.disabled = true
        }

        // Hide any previous error
        this.hideInputError()

        // Use stored object if selected from autocomplete, otherwise send as unknown
        const objectType = this._selectedObject?.type || 'unknown'
        const objectName = this._selectedObject?.name || value

        const url = this.ajaxUrlValue + 'AddObject&object_type=' + encodeURIComponent(objectType) +
                    '&object_name=' + encodeURIComponent(this.stripTags(objectName))

        fetch(url)
            .then(response => response.json())
            .then(result => {
                if (result && result.ok === true) {
                    input.value = ''
                    this._selectedObject = null
                    // Reload specific table
                    this.loadSpecificTable()
                    this.showSaved()
                } else {
                    // Show inline error + flash
                    if (button) {
                        this.flashElement(button, false)
                    }
                    this.showInputError(result?.error?.message || 'Hiba történt a hozzáadás során')
                    this.showError(result?.error?.message)
                }
            })
            .catch(error => {
                console.error('Failed to add subject:', error)
                if (button) {
                    this.flashElement(button, false)
                }
                this.showInputError('Hiba történt a hozzáadás során')
                this.showError()
            })
            .finally(() => {
                if (icon && originalIcon) {
                    icon.className = originalIcon
                }
                if (button) {
                    button.disabled = false
                }
            })
    }

    /**
     * Delete an ACL entry with element-level feedback
     */
    deleteAcl(event) {
        const button = event.currentTarget
        const aclId = button.dataset.aclId
        const icon = button.querySelector('i')
        const originalIcon = icon?.className
        const row = button.closest('tr')

        if (!confirm('Biztosan törli ezt a hozzárendelést?')) {
            return
        }

        // Show spinner
        if (icon) {
            icon.className = 'bi bi-arrow-repeat spin'
        }
        button.disabled = true

        fetch(this.ajaxUrlValue + 'DeleteAcl&acl_id=' + aclId)
            .then(response => response.json())
            .then(result => {
                if (result && result.ok === true) {
                    // Fade out row, then reload table
                    if (row) {
                        row.classList.add('removing')
                        setTimeout(() => this.loadSpecificTable(), 300)
                    } else {
                        this.loadSpecificTable()
                    }
                    this.showSaved()
                } else {
                    this.flashElement(button, false)
                    this.showError(result?.error?.message)
                }
            })
            .catch(error => {
                console.error('Failed to delete ACL:', error)
                this.flashElement(button, false)
                this.showError()
            })
            .finally(() => {
                if (icon && originalIcon) {
                    icon.className = originalIcon
                }
                button.disabled = false
            })
    }

    /**
     * Flash an element with success or error animation
     */
    flashElement(element, success = true) {
        if (!element) return
        const className = success ? 'flash-success' : 'flash-error'
        element.classList.add(className)
        setTimeout(() => element.classList.remove(className), 400)
    }

    /**
     * Show inline error below the autocomplete input
     */
    showInputError(message) {
        if (this.hasInputErrorTarget) {
            this.inputErrorTarget.textContent = message
            this.inputErrorTarget.classList.add('is-visible')
        }
        // Auto-hide after 3 seconds
        setTimeout(() => this.hideInputError(), 3000)
    }

    /**
     * Hide inline error
     */
    hideInputError() {
        if (this.hasInputErrorTarget) {
            this.inputErrorTarget.classList.remove('is-visible')
        }
    }

    /**
     * Show brief "Saved" indicator via global event
     */
    showSaved() {
        document.body.dispatchEvent(new CustomEvent('status:saved'))
    }

    /**
     * Show error via toast notification (for errors that need explanation)
     */
    showError(message) {
        const container = document.getElementById('flash-messages')
        if (container && typeof createFlashMessage === 'function') {
            const flash = createFlashMessage({
                type: 'error',
                header: 'Hiba',
                body: message || 'Ismeretlen hiba történt.'
            })
            container.appendChild(flash)
            return
        }

        if (typeof renderSystemMessages === 'function') {
            renderSystemMessages()
        }
    }

    /**
     * Strip HTML tags from string
     */
    stripTags(html) {
        const tmp = document.createElement('div')
        tmp.innerHTML = html
        return tmp.textContent || tmp.innerText || ''
    }
}
