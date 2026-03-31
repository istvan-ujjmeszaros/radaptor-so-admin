/**
 * JstreeSelectorBaseController - Base for selector trees (checkboxes)
 *
 * Different from browser controllers:
 * - Uses checkbox plugin instead of state/dnd
 * - Saves on check/uncheck immediately
 * - No detail panel
 *
 * This is exported for subclasses to extend.
 */
import { Controller } from "/assets/themes/so-admin/js/stimulus.js"

export default class JstreeSelectorBaseController extends Controller {
    static values = {
        ajaxUrl: String,
        addUrl: String,
        removeUrl: String
    }

    connect() {
        this.initAttempts = 0
        this.maxAttempts = 50
        this.waitForJstree()
    }

    disconnect() {
        if (this.$tree) {
            $(this.element).jstree('destroy')
            this.$tree = null
        }
    }

    waitForJstree() {
        if (typeof $ !== 'undefined' && typeof $.fn.jstree !== 'undefined') {
            this.initializeTree()
            return
        }

        this.initAttempts++
        if (this.initAttempts < this.maxAttempts) {
            setTimeout(() => this.waitForJstree(), 100)
        } else {
            console.error('jsTree library failed to load after 5 seconds')
        }
    }

    getJstreeConfig() {
        throw new Error('Subclasses must implement getJstreeConfig()')
    }

    initializeTree() {
        const $tree = $(this.element)
        this.$tree = $tree
        this._ready = false

        $tree.jstree(this.getJstreeConfig())

        // Open all nodes after load
        $tree.on('ready.jstree', (e, data) => {
            data.instance.open_all()
            // Mark ready after initial state is loaded
            setTimeout(() => { this._ready = true }, 100)
        })

        // Use check_node/uncheck_node events instead of select_node/deselect_node
        // These are specific to checkbox plugin and won't fire during initial load
        $tree.on('check_node.jstree', (e, data) => {
            if (this._ready) {
                this.saveAssignment(data.node.id, true)
            }
        })

        $tree.on('uncheck_node.jstree', (e, data) => {
            if (this._ready) {
                this.saveAssignment(data.node.id, false)
            }
        })

        // Handle keyboard toggle: Space/Enter toggles checkbox on focused node
        // (since tie_selection is false, selection doesn't auto-check)
        this.element.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                const inst = $tree.jstree(true)
                // Try hovered first (keyboard nav), then selected, then focused anchor
                let node = inst.get_node(inst.element.find('.jstree-hovered'))
                if (!node) {
                    const selected = inst.get_selected(true)
                    if (selected.length > 0) {
                        node = selected[0]
                    }
                }
                if (!node) {
                    // Check for focused anchor element
                    const focused = this.element.querySelector('.jstree-anchor:focus')
                    if (focused) {
                        node = inst.get_node(focused)
                    }
                }
                if (node) {
                    e.preventDefault()
                    if (inst.is_checked(node)) {
                        inst.uncheck_node(node)
                    } else {
                        inst.check_node(node)
                    }
                }
            }
        })
    }

    unwrapApiData(rawData) {
        try {
            const payload = JSON.parse(rawData)
            if (payload && payload.ok === true) {
                return JSON.stringify(payload.data || [])
            }
        } catch (e) {
            // fall through
        }

        return JSON.stringify([])
    }

    /**
     * Override in subclasses to provide the param name (role_id, usergroup_id)
     */
    getParamName() {
        throw new Error('Subclasses must implement getParamName()')
    }

    saveAssignment(itemId, isAdding) {
        const url = isAdding ? this.addUrlValue : this.removeUrlValue
        const params = new URLSearchParams()
        params.append(this.getParamName(), itemId)

        fetch(url + '&' + params.toString())
            .then(response => response.json())
            .then(result => {
                if (!result || result.ok !== true) {
                    console.error('Assignment failed:', result)
                    this.showError(result?.error?.message)
                    return
                }

                document.body.dispatchEvent(new CustomEvent('status:saved'))
            })
            .catch(error => {
                console.error('Assignment AJAX error:', error)
                this.showError()
            })
    }

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
}
