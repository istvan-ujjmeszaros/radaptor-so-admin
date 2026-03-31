/**
 * System Messages - Modern toast implementation
 *
 * Replaces legacy Gritter notifications for this theme.
 * Fetches messages via AJAX and renders them as flash messages.
 *
 * Usage:
 *   renderSystemMessages();
 */
(function() {
    'use strict';

    /**
     * Fetch and render system messages as flash messages
     */
    function renderSystemMessages() {
        fetch('/?context=systemmessages&event=renderSystemMessages')
            .then(response => response.json())
            .then(payload => {
                if (!payload || payload.ok !== true) {
                    console.error('Failed to load system messages:', payload);
                    return;
                }

                const data = payload.data || [];
                const container = document.getElementById('flash-messages');
                if (!container) return;

                // Backend returns object keyed by hash, convert to array
                const messages = Array.isArray(data) ? data : Object.values(data);
                if (!messages.length) return;

                messages.forEach(msg => {
                    if (msg.type === 'ok' && msg.sticky !== true) {
                        // Routine success messages trigger the saved indicator instead of toast
                        document.body.dispatchEvent(new CustomEvent('status:saved'));
                    } else {
                        // Sticky success messages and all other message types show as flash messages
                        const flash = createFlashMessage(msg);
                        container.appendChild(flash);
                    }
                });
            })
            .catch(err => console.error('Failed to load system messages:', err));
    }

    /**
     * Create a flash message DOM element
     */
    function createFlashMessage(msg) {
        const typeMap = {
            'ok': { class: 'flash-success', icon: 'bi-check-circle-fill' },
            'error': { class: 'flash-error', icon: 'bi-x-circle-fill' },
            'warning': { class: 'flash-warning', icon: 'bi-exclamation-triangle-fill' },
            'notice': { class: 'flash-info', icon: 'bi-info-circle-fill' },
            'debug': { class: 'flash-error', icon: 'bi-bug-fill' },
            'config': { class: 'flash-warning', icon: 'bi-gear-fill' }
        };

        const type = typeMap[msg.type] || typeMap['notice'];
        const isSticky = msg.sticky === true;

        const div = document.createElement('div');
        div.className = `flash-message ${type.class}`;
        div.setAttribute('data-controller', 'flash');
        div.setAttribute('data-flash-auto-dismiss-value', isSticky ? 'false' : 'true');
        div.setAttribute('data-flash-duration-value', '5000');

        div.innerHTML = `
            <i class="flash-icon bi ${type.icon}"></i>
            <div class="flash-content">
                ${msg.header ? `<div class="flash-title">${msg.header}</div>` : ''}
                <div class="flash-text">${msg.body}</div>
            </div>
            <button type="button" class="flash-close" data-action="click->flash#close">
                <i class="bi bi-x-lg"></i>
            </button>
        `;

        return div;
    }

    // Export to global scope
    window.renderSystemMessages = renderSystemMessages;
    window.createFlashMessage = createFlashMessage;
})();
