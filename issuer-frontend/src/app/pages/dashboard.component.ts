import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  role = '';
  username = '';

  // Summary stats
  summaryLoading = true;
  totalCustomers = 0;
  activeAccounts = 0;
  activeCards = 0;
  pendingRequests = 0;
  blockedCards = 0;
  rejectedRequests = 0;
  inactiveAccounts = 0;

  private summaryUrl = 'http://localhost:8080/api/dashboard/summary';

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.role = localStorage.getItem('role') || '';
    this.username = localStorage.getItem('username') || '';
    this.loadSummary();
  }

  loadSummary(): void {
    this.summaryLoading = true;
    this.http.get<any>(this.summaryUrl, { withCredentials: true }).subscribe({
      next: (data) => {
        this.totalCustomers = data.totalCustomers || 0;
        this.activeAccounts = data.activeAccounts || 0;
        this.activeCards = data.activeCards || 0;
        this.pendingRequests = data.pendingRequests || 0;
        this.blockedCards = data.blockedCards || 0;
        this.rejectedRequests = data.rejectedRequests || 0;
        this.inactiveAccounts = data.inactiveAccounts || 0;
        this.summaryLoading = false;
      },
      error: () => {
        this.summaryLoading = false;
      }
    });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
