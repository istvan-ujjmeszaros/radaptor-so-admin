/**
 * JstreeMainmenuController - Main menu tree browser
 *
 * Manages the main navigation menu structure using jsTree 3.x.
 * Types: root, submenu, title (mainmenu has title nodes).
 */
import JstreeBaseController from "./jstree-base-controller.js"

export default class extends JstreeBaseController {
    getDeleteEventName() {
        return 'mainmenuTreeDeleted'
    }

    getErrorEventName() {
        return 'mainmenuTreeError'
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
                        // Prevent moving root
                        if (node.type === 'root') return false
                        // Prevent moving to root level (parent must exist)
                        if (parent.id === '#') return false
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
            plugins: ['state', 'dnd', 'types', 'wholerow'],
            state: {
                key: 'jstree_' + this.jstreeIdValue,
                events: 'open_node.jstree close_node.jstree select_node.jstree'
            },
            types: {
                'default': { icon: 'jstree-file' },
                'root': { icon: 'jstree-folder', valid_children: ['submenu', 'title'] },
                'submenu': { icon: 'jstree-file', valid_children: ['submenu'] },
                'title': { icon: 'jstree-file', valid_children: ['submenu'] }
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
