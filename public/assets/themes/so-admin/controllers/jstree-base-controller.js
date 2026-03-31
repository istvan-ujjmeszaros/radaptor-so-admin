/**
 * JstreeBaseController - Shared functionality for all jsTree controllers
 *
 * Provides:
 * - waitForJstree() - polls until jsTree is loaded
 * - State persistence via localStorage
 * - Common event handler setup/teardown
 *
 * This is exported for subclasses to extend.
 */
import { Controller } from "/assets/packages/themes/so-admin/js/stimulus.js"
import { t } from "/assets/packages/themes/so-admin/js/i18n.js"
import { renderBlockLoader } from "/assets/packages/themes/so-admin/js/async-loader.js"

export default class JstreeBaseController extends Controller {
    static values = {
        jstreeId: String,
        pageId: String,
        ajaxUrl: String,
        moveUrl: String,
        detailUrl: String,
        deleteUrl: String
    }

    connect() {
        this.initAttempts = 0
        this.maxAttempts = 50 // 5 seconds max wait
        this.waitForJstree()
    }

    disconnect() {
        // Remove event listeners
        if (this._deleteHandler) {
            document.body.removeEventListener(this.getDeleteEventName(), this._deleteHandler)
        }
        if (this._errorHandler) {
            document.body.removeEventListener(this.getErrorEventName(), this._errorHandler)
        }

        // Destroy jsTree instance
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

    /**
     * Override in subclasses to provide jsTree configuration
     */
    getJstreeConfig() {
        throw new Error('Subclasses must implement getJstreeConfig()')
    }

    /**
     * Override in subclasses to provide delete event name
     */
    getDeleteEventName() {
        return 'treeDeleted'
    }

    /**
     * Override in subclasses to provide error event name
     */
    getErrorEventName() {
        return 'treeError'
    }

    initializeTree() {
        const $tree = $(this.element)
        this.$tree = $tree

        $tree.jstree(this.getJstreeConfig())

        // Setup event handlers
        this.setupEventHandlers()
    }

    setupEventHandlers() {
        // Subclasses override this
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
     * Load detail panel content for selected nodes
     */
    loadDetailPanel(ids) {
        const panelId = 'dina_content' + this.jstreeIdValue
        let $panel = $('#' + panelId)
        if (!$panel.length) {
            $panel = $('#dina_content')
        }
        if (!$panel.length) return

        $panel.html(renderBlockLoader({
            label: t('common.loading'),
            size: 20,
            minHeight: '4rem',
        }))

        // Get node type from the tree
        let nodeType = 'null'
        if (ids.length === 1) {
            const node = this.$tree.jstree('get_node', ids[0])
            if (node) {
                nodeType = node.type || 'null'
            }
        } else if (ids.length > 1) {
            nodeType = '_multiple_'
        }

        // Build POST data properly for array
        const params = new URLSearchParams()
        ids.forEach(id => params.append('id[]', id))
        params.append('type', nodeType)
        params.append('jstree_id', this.jstreeIdValue)

        fetch(this.detailUrlValue, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params
        })
        .then(response => response.text())
        .then(html => {
            $panel.html(html)
            // Process htmx attributes in new content
            if (typeof htmx !== 'undefined') {
                htmx.process($panel[0])
            }
        })
        .catch(error => {
            console.error('Failed to load detail panel:', error)
            $panel.html('<div class="alert alert-danger">Failed to load details</div>')
        })
    }

    /**
     * Handle node move - persist to backend
     */
    handleMove(data) {
        const params = new URLSearchParams({
            id: data.node.id,
            ref: data.parent,
            position: data.position
        })

        fetch(this.moveUrlValue + '&' + params.toString())
            .then(response => response.json())
            .then(result => {
                if (!result || result.ok !== true) {
                    console.error('Move failed:', result)
                    this.$tree.jstree('refresh')
                }
            })
            .catch(error => {
                console.error('Move failed:', error)
                this.$tree.jstree('refresh')
            })
    }

    /**
     * Handle delete event from htmx button
     */
    handleDelete(event) {
        const detail = event.detail
        // Support both single nodeId and array nodeIds
        const nodeIds = detail.nodeIds || (detail.nodeId ? [detail.nodeId] : [])

        if (nodeIds.length > 0) {
            let lastParentId = null

            nodeIds.forEach(nodeId => {
                const node = this.$tree.jstree('get_node', String(nodeId))

                if (node) {
                    // Get parent before deleting
                    lastParentId = node.parent
                    // Remove node from tree
                    this.$tree.jstree('delete_node', node)
                }
            })

            // Select parent node (triggers changed.jstree which loads panel)
            if (lastParentId && lastParentId !== '#') {
                this.$tree.jstree('select_node', lastParentId)
            }

            // Show saved indicator for successful delete
            document.body.dispatchEvent(new CustomEvent('status:saved'))
        }
    }

    /**
     * Handle error event
     */
    handleError(event) {
        console.error('Tree operation failed:', event.detail)
        this.$tree.jstree('refresh')

        const message = event.detail?.message || 'Tree operation failed'
        const container = document.getElementById('flash-messages')
        if (container && typeof createFlashMessage === 'function') {
            const flash = createFlashMessage({
                type: 'error',
                header: 'Hiba',
                body: message
            })
            container.appendChild(flash)
        } else if (typeof renderSystemMessages === 'function') {
            renderSystemMessages()
        }
    }
}
