import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TopNavbarComponent } from '../components/top-navbar.component';

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [CommonModule, FormsModule, TopNavbarComponent],
  templateUrl: './cards.component.html',
  styleUrls: ['./cards.component.css']
})
export class CardsComponent implements OnInit {
  cards: any[] = [];
  filteredCards: any[] = [];
  pendingRequests: any[] = [];
  rejectedRequests: any[] = [];

  loading = true;

  // Tab state
  activeTab: string = 'live';

  // Filters state
  filterCustNo: string = '';
  filterType: string = '';
  filterCardholderName: string = '';
  filterStatus: string = '';
  filterPendingStatus: string = '';

  isManager: boolean = false;
  isStaff: boolean = false;

  // Confirm modal state
  showConfirmModal = false;
  confirmMessage = '';
  pendingAction: (() => void) | null = null;

  // Message modal state
  showMessageModal = false;
  modalMessage = '';

  // Block modal state
  showBlockModal = false;
  blockCardId: number | null = null;
  blockReason = '';
  blockNotes = '';
  blockReasons = ['Lost', 'Stolen', 'Damaged'];

  // Replace modal state
  showReplaceModal = false;
  replaceOldCardId: number | null = null;
  replaceCardHolderName = '';
  replaceOldCard: any = null;

  private cardsApiUrl = 'http://localhost:8080/api/cards';
  private pendingApiUrl = 'http://localhost:8080/api/pending';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    const role = localStorage.getItem('role') || '';
    this.isManager = role === 'MANAGER' || role === 'ADMIN';
    this.isStaff = role === 'STAFF' || role === 'ADMIN';

