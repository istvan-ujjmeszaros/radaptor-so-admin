function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

function renderSpinnerSvg(size, color) {
    const safeSize = Number.isFinite(size) ? size : 24
    const safeColor = color || 'currentColor'

    return `
        <svg width="${safeSize}" height="${safeSize}" viewBox="0 0 50 50" aria-hidden="true" focusable="false"
             style="display:block;color:${escapeHtml(safeColor)}">
            <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-opacity="0.2" stroke-width="5"></circle>
            <path d="M45 25c0-11.046-8.954-20-20-20" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round">
                <animateTransform attributeName="transform"
                                  type="rotate"
                                  from="0 25 25"
                                  to="360 25 25"
                                  dur="0.8s"
                                  repeatCount="indefinite"></animateTransform>
            </path>
        </svg>
    `
}

export function renderInlineLoader({
    label = 'Loading',
    size = 18,
    color = 'currentColor',
    visibleLabel = false,
} = {}) {
    const safeLabel = escapeHtml(label)
    const labelHtml = visibleLabel
        ? `<span style="margin-left:0.5rem;">${safeLabel}</span>`
        : `<span style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${safeLabel}</span>`

    return `
        <span role="status" aria-live="polite" style="display:inline-flex;align-items:center;position:relative;">
            ${renderSpinnerSvg(size, color)}
            ${labelHtml}
        </span>
    `
}

export function renderBlockLoader({
    label = 'Loading',
    size = 24,
    color = '#0d6efd',
    minHeight = '4rem',
    visibleLabel = false,
} = {}) {
    return `
        <div style="min-height:${escapeHtml(minHeight)};display:flex;align-items:center;justify-content:center;text-align:center;">
            ${renderInlineLoader({ label, size, color, visibleLabel })}
        </div>
    `
}
