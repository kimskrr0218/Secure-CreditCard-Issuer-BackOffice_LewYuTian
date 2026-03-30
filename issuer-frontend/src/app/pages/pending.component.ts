import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TopNavbarComponent } from '../components/top-navbar.component';

@Component({
  selector: 'app-pending',
  standalone: true,
  imports: [CommonModule, FormsModule, TopNavbarComponent],
  templateUrl: './pending.component.html',
  styleUrls: ['./pending.component.css']
})
export class PendingComponent implements OnInit {
  showMessageModal = false;
  modalMessage = "";

  closeMessage() {
    this.showMessageModal = false;
  }

  showRejectModal = false;
  rejectReason = "";
  selectedRequestId: number | null = null;

  openRejectModal(requestId: number) {
    this.selectedRequestId = requestId;
    this.rejectReason = "";
    this.showRejectModal = true;
  }

  confirmReject() {
    if (!this.rejectReason.trim()) {
      return;
    }

    if (!this.selectedRequestId || !this.isManager) return;

    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.put(
      `${this.apiUrl}/${this.selectedRequestId}/reject`,
      { reason: this.rejectReason },
      { headers, withCredentials: true }
    ).subscribe({
      next: () => {
        this.showRejectModal = false;
        this.modalMessage = "Request rejected successfully.";
        this.showMessageModal = true;
        this.loadRequests();
      },
      error: (err) => {
        console.error('Error rejecting request:', err);
        this.modalMessage = "Failed to reject request.";
        this.showMessageModal = true;
      }
    });
  }

  closeRejectModal() {
    this.showRejectModal = false;
    this.selectedRequestId = null;
    this.rejectReason = "";
  }


  requests: any[] = [];

  // 🔥 FILTER STATE
  currentFilter: string = 'ALL';
  selectedStatus: string = 'ALL';

  // 🔥 ROLE CONTROL
  isManager: boolean = false;

  private apiUrl = 'http://localhost:8080/api/pending';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {

    // 🔥 Detect role from localStorage
    const role = localStorage.getItem('role');

    this.isManager = role === 'MANAGER' || role === 'ADMIN';

    this.loadRequests();
  }

  loadRequests(): void {
    this.http.get<any[]>(this.apiUrl, { withCredentials: true }).subscribe({
      next: (data) => {
        this.requests = data.map(req => {
          let parsed = {};
          try {
            parsed = JSON.parse(req.payload);
          } catch (e) {}
          return { ...req, parsedPayload: parsed };
        });
      },
      error: (err) => console.error('Error loading requests:', err)
    });
  }

  // 🔥 FILTER LOGIC
  get customerRequests(): any[] {
    const custReqs = this.requests.filter(r => r.entityType === 'CUSTOMER');
    if (this.currentFilter === 'ALL') {
      return custReqs;
    }
    return custReqs.filter(r => r.status === this.currentFilter);
  }

  get accountRequests(): any[] {
    const accReqs = this.requests.filter(r => r.entityType === 'ACCOUNT');
    if (this.currentFilter === 'ALL') {
      return accReqs;
    }
    return accReqs.filter(r => r.status === this.currentFilter);
  }

  get cardRequests(): any[] {
    const cardReqs = this.requests.filter(r => r.entityType === 'CARD');
    if (this.currentFilter === 'ALL') {
      return cardReqs;
    }
    return cardReqs.filter(r => r.status === this.currentFilter);
  }

  setFilter(status: string): void {
    this.currentFilter = status;
    this.selectedStatus = status;
  }

  approve(id: number): void {

    if (!this.isManager) return; // extra safety

    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.put(
      `${this.apiUrl}/${id}/approve`,
      {},
      { headers, withCredentials: true }
    ).subscribe({
      next: () => {
        this.modalMessage = "Request approved successfully.";
          this.showMessageModal = true;
        this.loadRequests();
      },
      error: (err) => {
        console.error('Error approving request:', err);
        this.modalMessage = "Failed to approve request.";
          this.showMessageModal = true;
      }
    });
  }

  reject(id: number): void {
    if (!this.isManager) return;
    this.openRejectModal(id);
  }

  viewCustomer(req: any): void {
    if (req.entityType === 'CUSTOMER') {
      const id = req.entityId || req.id;
      // Pass the customer data in router state so the View page can show it immediately
      // (especially for new requests which are not in the database yet)
      this.router.navigate(['/customers/view', id], {
        state: { customer: req.parsedPayload },
        queryParams: { from: 'pending' }
      });
    }
  }

  viewAccount(requestId: number): void {
    this.router.navigate(['/accounts/view', requestId], {
      queryParams: { from: 'pending' }
    });
  }

  viewCard(requestId: number): void {
    this.router.navigate(['/cards/view', requestId], {
      queryParams: { from: 'pending' }
    });
  }

  maskCardNumber(number: string): string {
    if (!number || number.length < 16) return number || '-';
    return number.substring(0, 4) + ' **** **** ' + number.substring(number.length - 4);
  }
}