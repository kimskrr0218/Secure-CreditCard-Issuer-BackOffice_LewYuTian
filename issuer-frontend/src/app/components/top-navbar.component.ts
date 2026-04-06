import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-top-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="emoji-navbar">
      <div class="nav-left">
        <span class="user-info">Signed in as: <strong>{{ username }}</strong> — {{ role }}</span>
      </div>
      <div class="nav-center">
        <div class="nav-icon" title="Dashboard" routerLink="/dashboard">🏠</div>
        <div class="nav-icon" title="Customers" routerLink="/customers">👤</div>
        <div class="nav-icon" title="Accounts" routerLink="/accounts">💳</div>
        <div class="nav-icon" title="Cards" routerLink="/cards">🪪</div>
        <div class="nav-icon" title="Pending" routerLink="/pending">⏳</div>
      </div>
      <div class="nav-right">
        <div class="nav-icon profile-icon" title="My Profile" routerLink="/profile">⚙️</div>
        <div class="nav-icon logout-icon" title="Logout" (click)="logout()">🚪</div>
      </div>
    </nav>
  `,
  styles: [`
    .emoji-navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      padding: 12px 25px;
      margin-bottom: 20px;
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
    }

    .nav-center {
      display: flex;
      gap: 30px;
      justify-content: center;
    }

    .nav-icon {
      font-size: 24px;
      padding: 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.25s ease;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .nav-icon:hover {
      transform: scale(1.25) translateY(-2px);
      background: rgba(255, 255, 255, 0.1);
      filter: drop-shadow(0 0 8px #38bdf8);
    }

    .nav-icon:active {
      transform: scale(1.1);
    }

    .logout-icon:hover {
      background: rgba(239, 68, 68, 0.25) !important;
      filter: drop-shadow(0 0 8px #ef4444) !important;
    }

    .profile-icon:hover {
      background: rgba(56, 189, 248, 0.25) !important;
      filter: drop-shadow(0 0 8px #38bdf8) !important;
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
