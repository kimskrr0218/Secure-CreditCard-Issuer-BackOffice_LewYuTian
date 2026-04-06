import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { GlobalModalComponent } from './components/global-modal.component';
import { ChatWidgetComponent } from './components/chat-widget.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, CommonModule, GlobalModalComponent, ChatWidgetComponent],
  template: `
    <router-outlet></router-outlet>
    <app-global-modal></app-global-modal>
    <app-chat-widget *ngIf="role"></app-chat-widget>
  `,
  styles: []
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
