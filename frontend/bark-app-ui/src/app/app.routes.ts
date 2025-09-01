import { Routes } from '@angular/router';
import { AuthPageComponent } from './pages/auth-page/auth-page.component';
import { RegisterComponent } from './pages/auth-page/register/register.component';

export const routes: Routes = [
  { path: '', component: AuthPageComponent },
  { path: 'register', component: RegisterComponent },
];
