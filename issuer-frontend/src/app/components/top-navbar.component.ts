import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-top-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="top-navbar">
      <div class="nav-left">
        <span class="user-info">Signed in as: <strong>{{ username }}</strong> — {{ role }}</span>
      </div>
      <div class="nav-center">
        <a class="nav-link" routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
        <a class="nav-link" routerLink="/customers" routerLinkActive="active">Customers</a>
        <a class="nav-link" routerLink="/accounts" routerLinkActive="active">Accounts</a>
        <a class="nav-link" routerLink="/cards" routerLinkActive="active">Cards</a>
        <a class="nav-link" routerLink="/pending" routerLinkActive="active">Pending</a>
      </div>
      <div class="nav-right">
        <a class="nav-link profile-link" routerLink="/profile" routerLinkActive="active">Profile</a>
        <button class="logout-btn" (click)="logout()">Logout</button>
      </div>
    </nav>
  `,
  styles: [`
    .top-navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      padding: 0 25px;
      height: 56px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      color: white;
    }

    .nav-left, .nav-right {
      flex: 1;
      display: flex;
      align-items: center;
    }

    .user-info {
      font-size: 14px;
      color: #cbd5e1;
    }

    .user-info strong {
      color: #38bdf8;
    }

    .nav-right {
      justify-content: flex-end;
      gap: 8px;
    }

    .nav-center {
      display: flex;
      gap: 4px;
      justify-content: center;
    }

    .nav-link {
      font-size: 14px;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: #94a3b8;
      text-decoration: none;
      white-space: nowrap;
    }

    .nav-link:hover {
      color: white;
      background: rgba(255, 255, 255, 0.1);
    }

    .nav-link.active {
      color: white;
      background: #2563eb;
    }

    .profile-link {
      color: #94a3b8;
    }

    .profile-link:hover {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
    }

    .profile-link.active {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
    }

    .logout-btn {
      font-size: 14px;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: #fca5a5;
      background: transparent;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .logout-btn:hover {
      color: white;
      background: rgba(239, 68, 68, 0.25);
      border-color: #ef4444;
    }
  `]
})
export class TopNavbarComponent {
  username: string = '';
  role: string = '';

  constructor(private router: Router, private http: HttpClient) {
    this.username = localStorage.getItem('username') || 'Unknown';
    this.role = localStorage.getItem('role') || 'User';
  }

  logout() {
    this.http.post('http://localhost:8080/api/logout', {}, { withCredentials: true }).subscribe({
      complete: () => {
        localStorage.clear();
        this.router.navigate(['/login']);
      },
      error: () => {
        localStorage.clear();
        this.router.navigate(['/login']);
      }
    });
  }
}
