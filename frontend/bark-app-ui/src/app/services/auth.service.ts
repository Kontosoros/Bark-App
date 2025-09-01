import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../utils/constants';
import { jwtDecode } from 'jwt-decode';
import api from '../utils/api';

export interface CurrentUser {
  id: number;
  username: string;
  email?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  isAuthorized = false;

  constructor(private router: Router) {
    this.checkAuthStatus();
  }

  // Get current user from JWT token
  getCurrentUser(): CurrentUser | null {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (!token) {
      return null;
    }

    try {
      const decoded = jwtDecode<any>(token);
      return {
        id: decoded.user_id || decoded.id,
        username: decoded.username,
        email: decoded.email,
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  // Get current user ID
  getCurrentUserId(): number | null {
    const user = this.getCurrentUser();
    return user ? user.id : null;
  }

  // Check if the user is authorized or needs to refresh the token
  async checkAuthStatus() {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (!token) {
      this.isAuthorized = false;
      this.redirectToLogin();
      return;
    }

    try {
      const decoded = jwtDecode<any>(token);
      const tokenExpiration = decoded.exp;
      const now = Date.now() / 1000; // Fixed: Date in seconds

      if (tokenExpiration && tokenExpiration < now) {
        // Token is expired, redirect to login instead of trying to refresh
        this.isAuthorized = false;
        console.log('TOKEN EXPIRED');
        this.redirectToLogin();
      } else {
        this.isAuthorized = true;
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      this.isAuthorized = false;
      this.redirectToLogin();
    }
  }

  // Helper method to redirect to login and clear tokens
  private redirectToLogin() {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    this.router.navigate(['/']);
  }

  // Refresh token logic (keeping as backup)
  async refreshToken() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN);
    try {
      const res = await api.post('/main/token/refresh/', {
        refresh: refreshToken,
      });
      console.log('refresh token', res);
      if (res.status === 200) {
        localStorage.setItem(ACCESS_TOKEN, res.data.access);
        this.isAuthorized = true;
      } else {
        this.isAuthorized = false;
        this.redirectToLogin();
      }
    } catch (error) {
      this.isAuthorized = false;
      this.redirectToLogin();
    }
  }

  // Login logic: on successful login, store token
  login(token: string, refreshToken: string) {
    localStorage.setItem(ACCESS_TOKEN, token);
    localStorage.setItem(REFRESH_TOKEN, refreshToken);
    this.isAuthorized = true;
    this.router.navigate(['/calendar']); // Navigate to protected route
  }

  // Logout logic: clear local storage and redirect to login
  logout() {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    this.isAuthorized = false;
    this.router.navigate(['/']);
  }
}
