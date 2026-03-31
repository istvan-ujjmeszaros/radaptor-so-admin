/**
 * JstreeRoleSelectorController - Role selector with checkboxes
 */
import JstreeSelectorBaseController from "./jstree-selector-base-controller.js"

export default class extends JstreeSelectorBaseController {
    getParamName() {
        return 'role_id'
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
                check_callback: true,
                data: {
                    url: () => this.ajaxUrlValue,
                    data: (node) => ({
                        id: node.id,
                        version: '3',
                        shape_template: 'jstree_3'
                    }),
                    dataFilter: (data) => this.unwrapApiData(data)
                }
            },
            plugins: ['checkbox', 'types', 'sort'],
            checkbox: {
                three_state: false,
                cascade: '',
                whole_node: false,
                tie_selection: false
            },
            types: {
                'default': { icon: 'bi bi-shield-check' },
                'role': { icon: 'bi bi-shield-check' }
            }
        }
    }
}
