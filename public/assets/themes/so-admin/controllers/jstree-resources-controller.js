/**
 * JstreeResourcesController - Resources/Site Structure browser
 *
 * Features:
 * - State persistence via localStorage
 * - Lazy-loading children via AJAX
 * - Drag-drop with type validation
 * - Detail panel on selection
 * - htmx delete integration
 */
import JstreeBaseController from "./jstree-base-controller.js"

export default class extends JstreeBaseController {
    getDeleteEventName() {
        return 'resourceTreeDeleted'
    }

    getErrorEventName() {
        return 'resourceTreeError'
    }

    getJstreeConfig() {
        return {
            core: {
                force_text: true,
                themes: {
                    name: 'default',
                    dots: true,
                    responsive: false,
                    variant: 'large'
                },
                check_callback: (operation, node, parent, position, more) => {
                    if (operation === 'move_node') {
                        // Prevent moving to root level
                        if (parent.id === '#') return false
                        // Prevent reordering within same parent
                        if (node.parent === parent.id) return false
                        return true
                    }
                    return true
                },
                data: {
                    url: () => this.ajaxUrlValue,
                    data: (node) => ({
                        id: node.id,
                        id_prefix: this.jstreeIdValue,
                        version: '3',
                        shape_template: 'jstree_3'
                    }),
                    dataFilter: (data) => this.unwrapApiData(data)
                }
            },
            plugins: ['state', 'dnd', 'types', 'wholerow', 'sort'],
            sort: function(a, b) {
                const nodeA = this.get_node(a)
                const nodeB = this.get_node(b)
                // Folders before files
                if (nodeA.type === 'folder' && nodeB.type !== 'folder') return -1
                if (nodeA.type !== 'folder' && nodeB.type === 'folder') return 1
                // Alphabetical within same type
                return this.get_text(a).localeCompare(this.get_text(b))
            },
            state: {
                key: 'jstree_' + this.jstreeIdValue,
                events: 'open_node.jstree close_node.jstree select_node.jstree'
            },
            types: {
                'default': { icon: 'bi bi-file-earmark' },
                'root': { icon: 'bi bi-globe', valid_children: ['folder', 'webpage', 'file'] },
                'folder': { icon: 'bi bi-folder', valid_children: ['folder', 'webpage', 'file'] },
                'webpage': { icon: 'bi bi-file-earmark-text', valid_children: [] },
                'file': { icon: 'bi bi-file-earmark', valid_children: [] }
            },
            dnd: {
                check_while_dragging: true,
                inside_pos: 'last',
                large_drop_target: true,
                large_drag_target: true
            }
        }
    }

    setupEventHandlers() {
        const $tree = this.$tree

        // Selection change -> load detail panel
        $tree.on('changed.jstree', (e, data) => {
            if (data.selected.length > 0) {
                this.loadDetailPanel(data.selected)
            }
        })

        // Move node -> persist to backend
        $tree.on('move_node.jstree', (e, data) => {
            this.handleMove(data)
        })

        // Double-click to navigate (for webpages)
        $tree.on('dblclick.jstree', '.jstree-anchor', function(e) {
            const node = $tree.jstree('get_node', this)
            if (node && node.type === 'webpage' && node.data && node.data.path) {
                const url = node.data.path + node.data.resource_name
                window.open(url, '_blank')
            }
        })

        // Handle delete event from htmx
        this._deleteHandler = (e) => this.handleDelete(e)
        document.body.addEventListener(this.getDeleteEventName(), this._deleteHandler)

        // Handle error event
        this._errorHandler = (e) => this.handleError(e)
        document.body.addEventListener(this.getErrorEventName(), this._errorHandler)
    }
}
