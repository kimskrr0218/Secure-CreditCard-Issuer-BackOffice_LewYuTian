import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TopNavbarComponent } from '../components/top-navbar.component';

@Component({
  selector: 'app-view-customer',
  standalone: true,
  imports: [CommonModule, FormsModule, TopNavbarComponent],
  templateUrl: './view-customer.component.html',
  styleUrls: ['./view-customer.component.css']
})
export class ViewCustomerComponent implements OnInit {
  customer: any = null;
  requestStatus: string | null = null;
  rejectionReason: string | null = null;
  backLabel: string = 'Back to Customers';
  backPath: string = '/customers';

  // Pending request approval
  pendingRequest: any = null;
  isManager: boolean = false;
  showRejectModal = false;
  rejectReason = '';
  showMessageModal = false;
  modalMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const role = localStorage.getItem('role') || '';
    this.isManager = role === 'MANAGER' || role === 'ADMIN';

    // Detect where we came from
    const from = this.route.snapshot.queryParamMap.get('from');
    if (from === 'pending') {
      this.backLabel = 'Back to Pending Requests';
      this.backPath = '/pending';
    }

    // Check for pending request info from router state
    const statePending = history.state?.pendingRequest;
    if (statePending) {
      this.pendingRequest = statePending;
      this.requestStatus = statePending.status;
      this.rejectionReason = statePending.rejectionReason || null;
    }

    // Check for rejection info from router state (legacy)
    const stateStatus = history.state?.requestStatus;
    const stateReason = history.state?.rejectionReason;
    if (stateStatus && !this.requestStatus) {
      this.requestStatus = stateStatus;
      this.rejectionReason = stateReason || 'No reason provided';
    }

    // 1. Check if data was passed in the router state (common for pending/rejected requests)
    const stateData = history.state?.customer;

    if (stateData) {
      this.customer = stateData;
      return;
    }

    // 2. Otherwise fetch from the backend via ID
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.http.get(`/api/customers/${id}`, { withCredentials: true }).subscribe({
        next: (data) => this.customer = data,
        error: (err) => console.error('Error fetching customer details', err)
      });
    }
  }

  get canApproveReject(): boolean {
    return this.isManager && this.pendingRequest?.status === 'PENDING';
  }

  approve(): void {
    if (!this.pendingRequest?.id) return;
    this.http.put(`/api/pending/${this.pendingRequest.id}/approve`, {}).subscribe({
      next: () => {
        this.modalMessage = 'Request approved successfully.';
        this.showMessageModal = true;
        this.pendingRequest.status = 'APPROVED';
        this.requestStatus = 'APPROVED';
      },
      error: (err) => {
        const msg = err.error?.error || err.error?.message || 'Failed to approve request.';
        this.modalMessage = msg;
        this.showMessageModal = true;
      }
    });
  }

  openRejectModal(): void {
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  confirmReject(): void {
    if (!this.rejectReason.trim() || !this.pendingRequest?.id) return;
    this.http.put(`/api/pending/${this.pendingRequest.id}/reject`, { reason: this.rejectReason }).subscribe({
      next: () => {
        this.showRejectModal = false;
        this.modalMessage = 'Request rejected successfully.';
        this.showMessageModal = true;
        this.pendingRequest.status = 'REJECTED';
        this.requestStatus = 'REJECTED';
        this.rejectionReason = this.rejectReason;
      },
      error: (err) => {
        this.showRejectModal = false;
        const msg = err.error?.error || err.error?.message || 'Failed to reject request.';
        this.modalMessage = msg;
        this.showMessageModal = true;
      }
    });
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectReason = '';
  }

  closeMessage(): void {
    this.showMessageModal = false;
  }

  goBack(): void {
    this.router.navigate([this.backPath]);
  }
}
