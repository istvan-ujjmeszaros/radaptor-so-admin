/**
 * CKEditor Controller
 * WYSIWYG editor using CKEditor 5
 *
 * Waits for CKEditor to load since it may be included after this controller.
 */
import { Controller } from "/assets/packages/themes/so-admin/js/stimulus.js"

export default class extends Controller {
    connect() {
        this.initAttempts = 0
        this.maxAttempts = 50 // 5 seconds max wait
        this.waitForCKEditor()
    }

    waitForCKEditor() {
        if (typeof ClassicEditor !== 'undefined') {
            this.initializeEditor()
            return
        }

        this.initAttempts++
        if (this.initAttempts < this.maxAttempts) {
            setTimeout(() => this.waitForCKEditor(), 100)
        } else {
            console.error('CKEditor 5 library failed to load after 5 seconds')
        }
    }

    initializeEditor() {
        ClassicEditor.create(this.element, {
            language: 'hu'
        }).then(editor => {
            this.editor = editor
        }).catch(error => {
            console.error('CKEditor initialization error:', error)
        })
    }

    disconnect() {
        if (this.editor) {
            this.editor.destroy()
        }
    }
}
