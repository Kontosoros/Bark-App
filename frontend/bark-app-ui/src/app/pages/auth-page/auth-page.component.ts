import { Component } from '@angular/core';
// Import Material Modules
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../../utils/constants';
import api from '../../utils/api';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { RegisterComponent } from './register/register.component';
import { AuthService } from '../../services/auth.service';
@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    RegisterComponent,
  ],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.css',
})
export class AuthPageComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  confirmPassword: string = '';
  email: string = '';
  registerForm: FormGroup;
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      confirmPassword: ['', Validators.required],
    });
  }

  // Handle user login
  onLogin() {
    const loginData = {
      username: this.username,
      password: this.password,
    };

    // Send login request to your API
    api
      .post('/main/user/login/', loginData) // Adjust API URL as needed
      .then((response: any) => {
        const { access, refresh } = response.data;

        this.authService.login(access, refresh);
      })
      .catch((error: any) => {
        this.errorMessage = 'Invalid username or password';
        console.error('Login failed:', error);
      });
  }
  onClickRegister() {
    this.router.navigate(['/register']);
  }
}
