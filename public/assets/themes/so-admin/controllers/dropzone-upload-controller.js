import { Controller } from "/assets/packages/themes/so-admin/js/stimulus.js"

const CHUNK_SIZE = 1 * 1024 * 1024
const MAX_FILE_SIZE_MB = 64
const RETRY_CHUNK_LIMIT = 3
const LOAD_RETRY_DELAY_MS = 100
const LOAD_RETRY_LIMIT = 30

export default class extends Controller {
    static targets = ['form', 'status']

    static values = {
        uploadUrl: String,
        defaultMessage: String,
        uploadedMessage: String,
        uploadErrorMessage: String,
    }

    connect() {
        this.dropzone = null
        this.batchStarted = false
        this.successCount = 0
        this.errorCount = 0
        this.loadAttempts = 0
        this.loadTimer = null
        this.listenersAttached = false

        this._initWhenReady()
    }

    disconnect() {
        if (this.loadTimer !== null) {
            clearTimeout(this.loadTimer)
            this.loadTimer = null
        }

        if (this.dropzone) {
            this.dropzone.destroy()
            this.dropzone = null
        }

        this.listenersAttached = false
        this.batchStarted = false
    }

    _initWhenReady() {
        const DropzoneClass = window.Dropzone

        if (typeof DropzoneClass !== 'function') {
            if (this.loadAttempts >= LOAD_RETRY_LIMIT) {
                console.warn('[Dropzone] Library failed to load for dropzone-upload controller')
                return
            }

            this.loadAttempts += 1
            this.loadTimer = window.setTimeout(() => this._initWhenReady(), LOAD_RETRY_DELAY_MS)
            return
        }

        this._initDropzone(DropzoneClass)
    }

    _initDropzone(DropzoneClass) {
        if (!this.hasFormTarget || this.dropzone) {
            return
        }

        DropzoneClass.autoDiscover = false

        if (this.formTarget.dropzone) {
            this.formTarget.dropzone.destroy()
            this.formTarget.dropzone = null
        }

        this.dropzone = new DropzoneClass(this.formTarget, {
            url: this.hasUploadUrlValue ? this.uploadUrlValue : this.formTarget.action,
            paramName: 'file',
            chunking: true,
            forceChunking: true,
            chunkSize: CHUNK_SIZE,
            retryChunks: true,
            retryChunksLimit: RETRY_CHUNK_LIMIT,
            maxFilesize: MAX_FILE_SIZE_MB,
            filesizeBase: 1024,
            hiddenInputContainer: this.formTarget,
            dictDefaultMessage: this.hasDefaultMessageValue ? this.defaultMessageValue : undefined,
        })
        this._attachDropzoneListeners()
    }

    _attachDropzoneListeners() {
        if (!this.dropzone || this.listenersAttached) {
            return
        }

        this.listenersAttached = true
        this.dropzone.on('processing', () => {
            if (!this.batchStarted) {
                this.batchStarted = true
                this.successCount = 0
                this.errorCount = 0
                this._setStatus('')
            }
        })

        this.dropzone.on('success', () => {
            this.successCount += 1
        })

        this.dropzone.on('error', (_file, message, xhr) => {
            this.errorCount += 1
            this._setStatus(this._resolveMessage(message, xhr, this.uploadErrorMessageValue))
        })

        this.dropzone.on('queuecomplete', () => {
            if (this.errorCount === 0 && this.successCount > 0) {
                this._setStatus(this.uploadedMessageValue)
            }

            this.batchStarted = false
        })
    }

    _resolveMessage(message, xhr, fallback) {
        const payload = this._parseJson(xhr?.responseText)
        if (payload && typeof payload.message === 'string' && payload.message.trim() !== '') {
            return payload.message
        }

        if (typeof message === 'string' && message.trim() !== '') {
            return message
        }

        if (message && typeof message === 'object' && typeof message.message === 'string') {
            return message.message
        }

        return fallback || ''
    }

    _parseJson(raw) {
        if (typeof raw !== 'string' || raw.trim() === '') {
            return null
        }

        try {
            return JSON.parse(raw)
        } catch (_error) {
            return null
        }
    }

    _setStatus(message) {
        if (!this.hasStatusTarget) {
            return
        }

        this.statusTarget.textContent = message
    }
}
