/**
 * CodeMirror Controller
 * Code editor using CodeMirror 6 (dynamic ES module loading)
 */
import { Controller } from "/assets/themes/so-admin/js/stimulus.js"

export default class extends Controller {
    static targets = ["editor", "textarea"]

    async connect() {
        try {
            const { EditorView, basicSetup } = await import("https://cdn.jsdelivr.net/npm/codemirror@6.0.1/+esm")
            const { php } = await import("https://cdn.jsdelivr.net/npm/@codemirror/lang-php@6.0.1/+esm")

            this.view = new EditorView({
                doc: this.textareaTarget.value,
                extensions: [
                    basicSetup,
                    php(),
                    EditorView.updateListener.of(update => {
                        if (update.docChanged) {
                            this.textareaTarget.value = update.state.doc.toString()
                        }
                    })
                ],
                parent: this.editorTarget
            })
        } catch (error) {
            console.error('CodeMirror initialization error:', error)
        }
    }

    disconnect() {
        if (this.view) {
            this.view.destroy()
        }
    }
}
