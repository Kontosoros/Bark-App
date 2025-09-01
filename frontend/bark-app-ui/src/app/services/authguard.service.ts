import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../utils/constants';

@Injectable({
  providedIn: 'root',
})
export class AuthguardService implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (this.authService.isAuthorized) {
      return true;
    } else {
      this.router.navigate(['/']); // Redirect to login page (AuthPageComponent)
      
      return false;
    }
  }
}
