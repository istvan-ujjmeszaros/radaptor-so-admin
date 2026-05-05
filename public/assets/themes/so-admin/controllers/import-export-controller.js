import { Controller } from "/assets/packages/themes/so-admin/js/stimulus.js"
import { t } from "/assets/packages/themes/so-admin/js/i18n.js"
import { renderBlockLoader } from "/assets/packages/themes/so-admin/js/async-loader.js"

export default class extends Controller {
    static targets = [
        'importForm',
        'fileInput',
        'submitButton',
        'dialog',
        'dialogTitle',
        'dialogSummary',
        'dialogErrors',
        'runButton',
        'cancelButton',
    ]

    async submit(event) {
        event.preventDefault()

        const submitter = event.submitter
        const dryRun = submitter?.value === '1'

        await this._submitImport(dryRun)
    }

    async runImportFromDialog() {
        await this._submitImport(false)
    }

    closeDialog() {
        if (typeof this.dialogTarget.close === 'function' && this.dialogTarget.open) {
            this.dialogTarget.close()
            return
        }

        this.dialogTarget.hidden = true
    }

    async _submitImport(dryRun) {
        if (!this.hasFileInputTarget || this.fileInputTarget.files.length === 0) {
            this._renderPayload({
                ok: false,
                dry_run: dryRun,
                dataset_name: '',
                result: null,
                errors: [t('import_export.error.file_required')],
            })
            return
        }

        const formData = new FormData(this.importFormTarget)
        formData.set('dry_run', dryRun ? '1' : '0')

        this._setBusy(true)
        this._showLoading(dryRun)

        try {
            const response = await fetch(this.importFormTarget.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            })

            const payload = await this._parseResponse(response)
            this._renderPayload(payload)

            if (payload.ok && !dryRun) {
                this.fileInputTarget.value = ''
            }
        } catch (error) {
            this._renderPayload({
                ok: false,
                dry_run: dryRun,
                dataset_name: '',
                result: null,
                errors: [error?.message || t('common.error')],
            })
        } finally {
            this._setBusy(false)
        }
    }

    async _parseResponse(response) {
        const raw = await response.text()

        try {
            return JSON.parse(raw)
        } catch (_error) {
            const message = response.ok
                ? t('common.error')
                : `${t('common.error')}: ${response.status}`

            return {
                ok: false,
                dry_run: false,
                dataset_name: '',
                result: null,
                errors: [message],
            }
        }
    }

    _showLoading(dryRun) {
        this.dialogTitleTarget.textContent = dryRun
            ? t('import_export.action.preview_import')
            : t('import_export.action.run_import')

        this.dialogSummaryTarget.innerHTML = renderBlockLoader({
            label: t('common.loading'),
            size: 28,
            minHeight: '6rem',
        })
        this.dialogErrorsTarget.innerHTML = ''
        this.runButtonTarget.hidden = true

        this._openDialog()
    }

    _renderPayload(payload) {
        const datasetName = payload.dataset_name || ''
        const result = payload.result || null
        const dryRun = payload.dry_run === true

        this.dialogTitleTarget.textContent = payload.ok
            ? t(dryRun ? 'import_export.result.dry_run_summary' : 'import_export.result.success_summary', { dataset: datasetName })
            : t('import_export.result.error_summary', { dataset: datasetName })

        this.dialogSummaryTarget.innerHTML = result ? this._renderSummary(result) : ''

        const errors = Array.isArray(payload.errors) ? payload.errors : (Array.isArray(result?.errors) ? result.errors : [])
        this.dialogErrorsTarget.innerHTML = errors.length > 0 ? this._renderErrors(errors) : ''
        this.runButtonTarget.hidden = !(payload.ok && dryRun)

        if (this.hasCancelButtonTarget) {
            this.cancelButtonTarget.textContent = (payload.ok && !dryRun)
                ? t('common.close')
                : t('common.cancel')
        }

        this._openDialog()
    }

    _renderSummary(result) {
        const lines = []

        if (Array.isArray(result.detected_locales) && result.detected_locales.length > 0) {
            const label = result.detected_locales.length === 1
                ? t('import_export.result.detected_locale')
                : t('import_export.result.detected_locales')

            lines.push([label, result.detected_locales.join(', ')])
        } else if (result.detected_locale) {
            lines.push([t('import_export.result.detected_locale'), result.detected_locale])
        }

        if (result.format) {
            lines.push([t('import_export.result.format'), result.format])
        }

        if (result.mode) {
            lines.push([t('import_export.result.mode'), result.mode])
        }

        lines.push([t('import_export.result.processed'), result.processed ?? 0])
        lines.push([t('import_export.result.inserted'), result.inserted ?? 0])
        lines.push([t('import_export.result.updated'), result.updated ?? 0])
        lines.push([t('import_export.result.imported'), result.imported ?? 0])
        lines.push([t('import_export.result.skipped'), result.skipped ?? 0])
        lines.push([t('import_export.result.deleted'), result.deleted ?? 0])

        return `
            <dl class="row mb-0">
                ${lines.map(([label, value]) => `
                    <dt class="col-sm-4">${this._esc(String(label))}</dt>
                    <dd class="col-sm-8">${this._esc(String(value))}</dd>
                `).join('')}
            </dl>
        `
    }

    _renderErrors(errors) {
        return `
            <div class="alert alert-danger mb-0">
                <strong>${this._esc(t('common.error'))}</strong>
                <ul class="mb-0 mt-2">
                    ${errors.map(error => `<li>${this._esc(String(error))}</li>`).join('')}
                </ul>
            </div>
        `
    }

    _setBusy(busy) {
        if (!this.hasSubmitButtonTarget) {
            return
        }

        this.submitButtonTargets.forEach(button => {
            button.disabled = busy
        })

        this.runButtonTarget.disabled = busy
    }

    _openDialog() {
        if (typeof this.dialogTarget.showModal === 'function') {
            if (!this.dialogTarget.open) {
                this.dialogTarget.showModal()
            }
            return
        }

        this.dialogTarget.hidden = false
    }

    _esc(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;')
    }
}
