# Radaptor SoAdmin Theme

`radaptor/themes/so-admin` provides the classic admin theme (`SoAdmin`)
for Radaptor CMS.
It includes theme templates, layout wrappers, and isolated assets maintained
separately from other themes.

## Installation

Use through a registry-first consumer app:

- [`radaptor-app`](https://github.com/istvan-ujjmeszaros/radaptor-app)
- [`radaptor-portal`](https://github.com/istvan-ujjmeszaros/radaptor-portal)

The theme is resolved from package metadata during app install/update.

## Dependencies

From `.registry-package.json`:

- `radaptor/core/cms` (`^0.1.0`)

## Development and Release

Maintain this theme in `/apps/_RADAPTOR/packages-dev/themes/so-admin`, not inside a consumer app's
`packages/registry/...` runtime copy. Validate through a consumer app `php` container; do not run
host PHP, Composer, PHPUnit, PHPStan, or PHP-CS-Fixer.

Release key:

- `theme:so-admin`

Normal flow: package PR, `@codex review`, clean repo checks, squash merge, fast-forward local
`main`, `package:release theme:so-admin`, commit the `.registry-package.json` version bump, then
publish the generated artifact through `radaptor_plugin_registry`.

Asset links are declared in `.registry-package.json` under `assets.public` and are created by
`build:assets` under the consumer app's `public/www/assets/packages/...`. Do not manually copy or
symlink theme assets into app runtime paths.

## License

This package is distributed under the proprietary evaluation license in
[LICENSE](./LICENSE).
Evaluation-only: no production/commercial/distribution/derivative use without
a separate license agreement.

## Contact

istvan@radaptor.com
