/**
 * Widget Controller
 * Handles widget selection in edit mode
 */
import { Controller } from "/assets/themes/so-admin/js/stimulus.js"

export default class extends Controller {
    /**
     * Handle widget selection (click)
     * Stops propagation to prevent parent widgets from also being selected
     */
    select(event) {
        event.stopPropagation()
    }
}
