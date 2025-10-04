import { Routes } from '@angular/router';
import { AuthPageComponent } from './pages/auth-page/auth-page.component';
import { RegisterComponent } from './pages/auth-page/register/register.component';
import { MainAppComponent } from './pages/main-app/main-app.component';
import { AuthguardService } from './services/authguard.service';

export const routes: Routes = [
  { path: '', component: AuthPageComponent },
  {
    path: 'main',
    component: MainAppComponent,
    canActivate: [AuthguardService],
  },

  { path: 'register', component: RegisterComponent },
];
