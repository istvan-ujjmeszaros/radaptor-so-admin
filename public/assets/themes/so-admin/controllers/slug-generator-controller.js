/**
 * Slug Generator Controller
 *
 * Automatically generates a URL slug from a source field (typically title).
 * Features:
 * - Converts text to kebab-case (lowercase, hyphens instead of spaces)
 * - Handles Hungarian accented characters
 * - Only auto-updates if slug is empty or matches the last auto-generated value
 * - Allows manual override (stops auto-updating once user edits the slug)
 *
 * Usage:
 * <div data-controller="slug-generator">
 *   <input type="text" data-slug-generator-target="source" data-action="input->slug-generator#generate">
 *   <input type="text" data-slug-generator-target="slug">
 * </div>
 */
import { Controller } from "/assets/packages/themes/so-admin/js/stimulus.js"

export default class extends Controller {
    static targets = ["source", "slug"]
    static values = {
        sourceId: String,
        slugId: String,
    }

    connect() {
        this.sourceElement = this.resolveSourceElement()
        this.slugElement = this.resolveSlugElement()

        if (!this.sourceElement || !this.slugElement) {
            return
        }

        this.lastGeneratedSlug = this.slugElement.value || ''
        this.boundGenerate = this.generate.bind(this)

        if (!this.hasSourceTarget && this.hasSourceIdValue) {
            this.sourceElement.addEventListener('input', this.boundGenerate)
        }
    }

    disconnect() {
        if (!this.boundGenerate || !this.sourceElement || this.hasSourceTarget || !this.hasSourceIdValue) {
            return
        }

        this.sourceElement.removeEventListener('input', this.boundGenerate)
    }

    generate() {
        const sourceElement = this.resolveSourceElement()
        const slugElement = this.resolveSlugElement()

        if (!sourceElement || !slugElement) {
            return
        }

        const currentSlug = slugElement.value
        const sourceValue = sourceElement.value

        // Only auto-update if:
        // 1. Slug is empty, or
        // 2. Slug matches the last auto-generated value (user hasn't manually edited)
        if (currentSlug !== '' && currentSlug !== this.lastGeneratedSlug) {
            // User has manually edited the slug, don't overwrite
            return
        }

        const newSlug = this.toSlug(sourceValue)
        slugElement.value = newSlug
        this.lastGeneratedSlug = newSlug
    }

    resolveSourceElement() {
        if (this.hasSourceTarget) {
            return this.sourceTarget
        }

        if (!this.hasSourceIdValue) {
            return null
        }

        return document.getElementById(this.sourceIdValue)
    }

    resolveSlugElement() {
        if (this.hasSlugTarget) {
            return this.slugTarget
        }

        if (!this.hasSlugIdValue) {
            return null
        }

        return document.getElementById(this.slugIdValue)
    }

    /**
     * Convert text to URL-friendly slug.
     * - Lowercase
     * - Replace accented characters with ASCII equivalents
     * - Replace spaces and underscores with hyphens
     * - Remove non-alphanumeric characters (except hyphens)
     * - Collapse multiple hyphens into one
     * - Trim leading/trailing hyphens
     */
    toSlug(text) {
        return text
            .toLowerCase()
            // Hungarian accented vowels
            .replace(/[áàâä]/g, 'a')
            .replace(/[éèêë]/g, 'e')
            .replace(/[íìîï]/g, 'i')
            .replace(/[óòôöő]/g, 'o')
            .replace(/[úùûüű]/g, 'u')
            // Other common accented characters
            .replace(/[ñ]/g, 'n')
            .replace(/[ç]/g, 'c')
            .replace(/[ß]/g, 'ss')
            // Replace spaces and underscores with hyphens
            .replace(/[\s_]+/g, '-')
            // Remove any character that's not alphanumeric or hyphen
            .replace(/[^a-z0-9-]/g, '')
            // Collapse multiple hyphens into one
            .replace(/-+/g, '-')
            // Trim leading and trailing hyphens
            .replace(/^-+|-+$/g, '')
    }
}
