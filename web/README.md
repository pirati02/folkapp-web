# FolkappWeb

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.2.1.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Installable app (PWA)

The production build includes a service worker (`@angular/service-worker`, configured in `ngsw-config.json`)
and a web manifest (`public/manifest.webmanifest`, icons in `public/icons/`), so browsers offer to install
it: "Install app" in Chrome/Edge, "Add to Home Screen" from Safari's share menu on iOS. The app shell and
fonts are cached so it starts offline, and the catalog (artist and song lists, the home page) is cached
as a fallback for when the network is down. Its `dataGroups` name the API's URL, so update them if it changes.

The registered worker is `public/sw.js`, which imports Angular's `ngsw-worker.js` and adds offline
listening: `OfflineService` saves downloaded songs in Cache Storage (`folkapp-audio-v1`) under their
stream URL, and the player asks for a downloaded song as `<stream url>?offline=1`. Only those requests are
answered by `sw.js`, from the cache and with byte ranges for seeking; all other audio streams as usual.

The worker only runs in production builds, so `ng serve` doesn't use it. To try it locally, run
`npm run build` and serve `dist/folkapp-web/browser` over `http://localhost`. A new deploy reaches users
on the next launch after the worker picks it up.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
