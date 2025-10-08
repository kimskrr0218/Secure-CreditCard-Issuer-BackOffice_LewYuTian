import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;

  // ✅ use the new backend path
  private apiUrl = 'http://localhost:8080/api/login';


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
              alert('Unknown role. Redirecting to dashboard.');
              this.router.navigate(['/dashboard']);
            }
          } else {
            alert(res.message || 'Login failed');
          }
        },
        error: (err) => {
          this.loading = false;
          const msg = err.error?.message || 'Invalid username or password';
          alert(msg);
        }
      });
    }
  }
}
