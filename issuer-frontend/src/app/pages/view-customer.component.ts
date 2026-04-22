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
  showConfirmApproveModal = false;
  showRejectModal = false;
  rejectReason = '';
  showMessageModal = false;
  modalMessage = '';

  showConfirmDeleteModal = false;

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
    const fromPending = from === 'pending';
    if (fromPending) {
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
      this.customer = this.enrichCustomerData(stateData);
      return;
    }

    // 2. Otherwise fetch from the backend via ID
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      if (fromPending) {
        // Fetch from pending endpoint — the ID is a pending request ID, not a customer ID
        this.http.get<any[]>('/api/pending', { withCredentials: true }).subscribe({
          next: (data) => {
            const req = data.find((r: any) => r.id === Number(id));
            if (req) {
              let payloadObj: any = {};
              try {
                payloadObj = typeof req.payload === 'string'
                  ? JSON.parse(req.payload)
                  : req.payload;
              } catch (e) {}

              this.requestStatus = req.status;
              this.rejectionReason = req.rejectionReason || req.reason;

              if (!this.pendingRequest) {
                this.pendingRequest = {
                  id: req.id,
                  status: req.status,
                  operation: req.operation,
                  createdBy: req.createdBy,
                  rejectionReason: req.rejectionReason || req.reason,
                  payload: req.payload
                };
              }

              // For existing customer operations (UPDATE/DEACTIVATE/ACTIVATE/DELETE), fetch live data
              const entityId = req.entityId || payloadObj.id;
              if (entityId && req.operation !== 'CREATE') {
                this.http.get(`/api/customers/${entityId}`, { withCredentials: true }).subscribe({
                  next: (liveData: any) => this.customer = liveData,
                  error: () => {
                    // Fallback to payload data
                    this.customer = this.enrichCustomerData({
                      ...payloadObj,
                      customerNo: payloadObj.customerNo || 'N/A',
                      status: req.status || 'PENDING',
                      isPendingView: true
                    });
                  }
                });
              } else {
                // CREATE request — use payload data
                this.customer = this.enrichCustomerData({
                  ...payloadObj,
                  name: payloadObj.name || ((payloadObj.firstName || '') + ' ' + (payloadObj.lastName || '')).trim(),
                  customerNo: payloadObj.customerNo || 'Pending...',
                  status: req.status || 'PENDING',
                  isPendingView: true
                });
              }
            }
          },
          error: (err) => console.error('Error fetching pending request', err)
        });
      } else {
        this.http.get(`/api/customers/${id}`, { withCredentials: true }).subscribe({
          next: (data) => this.customer = data,
          error: (err) => console.error('Error fetching customer details', err)
        });
      }
    }
  }

  get canApproveReject(): boolean {
    const currentUser = localStorage.getItem('username');
    return this.isManager
      && this.pendingRequest?.status === 'PENDING'
      && this.pendingRequest?.createdBy !== currentUser;
  }

  approve(): void {
    this.showConfirmApproveModal = true;
  }

  confirmApprove(): void {
    this.showConfirmApproveModal = false;
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

  cancelApprove(): void {
    this.showConfirmApproveModal = false;
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

  get canEditResubmit(): boolean {
    const currentUser = localStorage.getItem('username');
    return this.pendingRequest?.status === 'REJECTED'
      && this.pendingRequest?.createdBy === currentUser;
  }

  editResubmit(): void {
    if (!this.pendingRequest?.id) return;
    const pendingId = this.pendingRequest.id;
    let requestData: any = {};
    try {
      const payload = typeof this.pendingRequest.payload === 'string' ? JSON.parse(this.pendingRequest.payload) : (this.pendingRequest.payload || {});
      requestData = { ...payload };
    } catch (e) {}
    this.router.navigate(['/customers/edit-rejected', pendingId], {
      state: { requestData }
    });
  }

  confirmDeleteRequest(): void {
    this.showConfirmDeleteModal = true;
  }

  cancelDeleteRequest(): void {
    this.showConfirmDeleteModal = false;
  }

  executeDeleteRequest(): void {
    this.showConfirmDeleteModal = false;
    if (!this.pendingRequest?.id) return;
    this.http.delete(`/api/pending/${this.pendingRequest.id}`, { withCredentials: true }).subscribe({
      next: () => {
        this.modalMessage = 'Rejected request deleted successfully.';
        this.showMessageModal = true;
        this.pendingRequest = null;
        this.requestStatus = null;
      },
      error: (err) => {
        const msg = err.error?.error || err.error?.message || 'Failed to delete request.';
        this.modalMessage = msg;
        this.showMessageModal = true;
      }
    });
  }

  closeMessage(): void {
    this.showMessageModal = false;
  }

  goBack(): void {
    this.router.navigate([this.backPath]);
  }

  /** Add maskedIdNumber/maskedPhoneNumber for payload-based customer data */
  private enrichCustomerData(data: any): any {
    const enriched = { ...data };
    if (!enriched.name && (enriched.firstName || enriched.lastName)) {
      enriched.name = ((enriched.firstName || '') + ' ' + (enriched.lastName || '')).trim();
    }
    if (!enriched.maskedIdNumber && enriched.idNumber) {
      const id = enriched.idNumber;
      enriched.maskedIdNumber = id.length > 4
        ? '*'.repeat(id.length - 4) + id.slice(-4)
        : id;
    }
    if (!enriched.maskedPhoneNumber && enriched.phoneNumber) {
      const ph = enriched.phoneNumber;
      enriched.maskedPhoneNumber = ph.length > 4
        ? '*'.repeat(ph.length - 4) + ph.slice(-4)
        : ph;
    }
    return enriched;
  }
}
