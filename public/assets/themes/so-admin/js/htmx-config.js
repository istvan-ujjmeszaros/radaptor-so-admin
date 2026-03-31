/**
 * Global htmx configuration
 *
 * Sets up htmx defaults and event handlers for loading indicators and error handling.
 */
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        if (typeof htmx !== 'undefined') {
            // Configure htmx defaults
            htmx.config.defaultSwapStyle = 'innerHTML';
            htmx.config.historyCacheSize = 0;

            // Add loading indicator to htmx requests
            document.body.addEventListener('htmx:beforeRequest', function(event) {
                event.detail.elt.classList.add('htmx-loading');
            });

            document.body.addEventListener('htmx:afterRequest', function(event) {
                event.detail.elt.classList.remove('htmx-loading');
            });

            // Handle htmx errors
            document.body.addEventListener('htmx:responseError', function(event) {
                console.error('htmx error:', event.detail);
                // Could show a flash message here
            });

            console.log('RadaptorPortalAdmin: htmx configured');
        }
    });
})();
