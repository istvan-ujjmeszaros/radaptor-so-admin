import { Controller } from "/assets/packages/themes/so-admin/js/stimulus.js"

export default class extends Controller {
    static targets = ["source", "status"]
    static values = {
        jsonUrl: String,
        previewComponent: String,
        previewSlot: {
            type: String,
            default: "preview",
        },
    }

    async connect() {
        await this.load()
    }

    async load() {
        if (!this.hasJsonUrlValue) {
            this.renderStatus("Missing JSON preview URL.", "danger")
            return
        }

        this.renderStatus("Loading JSON preview…", "secondary")

        try {
            const response = await fetch(this.jsonUrlValue, {
                headers: {
                    Accept: "application/json",
                },
            })
            const sourceText = await response.text()

            if (!response.ok) {
                throw new Error(`JSON preview request failed with ${response.status}.`)
            }

            const payload = JSON.parse(sourceText)
            const previewPayload = this.resolvePreviewPayload(payload)

            if (this.hasSourceTarget) {
                this.sourceTarget.textContent = JSON.stringify(previewPayload, null, 2)
            }

            const rootCount = Array.isArray(previewPayload) ? previewPayload.length : 1

            this.renderStatus(
                `Loaded ${rootCount} root node${rootCount === 1 ? "" : "s"} from the widget subtree JSON.`,
                "success",
            )
        } catch (error) {
            console.error(error)
            this.renderStatus(error instanceof Error ? error.message : "Failed to render JSON preview.", "danger")
        }
    }

    resolvePreviewPayload(payload) {
        const rootNode = payload?.tree

        if (!rootNode || typeof rootNode !== "object") {
            return {}
        }

        if (!this.hasPreviewComponentValue) {
            return rootNode
        }

        const previewNode = this.findFirstComponent(rootNode, this.previewComponentValue)
        const previewItems = previewNode?.slots?.[this.previewSlotValue]

        if (Array.isArray(previewItems)) {
            return previewItems.length === 1 ? previewItems[0] : previewItems
        }

        return rootNode
    }

    findFirstComponent(node, componentName) {
        if (!node || typeof node !== "object") {
            return null
        }

        if (node.component === componentName) {
            return node
        }

        const slots = node.slots || {}

        for (const items of Object.values(slots)) {
            if (!Array.isArray(items)) {
                continue
            }

            for (const item of items) {
                const match = this.findFirstComponent(item, componentName)

                if (match) {
                    return match
                }
            }
        }

        return null
    }
    mapSeverityToAlert(severity) {
        switch (severity) {
            case "error":
            case "danger":
                return "alert-danger"
            case "warning":
                return "alert-warning"
            case "success":
                return "alert-success"
            case "secondary":
                return "alert-secondary"
            default:
                return "alert-info"
        }
    }

    renderStatus(message, tone) {
        if (!this.hasStatusTarget) {
            return
        }

        this.statusTarget.className = `alert ${this.mapSeverityToAlert(tone)} mb-3`
        this.statusTarget.textContent = message
    }
}
