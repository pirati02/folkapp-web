import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection, ValueProvider } from '@angular/core';
import { provideRouter } from '@angular/router';

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
    importProvidersFrom(AppModule), provideAnimationsAsync()
  ]
};
