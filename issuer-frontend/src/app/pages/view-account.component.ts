import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TopNavbarComponent } from '../components/top-navbar.component';

@Component({
  selector: 'app-view-account',
  standalone: true,
  imports: [CommonModule, FormsModule, TopNavbarComponent],
  templateUrl: './view-account.component.html',
  styleUrls: ['./view-account.component.css']
})
export class ViewAccountComponent implements OnInit {
  account: any = null;
  requestStatus: string | null = null;
  rejectionReason: string | null = null;
  backLabel: string = 'Back to Accounts';
  backPath: string = '/accounts';

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

    const id = this.route.snapshot.paramMap.get('id');
    const fromPending = this.route.snapshot.queryParamMap.get('from') === 'pending';
    const stateRequest = history.state?.request;
    const statePending = history.state?.pendingRequest;

    if (fromPending) {
      this.backLabel = 'Back to Pending Requests';
      this.backPath = '/pending';
    }

    if (statePending) {
      this.pendingRequest = statePending;
      this.requestStatus = statePending.status;
      this.rejectionReason = statePending.rejectionReason || null;
    }

    if (stateRequest) {
      if (stateRequest.status === 'REJECTED') {
        this.requestStatus = 'REJECTED';
        this.rejectionReason = stateRequest.rejectionReason || stateRequest.reason || 'No reason provided';
      }
    }

    if (id) {
      if (fromPending) {
        // Fetch from pending endpoint
        this.http.get(`/api/pending`, { withCredentials: true }).subscribe({
          next: (data: any) => {
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

              // Set pendingRequest if not already set from state
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

              // For non-CREATE operations, fetch live account data
              const entityId = req.entityId || payloadObj.entityId || payloadObj.id || payloadObj.accountId;
              if (req.operation !== 'CREATE' && entityId) {
                this.http.get(`/api/accounts/${entityId}`, { withCredentials: true }).subscribe({
                  next: (liveData: any) => {
                    this.account = {
                      ...liveData,
                      isPendingView: true
                    };
                  },
                  error: () => {
                    // Fallback to payload data
                    this.account = {
                      ...payloadObj,
                      accountNumber: payloadObj.accountNumber || 'N/A',
                      status: payloadObj.status || 'PENDING',
                      customer: payloadObj.customer || {
                        customerNo: payloadObj.customerNo || 'N/A',
                        name: payloadObj.customerName || ''
                      },
                      isPendingView: true
                    };
                  }
                });
              } else {
                // CREATE operation — use payload data
                this.account = {
                  ...payloadObj,
                  accountNumber: payloadObj.accountNumber || 'Pending...',
                  status: req.status || 'PENDING',
                  customer: payloadObj.customer || {
                    customerNo: payloadObj.customerNo || 'N/A',
                    name: payloadObj.customerName || ''
                  },
                  isPendingView: true
                };
              }
            }
          },
          error: (err) => console.error('Error fetching pending request', err)
        });
      } else {
        // Existing direct account fetch
        this.http.get(`/api/accounts/${id}`, { withCredentials: true }).subscribe({
          next: (data) => this.account = data,
          error: (err) => {
            console.error('Error fetching account details', err);
            // Fallback if it's a rejected CREATE request (no account exists in DB yet)
            if (stateRequest && stateRequest.operation === 'CREATE') {
              let payloadObj: any = {};
              try {
                payloadObj = typeof stateRequest.payload === 'string'
                  ? JSON.parse(stateRequest.payload)
                  : stateRequest.payload;
              } catch (e) {}

              this.account = {
                ...payloadObj,
                accountNumber: stateRequest.accountNumber || payloadObj.accountNumber || 'N/A',
                status: payloadObj.status || 'PENDING',
                customer: {
                  customerNo: stateRequest.customerNo || 'N/A',
                  name: stateRequest.name || ''
                }
              };
            }
          }
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

    const operation = this.pendingRequest.operation || '';
    let payload: any = {};
    try {
      payload = typeof this.pendingRequest.payload === 'string'
        ? JSON.parse(this.pendingRequest.payload)
        : (this.pendingRequest.payload || {});
    } catch (e) {}

    if (operation === 'CREATE') {
      // For rejected CREATE, use the edit-rejected-account page
      this.router.navigate(['/accounts/edit-rejected', this.pendingRequest.id], {
        state: {
          requestData: {
            customerId: payload.customer?.id || payload.customerId || '',
            accountNumber: payload.accountNumber || '',
            currency: payload.currency || 'USD',
            balance: payload.balance ?? '',
            creditLimit: payload.creditLimit ?? '',
            billingCycle: payload.billingCycle || '',
            interestRate: payload.interestRate ?? '',
            openDate: payload.openDate || '',
            rejectionReason: this.pendingRequest.rejectionReason || ''
          }
        }
      });
    } else {
      // For rejected UPDATE, use the regular edit page with pendingRequestId
      let entityId = this.account?.id;
      if (!entityId) {
        entityId = payload.id || payload.accountId;
      }
      if (entityId) {
        this.router.navigate(['/accounts', entityId, 'edit'], {
          queryParams: { pendingRequestId: this.pendingRequest.id }
        });
      }
    }
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
}
