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
  issuedCards = 0;
  inactiveCards = 0;
  deactivatedCards = 0;

  // Breakdowns
  customerStatusBreakdown: Record<string, number> = {};
  accountStatusBreakdown: Record<string, number> = {};
  cardStatusBreakdown: Record<string, number> = {};
  cardBrandBreakdown: Record<string, number> = {};
  cardTypeBreakdown: Record<string, number> = {};
  tasksByEntity: Record<string, number> = {};
  taskStatusBreakdown: Record<string, number> = {};

  // Recent Activity
  recentActivity: any[] = [];

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
        this.issuedCards = data.issuedCards || 0;
        this.inactiveCards = data.inactiveCards || 0;
        this.deactivatedCards = data.deactivatedCards || 0;

        this.customerStatusBreakdown = data.customerStatusBreakdown || {};
        this.accountStatusBreakdown = data.accountStatusBreakdown || {};
        this.cardStatusBreakdown = data.cardStatusBreakdown || {};
        this.cardBrandBreakdown = data.cardBrandBreakdown || {};
        this.cardTypeBreakdown = data.cardTypeBreakdown || {};
        this.tasksByEntity = data.tasksByEntity || {};
        this.taskStatusBreakdown = data.taskStatusBreakdown || {};
        this.recentActivity = data.recentActivity || [];

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

  // Helper for chart bars
  getBarWidth(value: number, breakdown: Record<string, number>): number {
    const max = Math.max(...Object.values(breakdown), 1);
    return (value / max) * 100;
  }

  getTotal(breakdown: Record<string, number>): number {
    return Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  getTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const now = new Date().getTime();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    return days + 'd ago';
  }

  logout(): void {
    this.http.post('http://localhost:8080/api/logout', {}, { withCredentials: true }).subscribe({
      next: () => {
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
