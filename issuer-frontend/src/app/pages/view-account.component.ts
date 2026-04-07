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
                  rejectionReason: req.rejectionReason || req.reason
                };
              }

              this.account = {
                ...payloadObj,
                accountNumber: payloadObj.accountNumber || 'Pending...',
                status: req.status || 'PENDING',
                isPendingView: true
              };
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
