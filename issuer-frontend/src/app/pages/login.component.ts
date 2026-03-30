import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  showMessageModal = false;
  modalMessage = "";

  closeMessage() {
    this.showMessageModal = false;
  }

  loginForm: FormGroup;
  loading = false;

  // ✅ Use relative URL - proxy forwards to backend
  private apiUrl = '/api/login';

  errorMessage: string = '';

  showForgotPasswordModal: boolean = false;
  resetRequestUsername: string = '';
  resetRequestMessage: string = '';

  openForgotPasswordModal() {
    this.showForgotPasswordModal = true;
    this.resetRequestUsername = '';
    this.resetRequestMessage = '';
  }

  closeForgotPasswordModal() {
    this.showForgotPasswordModal = false;
  }

  submitResetRequest() {
    if (!this.resetRequestUsername.trim()) {
      this.resetRequestMessage = 'Username is required.';
      return;
    }

    const payload = {
      entity: 'USER',
      operation: 'PASSWORD_RESET',
      requestType: 'RESET_PASSWORD',
      username: this.resetRequestUsername.trim(),
      payload: { username: this.resetRequestUsername.trim() }
    };

    this.http.post('http://localhost:8080/api/maker-checker/requests', payload, { withCredentials: true })
      .subscribe({
        next: () => {
          this.modalMessage = 'Password reset request submitted successfully. Waiting for admin approval.';
          this.showMessageModal = true;
          this.closeForgotPasswordModal();
        },
        error: (err) => {
          console.error('Reset request error:', err);
          this.modalMessage = 'Failed to submit reset request. Please check the username and try again.';
          this.showMessageModal = true;
        }
      });
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      const { username, password } = this.loginForm.value;

      this.http.post<any>(this.apiUrl, { username, password }).subscribe({
        next: (res) => {
          this.loading = false;

          if (res.message === 'Login successful') {
            //  Store credentials
            localStorage.setItem('username', res.username);
            localStorage.setItem('role', res.role);

            //  routing logic
            if (res.role === 'ADMIN') {
              this.router.navigate(['/roles']);
            } else if (res.role === 'MANAGER') {
              this.router.navigate(['/pending']);
            } else if (res.role === 'STAFF') {
              this.router.navigate(['/dashboard']);
            } else {
              this.modalMessage = 'Unknown role. Redirecting to dashboard.';
          this.showMessageModal = true;
              this.router.navigate(['/dashboard']);
            }
          } else {
            this.modalMessage = res.message || 'Login failed';
          this.showMessageModal = true;
          }
        },
        error: (err) => {
          this.loading = false;
          const msg = err.error?.message || 'Invalid username or password';
          this.modalMessage = msg;
          this.showMessageModal = true;
        }
      });
    }
  }
}