    this.loadAllData();
  }

  // Store all pending data for cross-referencing
  allPendingData: any[] = [];

  loadAllData(): void {
    this.loading = true;
    
    // Load Live Cards
    this.http.get<any[]>(this.cardsApiUrl, { withCredentials: true }).subscribe({
      next: (data) => {
        this.cards = data;
        this.enrichCardsWithPendingStatus();
        this.filteredCards = [...this.cards];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading cards', err);
        this.loading = false;
      }
    });

    // Load Pending/Rejected Requests
    this.http.get<any[]>(this.pendingApiUrl, { withCredentials: true }).subscribe({
      next: (data) => {
        const cardReqs = data
          .filter(req => req.entityType === 'CARD')
          .map(req => {
            let parsed = {};
            try { parsed = JSON.parse(req.payload); } catch(e) {}
            return { ...req, parsedPayload: parsed };
          });
        
        this.pendingRequests = cardReqs.filter(req => req.status === 'PENDING');
        this.rejectedRequests = cardReqs.filter(req => req.status === 'REJECTED');

        // Enrich live cards with their pending status
        this.allPendingData = data.filter(req => req.entityType === 'CARD');
        this.enrichCardsWithPendingStatus();
        this.filteredCards = [...this.cards];
      },
      error: (err) => {
        console.error('Error loading card requests', err);
      }
    });
  }

  /** Enrich each live card with their latest pending request approval status */
  enrichCardsWithPendingStatus(): void {
    if (!this.cards.length || !this.allPendingData.length) return;

    for (const card of this.cards) {
      const relatedRequests = this.allPendingData
        .filter(req => {
          if (req.entityId != null && req.entityId == card.id) return true;
          try {
            const payload = typeof req.payload === 'string' ? JSON.parse(req.payload) : req.payload;
            if ((payload.id != null && payload.id == card.id) || (payload.oldCardId != null && payload.oldCardId == card.id)) return true;
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
          card.pendingStatus = 'PENDING';
        } else {
          card.pendingStatus = relatedRequests[0].status;
        }
      } else {
        card.pendingStatus = null;
      }
    }
  }

  applyFilters(): void {
    this.filteredCards = this.cards.filter(c => {
      const custNo = this.filterCustNo.trim().toLowerCase();
      const cardType = this.filterType;
      const holderName = this.filterCardholderName.trim().toLowerCase();

      if (custNo && !(c.customer?.customerNo && c.customer.customerNo.toLowerCase().includes(custNo))) return false;
      if (cardType && c.cardType !== cardType) return false;
      if (holderName && !(c.cardHolderName && c.cardHolderName.toLowerCase().includes(holderName))) return false;
      if (this.filterStatus && c.status !== this.filterStatus) return false;
      if (this.filterPendingStatus) {
        if (this.filterPendingStatus === 'NONE' && c.pendingStatus != null) return false;
        if (this.filterPendingStatus !== 'NONE' && c.pendingStatus !== this.filterPendingStatus) return false;
      }
      return true;
    });
  }

  clearFilters(): void {
    this.filterCustNo = '';
    this.filterType = '';
    this.filterCardholderName = '';
    this.filterStatus = '';
    this.filterPendingStatus = '';
    this.applyFilters();
  }

  navigateToAdd(): void {
    this.router.navigate(['/cards/add']);
  }

  viewLiveCard(id: number): void {
    this.router.navigate(['/cards/view', id]);
  }

  viewPendingCard(id: number): void {
    this.router.navigate(['/cards/view', id], { queryParams: { from: 'pending' } });
  }

  blockCard(card: any): void {
    this.blockCardId = card.id;
    this.blockReason = '';
    this.blockNotes = '';
    this.showBlockModal = true;
  }

  cancelBlock(): void {
    this.showBlockModal = false;
    this.blockCardId = null;
    this.blockReason = '';
    this.blockNotes = '';
  }

  submitBlock(): void {
    if (!this.blockCardId || !this.blockReason) return;

    const reqPayload = {
      entityType: 'CARD',
      operation: 'BLOCK',
      payload: JSON.stringify({
        id: this.blockCardId,
        reason: this.blockReason,
        notes: this.blockNotes || ''
      })
    };

    this.http.post(this.pendingApiUrl, reqPayload, { withCredentials: true }).subscribe({
      next: () => {
        this.showBlockModal = false;
        this.blockCardId = null;
        this.modalMessage = 'Block card request submitted for approval.';
        this.showMessageModal = true;
        this.loadAllData();
      },
      error: () => {
        this.showBlockModal = false;
        this.modalMessage = 'Failed to submit block request.';
        this.showMessageModal = true;
      }
    });
  }

  replaceCard(card: any): void {
    this.replaceOldCardId = card.id;
    this.replaceOldCard = card;
    this.replaceCardHolderName = card.cardHolderName || '';
    this.showReplaceModal = true;
  }

  cancelReplace(): void {
    this.showReplaceModal = false;
    this.replaceOldCardId = null;
    this.replaceOldCard = null;
    this.replaceCardHolderName = '';
  }

  submitReplace(): void {
    if (!this.replaceOldCardId || !this.replaceCardHolderName.trim()) return;

    const reqPayload = {
      entityType: 'CARD',
      operation: 'REPLACE',
      payload: JSON.stringify({
        oldCardId: this.replaceOldCardId,
        cardHolderName: this.replaceCardHolderName.trim()
      })
    };

    this.http.post(this.pendingApiUrl, reqPayload, { withCredentials: true }).subscribe({
      next: () => {
        this.showReplaceModal = false;
        this.replaceOldCardId = null;
        this.modalMessage = 'Card replacement request submitted for approval.';
        this.showMessageModal = true;
        this.loadAllData();
      },
      error: () => {
        this.showReplaceModal = false;
        this.modalMessage = 'Failed to submit replacement request.';
        this.showMessageModal = true;
      }
    });
  }

  unblockCard(id: number): void {
    this.confirmMessage = 'Are you sure you want to unblock this card? It will be set to INACTIVE.';
    this.pendingAction = () => this.submitCardAction('UNBLOCK', id, 'Unblock request submitted for approval.');
    this.showConfirmModal = true;
  }

  deactivateCard(id: number): void {
    this.confirmMessage = 'Are you sure you want to deactivate this card? This action is difficult to reverse.';
    this.pendingAction = () => this.submitCardAction('DEACTIVATE', id, 'Deactivate request submitted for approval.');
    this.showConfirmModal = true;
  }

  activateCard(id: number): void {
    this.confirmMessage = 'Are you sure you want to activate this card? The card will become ACTIVE and ready for use. An email notification will be sent.';
    this.pendingAction = () => this.submitCardAction('ACTIVATE', id, 'Activate request submitted for approval.');
    this.showConfirmModal = true;
  }

  issueCard(id: number): void {
    this.confirmMessage = 'Are you sure you want to issue this card? The card status will change to ISSUED. An email notification will be sent.';
    this.pendingAction = () => this.submitCardAction('ISSUE', id, 'Issue card request submitted for approval.');
    this.showConfirmModal = true;
  }

  deleteCard(id: number): void {
    this.confirmMessage = 'Are you sure you want to permanently delete this card? This cannot be undone.';
    this.pendingAction = () => this.submitCardAction('DELETE', id, 'Delete request submitted for approval.');
    this.showConfirmModal = true;
  }

  private submitCardAction(operation: string, id: number, successMessage: string): void {
    const reqPayload = {
      entityType: 'CARD',
      operation: operation,
      payload: JSON.stringify({ id: id })
    };
    this.http.post(this.pendingApiUrl, reqPayload, { withCredentials: true }).subscribe({
      next: () => {
        this.modalMessage = successMessage;
        this.showMessageModal = true;
        this.loadAllData();
      },
      error: () => {
        this.modalMessage = 'Failed to submit request. Please try again.';
        this.showMessageModal = true;
      }
    });
  }

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

  closeMessage(): void {
    this.showMessageModal = false;
  }

  editCard(id: number): void {
    this.router.navigate(['/cards/edit', id]);
  }

  removeRejected(id: number): void {
    this.confirmMessage = 'Are you sure you want to remove this rejected request?';
    this.pendingAction = () => {
      this.http.delete(`${this.pendingApiUrl}/${id}`, { withCredentials: true }).subscribe({
        next: () => {
          this.modalMessage = 'Rejected request removed.';
          this.showMessageModal = true;
          this.loadAllData();
        },
        error: () => {
          this.modalMessage = 'Failed to remove rejected request.';
          this.showMessageModal = true;
        }
      });
    };
    this.showConfirmModal = true;
  }

  editRejectedRequest(request: any): void {
    const pendingId = request.pendingRequestId || request.id;
    const payload = request.parsedPayload || {};
    this.router.navigate(['/cards/edit-rejected', pendingId], {
      state: {
        requestData: {
          accountId: payload.accountId || payload.account?.id || '',
          cardType: payload.cardType || '',
          cardBrand: payload.cardBrand || '',
          cardMode: payload.cardMode || 'PHYSICAL',
          cardHolderName: payload.cardHolderName || '',
          cardNumber: payload.cardNumber || '',
          accountNumber: payload.accountNumber || '',
          accountCurrency: payload.accountCurrency || '',
          customerNo: payload.customerNo || request.customerNo || '',
          customerName: payload.customerName || '',
          rejectionReason: request.rejectionReason || request.reason || ''
        }
      }
    });
  }

  maskCardNumber(number: string): string {
    if (!number || number.length < 16) return number;
    return number.substring(0, 4) + ' **** **** ' + number.substring(number.length - 4);
  }
}
