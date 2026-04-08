import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
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

    this.http.put(
      `${this.apiUrl}/${this.selectedRequestId}/reject`,
      { reason: this.rejectReason }
    ).subscribe({
      next: () => {
        this.showRejectModal = false;
        this.modalMessage = "Request rejected successfully.";
        this.showMessageModal = true;
        this.loadRequests();
      },
      error: (err) => {
        console.error('Error rejecting request:', err);
        const msg = err.error?.error || err.error?.message || 'Failed to reject request.';
        this.modalMessage = msg;
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

  // FILTER STATE
  currentFilter: string = 'ALL';       // Status filter: ALL / PENDING / APPROVED / REJECTED
  entityFilter: string = 'ALL';         // Entity type filter: ALL / CUSTOMER / ACCOUNT / CARD

  // SEARCH FILTER STATE
  filterTaskId: string = '';
  filterKeyword: string = '';

  // 🔥 ROLE CONTROL
  isManager: boolean = false;

  private apiUrl = '/api/pending';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {

    // 🔥 Detect role from localStorage
    const role = localStorage.getItem('role');

    this.isManager = role === 'MANAGER' || role === 'ADMIN';

    this.loadRequests();
  }

  loadRequests(): void {
    this.http.get<any[]>(this.apiUrl).subscribe({
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

  // UNIFIED FILTER LOGIC
  get filteredTasks(): any[] {
    let tasks = [...this.requests];

    // Entity type filter
    if (this.entityFilter !== 'ALL') {
      tasks = tasks.filter(r => r.entityType === this.entityFilter);
    }

    // Status filter
    if (this.currentFilter !== 'ALL') {
      tasks = tasks.filter(r => r.status === this.currentFilter);
    }

    // Search filters
    const taskId = this.filterTaskId.trim();
    const keyword = this.filterKeyword.trim().toLowerCase();

    if (taskId) {
      tasks = tasks.filter(r => String(r.id).includes(taskId));
    }

    if (keyword) {
      tasks = tasks.filter(r => {
        const searchable = [
          r.entityType,
          r.operation,
          r.status,
          r.customerNo,
          r.name,
          r.accountNumber,
          r.createdBy,
          r.parsedPayload?.customerNo,
          r.parsedPayload?.name,
          r.parsedPayload?.accountNumber,
          r.parsedPayload?.cardHolderName,
          r.parsedPayload?.cardNumber
        ].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(keyword);
      });
    }

    return tasks;
  }

  clearFilters(): void {
    this.filterTaskId = '';
    this.filterKeyword = '';
  }

  triggerSearch(): void {
    // filteredTasks getter re-evaluates on every change detection cycle
  }

  setFilter(status: string): void {
    this.currentFilter = status;
  }

  setEntityFilter(type: string): void {
    this.entityFilter = type;
  }

  approve(id: number): void {

    if (!this.isManager) return; // extra safety

    this.http.put(
      `${this.apiUrl}/${id}/approve`,
      {}
    ).subscribe({
      next: () => {
        this.modalMessage = "Request approved successfully.";
          this.showMessageModal = true;
        this.loadRequests();
      },
      error: (err) => {
        console.error('Error approving request:', err);
        const msg = err.error?.error || err.error?.message || 'Failed to approve request.';
        this.modalMessage = msg;
        this.showMessageModal = true;
      }
    });
  }

  reject(id: number): void {
    if (!this.isManager) return;
    this.openRejectModal(id);
  }

  // Unified view handler — routes based on entity type
  viewTask(req: any): void {
    const pendingRequest = {
      id: req.id,
      status: req.status,
      operation: req.operation,
      createdBy: req.createdBy,
      rejectionReason: req.rejectionReason || req.reason
    };

    if (req.entityType === 'CUSTOMER') {
      const id = req.entityId || req.id;
      this.router.navigate(['/customers/view', id], {
        state: { customer: req.parsedPayload, pendingRequest },
        queryParams: { from: 'pending' }
      });
    } else if (req.entityType === 'ACCOUNT') {
      this.router.navigate(['/accounts/view', req.id], {
        state: { request: req, pendingRequest },
        queryParams: { from: 'pending' }
      });
    } else if (req.entityType === 'CARD') {
      this.router.navigate(['/cards/view', req.id], {
        state: { request: req, pendingRequest },
        queryParams: { from: 'pending' }
      });
    }
  }

  maskCardNumber(number: string): string {
    if (!number || number.length < 16) return number || '-';
    return number.substring(0, 4) + ' **** **** ' + number.substring(number.length - 4);
  }
}