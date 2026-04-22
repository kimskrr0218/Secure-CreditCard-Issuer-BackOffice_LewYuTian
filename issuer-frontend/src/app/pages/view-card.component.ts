import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TopNavbarComponent } from '../components/top-navbar.component';

@Component({
  selector: 'app-view-card',
  standalone: true,
  imports: [CommonModule, FormsModule, TopNavbarComponent],
  templateUrl: './view-card.component.html',
  styleUrls: ['./view-card.component.css']
})
export class ViewCardComponent implements OnInit {
  card: any = null;
  requestStatus: string | null = null;
  rejectionReason: string | null = null;

  // Pending request approval
  pendingRequest: any = null;
  isManager: boolean = false;
  showConfirmApproveModal = false;
  showRejectModal = false;
  rejectReason = '';
  showMessageModal = false;
  modalMessage = '';
  backLabel: string = 'Back';
  backPath: string = '/cards';
  showConfirmDeleteModal = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private location: Location
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

              // For non-CREATE operations, fetch live card data
              const entityId = req.entityId || payloadObj.entityId || payloadObj.id || payloadObj.oldCardId;
              if (req.operation !== 'CREATE' && entityId) {
                this.http.get(`/api/cards/${entityId}`, { withCredentials: true }).subscribe({
                  next: (liveData: any) => {
                    this.card = {
                      ...liveData,
                      isPendingView: true
                    };
                  },
                  error: () => {
                    // Fallback to enriched payload data
                    this.card = {
                      ...payloadObj,
                      cardNumber: payloadObj.cardNumber || 'N/A',
                      status: payloadObj.status || 'PENDING',
                      account: payloadObj.account || (payloadObj.accountNumber ? {
                        accountNumber: payloadObj.accountNumber,
                        currency: payloadObj.accountCurrency || ''
                      } : undefined),
                      customer: payloadObj.customer || (payloadObj.customerNo ? {
                        customerNo: payloadObj.customerNo,
                        name: payloadObj.customerName || ''
                      } : undefined),
                      customerName: payloadObj.customerName || payloadObj.cardHolderName || 'N/A',
                      isPendingView: true
                    };
                  }
                });
              } else {
                // CREATE operation — use payload data
                this.card = {
                  ...payloadObj,
                  cardNumber: payloadObj.cardNumber || 'Pending...',
                  status: req.status || 'PENDING',
                  customerName: payloadObj.customerName || req.customerNo || 'N/A',
                  isPendingView: true
                };
              }
            }
          },
          error: (err) => console.error('Error fetching pending request', err)
        });
      } else {
        this.http.get(`/api/cards/${id}`, { withCredentials: true }).subscribe({
          next: (data) => this.card = data,
          error: (err) => {
            console.error('Error fetching card details', err);
            if (stateRequest && stateRequest.operation === 'CREATE') {
              let payloadObj: any = {};
              try {
                payloadObj = typeof stateRequest.payload === 'string'
                  ? JSON.parse(stateRequest.payload)
                  : stateRequest.payload;
              } catch (e) {}

              this.card = {
                ...payloadObj,
                cardNumber: stateRequest.cardNumber || payloadObj.cardNumber || 'N/A',
                status: payloadObj.status || 'PENDING',
                customerName: stateRequest.customerName || 'N/A'
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
    const pendingId = this.pendingRequest.id;
    let payload: any = {};
    try {
      payload = typeof this.pendingRequest.payload === 'string' ? JSON.parse(this.pendingRequest.payload) : (this.pendingRequest.payload || {});
    } catch (e) {}
    this.router.navigate(['/cards/edit-rejected', pendingId], {
      state: {
        requestData: {
          accountId: payload.accountId || '',
          cardType: payload.cardType || '',
          cardBrand: payload.cardBrand || '',
          cardMode: payload.cardMode || 'PHYSICAL',
          cardHolderName: payload.cardHolderName || '',
          cardNumber: payload.cardNumber || '',
          rejectionReason: this.pendingRequest.rejectionReason || ''
        }
      }
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

  maskCardNumber(number: string): string {
    if (!number || number.length < 16 || number === 'Pending...') return number;
    return number.substring(0, 4) + ' **** **** ' + number.substring(number.length - 4);
  }
}
