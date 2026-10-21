import { ApplicationConfig, importProvidersFrom, isDevMode, provideZoneChangeDetection, ValueProvider } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { AppModule } from './app.module';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { environment } from '../environments/environment';

export var baseUrlProvider: ValueProvider = <ValueProvider> {
  provide: 'BASE_URL',
  useValue: environment.apiUrl
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    baseUrlProvider,
    importProvidersFrom(AppModule), provideAnimationsAsync(),
    // Makes the app installable and lets it start offline; only the production build has the worker.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
