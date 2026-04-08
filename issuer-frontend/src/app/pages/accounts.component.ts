import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TopNavbarComponent } from '../components/top-navbar.component';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TopNavbarComponent],
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.css']
})
export class AccountsComponent implements OnInit {
  showMessageModal = false;
  modalMessage = "";

  closeMessage() {
    this.showMessageModal = false;
  }

  accounts: any[] = [];
  filteredAccounts: any[] = [];
  customers: any[] = [];
  
  rejectedRequests: any[] = [];
  pendingRequests: any[] = [];

  // Tab state
  activeTab: string = 'live';

  // Filters state
  filterAccountNo: string = '';
  filterEmail: string = '';
  filterName: string = '';
  filterStatus: string = '';
  filterPendingStatus: string = '';

  accountForm!: FormGroup;

  isEditing = false;
  editId: number | null = null;
  loading = true;

  showModal = false;
  selectedAccount: any = null;

  showRequestModal = false;
  selectedRequest: any = null;

  showConfirmModal = false;
  confirmMessage = '';
  pendingAction: (() => void) | null = null;

  private apiUrl = '/api/accounts';
  private customerApi = '/api/customers';
  private pendingUrl = '/api/pending';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.accountForm = this.fb.group({
      customerId: ['', Validators.required],
      accountType: ['', Validators.required],
      creditLimit: [null],
      balance: [0, Validators.required]
    });

