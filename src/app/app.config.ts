import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection, ValueProvider } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { AppModule } from './app.module';

export var baseUrlProvider: ValueProvider = <ValueProvider> {
  provide: 'BASE_URL',
  useValue: 'https://ammpjt8siw.us-east-1.awsapprunner.com'
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    baseUrlProvider,
    importProvidersFrom(AppModule)
  ]
};
