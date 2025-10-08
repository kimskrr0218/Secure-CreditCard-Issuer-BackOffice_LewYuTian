import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

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

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.role = localStorage.getItem('role') || '';
    this.username = localStorage.getItem('username') || '';
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