    this.loadAccounts();
    this.loadCustomers();
  }

  // ================= LOAD DATA =================

  // Store all pending data for cross-referencing
  allPendingData: any[] = [];

  loadAccounts(): void {
    this.loading = true;

    // 1. Fetch Live Accounts
    this.http.get<any[]>(this.apiUrl, { withCredentials: true }).subscribe({
      next: (data) => {
        this.accounts = data;
        this.enrichAccountsWithPendingStatus();
        this.filteredAccounts = [...this.accounts];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading accounts:', err);
        this.loading = false;
      }
    });

    // 2. Fetch Pending / Rejected Requests
    this.http.get<any[]>(this.pendingUrl, { withCredentials: true }).subscribe({
      next: (data) => {
        // Filter only Account requests
        const accountRequests = data
          .filter(req => req.entityType === 'ACCOUNT')
          .map(req => {
            let payloadObj: any = {};
            try {
              payloadObj = JSON.parse(req.payload);
            } catch (e) {}

            return {
              ...req,
              ...payloadObj,
              pendingRequestId: req.id,
              approvalStatus: req.status || 'PENDING',
              status: req.status || 'PENDING',
              reason: req.rejectionReason || req.reason || req.rejectReason || 'No reason provided'
            };
          });

        this.pendingRequests = accountRequests.filter(req => req.status === 'PENDING');
        this.rejectedRequests = accountRequests.filter(req => req.status === 'REJECTED');

        // Enrich live accounts with their pending status
        this.allPendingData = data.filter(req => req.entityType === 'ACCOUNT');
        this.enrichAccountsWithPendingStatus();
        this.filteredAccounts = [...this.accounts];
      },
      error: (err) => console.error('Error loading pending requests:', err)
    });
  }

  /** Enrich each live account with their latest pending request approval status */
  enrichAccountsWithPendingStatus(): void {
    if (!this.accounts.length || !this.allPendingData.length) return;

    for (const account of this.accounts) {
      const relatedRequests = this.allPendingData
        .filter(req => {
          if (req.entityId != null && req.entityId == account.id) return true;
          try {
            const payload = typeof req.payload === 'string' ? JSON.parse(req.payload) : req.payload;
            if ((payload.id != null && payload.id == account.id) || (payload.accountId != null && payload.accountId == account.id)) return true;
          } catch (e) {}
          return false;
        })
        .sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

      if (relatedRequests.length > 0) {
        const pendingReq = relatedRequests.find(r => r.status === 'PENDING');
        if (pendingReq) {
          account.pendingStatus = 'PENDING';
        } else {
          account.pendingStatus = relatedRequests[0].status;
        }
      } else {
        account.pendingStatus = null;
      }
    }
  }

  loadCustomers(): void {
    this.http.get<any[]>(this.customerApi, { withCredentials: true }).subscribe({
      next: (data) => (this.customers = data),
      error: (err) => console.error('Error loading customers:', err)
    });
  }

  // ================= FILTERS =================

  applyFilters(): void {
    this.filteredAccounts = this.accounts.filter(a => {
      const accNo = this.filterAccountNo.trim().toLowerCase();
      const email = this.filterEmail.trim().toLowerCase();
      const name = this.filterName.trim().toLowerCase();

      if (accNo && !(a.accountNumber && a.accountNumber.toLowerCase().includes(accNo))) return false;
      if (email && !(a.customer?.email && a.customer.email.toLowerCase().includes(email))) return false;
      if (name && !(a.customer?.name && a.customer.name.toLowerCase().includes(name))) return false;
      if (this.filterStatus && a.status !== this.filterStatus) return false;
      if (this.filterPendingStatus) {
        if (this.filterPendingStatus === 'NONE' && a.pendingStatus !== null) return false;
        if (this.filterPendingStatus !== 'NONE' && a.pendingStatus !== this.filterPendingStatus) return false;
      }
      return true;
    });
  }

  clearFilters(): void {
    this.filterAccountNo = '';
    this.filterEmail = '';
    this.filterName = '';
    this.filterStatus = '';
    this.filterPendingStatus = '';
    this.applyFilters();
  }

  // ================= CREATE / UPDATE =================

  onSubmit(): void {
    if (this.accountForm.invalid) return;

    const { customerId, accountType, balance, creditLimit } = this.accountForm.value;
    const role = localStorage.getItem('role');

    const body: any = {
      customer: { id: customerId },
      accountType,
      balance
    };
    
    if (accountType === 'CREDIT' && creditLimit !== null) {
      body.creditLimit = creditLimit;
    }

    // --- STAFF -> pending table ---
    if (role === 'STAFF') {
      const pendingRequest = {
        entityType: 'ACCOUNT',
        operation: this.isEditing ? 'UPDATE' : 'CREATE',
        payload: JSON.stringify({
          id: this.editId,
          customer: { id: customerId },
          accountType,
          creditLimit: accountType === 'CREDIT' ? creditLimit : null,
          balance
        })
      };

      this.http.post(this.pendingUrl, pendingRequest, { withCredentials: true }).subscribe({
        next: () => {
          this.modalMessage = 'Request submitted for manager approval.';
          this.showMessageModal = true;
          this.loadAccounts();
        },
        error: (err) => console.error('Error submitting pending request:', err)
      });
      return;
    }

    // --- MANAGER / ADMIN -> direct ---
    if (this.isEditing && this.editId !== null) {
      this.http.put(`${this.apiUrl}/${this.editId}`, body, { withCredentials: true }).subscribe({
        next: () => {
          this.modalMessage = 'Account updated successfully.';
          this.showMessageModal = true;
          this.loadAccounts();
        },
        error: (err) => console.error('Error updating account:', err)
      });
    } else {
      this.http.post(this.apiUrl, body, { withCredentials: true }).subscribe({
        next: () => {
          this.modalMessage = 'Account created successfully.';
          this.showMessageModal = true;
          this.loadAccounts();
        },
        error: (err) => console.error('Error creating account:', err)
      });
    }
  }

  // ================= EDIT / DELETE =================

  edit(account: any): void {
    this.router.navigate(['/accounts', account.id, 'edit']);
  }

  deactivate(account: any): void {
    this.confirmMessage = 'Are you sure you want to deactivate this account? This will go through maker-checker approval.';
    this.pendingAction = () => {
      const pendingRequest = {
        entityType: 'ACCOUNT',
        operation: 'DEACTIVATE',
        payload: JSON.stringify({ accountId: account.id, status: 'INACTIVE' })
      };

      this.http.post(this.pendingUrl, pendingRequest, { withCredentials: true }).subscribe({
        next: () => {
          this.modalMessage = 'Account deactivation request submitted for approval.';
          this.showMessageModal = true;
          this.loadAccounts();
        },
        error: (err) => console.error('Error submitting deactivate request:', err)
      });
    };
    this.showConfirmModal = true;
  }

  activate(account: any): void {
    this.confirmMessage = 'Are you sure you want to activate this account? This will go through maker-checker approval.';
    this.pendingAction = () => {
      const pendingRequest = {
        entityType: 'ACCOUNT',
        operation: 'ACTIVATE',
        payload: JSON.stringify({ accountId: account.id, status: 'ACTIVE' })
      };

      this.http.post(this.pendingUrl, pendingRequest, { withCredentials: true }).subscribe({
        next: () => {
          this.modalMessage = 'Account activation request submitted for approval.';
          this.showMessageModal = true;
          this.loadAccounts();
        },
        error: (err) => console.error('Error submitting activate request:', err)
      });
    };
    this.showConfirmModal = true;
  }

  // ================= MODAL LOGIC =================
  
  cancelConfirm(): void {
    this.showConfirmModal = false;
    this.pendingAction = null;
  }

  executeConfirm(): void {
    this.showConfirmModal = false;
    if (this.pendingAction) {
      this.pendingAction();
      this.pendingAction = null;
    }
  }

  openCreateAccount(): void {
    this.router.navigate(['/accounts/add']);
  }

  view(account: any): void {
    this.router.navigate(['/accounts/view', account.id]);
  }

  viewRequest(request: any): void {
    this.selectedRequest = request;
    this.showRequestModal = true;
  }

  viewRejectedAccount(request: any): void {
      // Navigate to the Account View page using entityId from the enriched request
      const accountId = request.entityId || request.id;
      if (accountId) {
        this.router.navigate(['/accounts/view', accountId], {
          state: { request: request }
        });
      }
    }

  editRejectedRequest(request: any): void {
    if (request.entityId) {
      this.router.navigate(['/accounts', request.entityId, 'edit'], {
        queryParams: { pendingRequestId: request.id }
      });
    } else {
      // If entityId is null but payload has an ID 
      try {
        const payloadData = typeof request.payload === 'string' ? JSON.parse(request.payload) : request.payload;
        if (payloadData && payloadData.id) {
            this.router.navigate(['/accounts', payloadData.id, 'edit'], {
              queryParams: { pendingRequestId: request.id }
            });
        }
      } catch (e) {
          console.error("Failed to parse request payload for edit", e);
      }
    }
  }

  closeRequestModal(): void {
    this.showRequestModal = false;
    this.selectedRequest = null;
  }

}
