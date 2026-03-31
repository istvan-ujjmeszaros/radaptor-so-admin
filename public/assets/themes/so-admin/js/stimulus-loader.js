/**
 * Stimulus Loader - Auto-loads controllers based on data-controller attributes
 *
 * Uses window.__RADAPTOR__.stimulus.controllers.base to locate controller files.
 * Tracks loaded controllers in window.__RADAPTOR__.stimulus.controllers.loaded
 *
 * Controllers are loaded on demand when:
 * - DOM is initially parsed (existing data-controller attributes)
 * - New elements are added (AJAX, htmx, etc.)
 * - data-controller attribute is added to existing elements
 */
import { Application } from "/assets/themes/so-admin/js/stimulus.js"

const app = Application.start()

// Expose for debugging
window.Stimulus = app
window.StimulusApp = app

const controllerAttribute = "data-controller"
const config = window.__RADAPTOR__?.stimulus?.controllers
const basePath = config?.base || '/assets/themes/so-admin/controllers'
const cacheBuster = config?.version ? `?v=${config.version}` : ''

// Ensure loaded tracking object exists
if (config && !config.loaded) {
    config.loaded = {}
}

// Load controllers already in DOM
document.querySelectorAll(`[${controllerAttribute}]`).forEach(element => {
    extractControllerNames(element).forEach(loadController)
})

// Watch for new controllers (AJAX, htmx, etc.)
new MutationObserver(mutations => {
    for (const { attributeName, target, type, addedNodes } of mutations) {
        if (type === "attributes" && attributeName === controllerAttribute) {
            extractControllerNames(target).forEach(loadController)
        }
        if (type === "childList") {
            addedNodes.forEach(node => {
                if (node.nodeType !== Node.ELEMENT_NODE) return

                // Check the node itself
                if (node.hasAttribute?.(controllerAttribute)) {
                    extractControllerNames(node).forEach(loadController)
                }

                // Check descendants
                node.querySelectorAll?.(`[${controllerAttribute}]`).forEach(el => {
                    extractControllerNames(el).forEach(loadController)
                })
            })
        }
    }
}).observe(document, {
    subtree: true,
    childList: true,
    attributeFilter: [controllerAttribute]
})

function extractControllerNames(element) {
    return element.getAttribute(controllerAttribute).split(/\s+/).filter(Boolean)
}

function loadController(name) {
    // Skip if already registered
    if (app.router.modulesByIdentifier.has(name)) return

    // Mark as loading to prevent duplicate loads
    if (config?.loaded?.[name]) return
    if (config?.loaded) {
        config.loaded[name] = { status: 'loading', startedAt: Date.now() }
    }

    const url = `${basePath}/${name}-controller.js${cacheBuster}`

    import(url)
        .then(module => {
            if (!app.router.modulesByIdentifier.has(name)) {
                app.register(name, module.default)
                // Track loaded controller
                if (config?.loaded) {
                    config.loaded[name] = { url, loadedAt: Date.now(), status: 'ready' }
                }
            }
        })
        .catch(() => {
            // Clean, single-line error message
            console.warn(`[Stimulus] Controller not found: ${name}`)
            if (config?.loaded) {
                config.loaded[name] = { url, status: 'error' }
            }
        })
}
