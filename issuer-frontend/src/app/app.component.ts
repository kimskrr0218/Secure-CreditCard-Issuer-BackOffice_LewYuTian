import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, CommonModule],
  template: `
  <mat-toolbar color="primary">
    <span>Issuer Back-Office</span>
    <span class="spacer"></span>

    <!-- Show menus only when logged in -->
    <ng-container *ngIf="role">
      <!-- Staff menus -->
      <a mat-button *ngIf="role === 'STAFF'" routerLink="/dashboard">Dashboard</a>
      <a mat-button *ngIf="role === 'STAFF'" routerLink="/customers">Customers</a>
      <a mat-button *ngIf="role === 'STAFF'" routerLink="/accounts">Accounts</a>
      <a mat-button *ngIf="role === 'STAFF'" routerLink="/cards">Cards</a>
      <a mat-button *ngIf="role === 'STAFF'" routerLink="/pending">Pending</a>

      <!-- Manager menus -->
      <a mat-button *ngIf="role === 'MANAGER'" routerLink="/pending">Pending</a>

      <!-- Admin menus -->
      <a mat-button *ngIf="role === 'ADMIN'" routerLink="/roles">Roles</a>

      <!-- Logout always visible when logged in -->
      <a mat-button (click)="logout()">Logout</a>
    </ng-container>

    <!-- If not logged in, only show Login -->
    <ng-container *ngIf="!role">
      <a mat-button routerLink="/login">Login</a>
    </ng-container>
  </mat-toolbar>

  <div class="content">
    <router-outlet></router-outlet>
  </div>
  `,
  styles: [`.spacer{flex:1 1 auto}.content{padding:16px}`]
})
export class AppComponent {
  role: string | null = null;

  constructor(private router: Router) {
    // Read role at start
    this.role = localStorage.getItem('role');

    // 🔑 Re-check role whenever navigation happens (e.g., after login)
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.role = localStorage.getItem('role');
      }
    });
  }

  logout(): void {
    localStorage.clear();
    this.role = null;
    this.router.navigate(['/login']);
  }
}
