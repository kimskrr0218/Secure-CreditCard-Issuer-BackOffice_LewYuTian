import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pending',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending.component.html',
  styleUrls: ['./pending.component.css']
})
export class PendingComponent implements OnInit {
  requests: any[] = [];
  selectedRequest: any = null; //  for modal/details view
  private apiUrl = 'http://localhost:8080/api/pending';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    const username = localStorage.getItem('username');
    this.http.get<any[]>(`${this.apiUrl}?username=${username}`).subscribe({
      next: (data) => (this.requests = data),
      error: (err) => console.error('Error loading requests:', err)
    });
  }

  approve(id: number): void {
    const username = localStorage.getItem('username');
    this.http.put(`${this.apiUrl}/${id}/approve?username=${username}`, {}).subscribe({
      next: (updated: any) => {
        const index = this.requests.findIndex(r => r.id === id);
        if (index !== -1) this.requests[index] = updated;
      },
      error: (err) => console.error('Error approving request:', err)
    });
  }

  reject(id: number): void {
    const username = localStorage.getItem('username');
    this.http.put(`${this.apiUrl}/${id}/reject?username=${username}`, {}).subscribe({
      next: (updated: any) => {
        const index = this.requests.findIndex(r => r.id === id);
        if (index !== -1) this.requests[index] = updated;
      },
      error: (err) => console.error('Error rejecting request:', err)
    });
  }

  //  new: open request details
  viewRequest(request: any): void {
    this.selectedRequest = request;
  }

  //  new: close modal
  closeDetails(): void {
    this.selectedRequest = null;
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
