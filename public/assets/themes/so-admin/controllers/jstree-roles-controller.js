/**
 * JstreeRolesController - Roles browser
 *
 * Same pattern as Resources/Usergroups but with role-specific types.
 */
import JstreeBaseController from "./jstree-base-controller.js"

export default class extends JstreeBaseController {
    getDeleteEventName() {
        return 'roleTreeDeleted'
    }

    getErrorEventName() {
        return 'roleTreeError'
    }

    getJstreeConfig() {
        return {
            core: {
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
            state: {
                key: 'jstree_' + this.jstreeIdValue,
                events: 'open_node.jstree close_node.jstree select_node.jstree'
            },
            types: {
                'default': { icon: 'bi bi-shield-check' },
                'root': { icon: 'bi bi-shield', valid_children: ['role'] },
                'role': { icon: 'bi bi-shield-check', valid_children: ['role'] }
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

        // Handle delete event from htmx
        this._deleteHandler = (e) => this.handleDelete(e)
        document.body.addEventListener(this.getDeleteEventName(), this._deleteHandler)

        // Handle error event
        this._errorHandler = (e) => this.handleError(e)
        document.body.addEventListener(this.getErrorEventName(), this._errorHandler)
    }
}
