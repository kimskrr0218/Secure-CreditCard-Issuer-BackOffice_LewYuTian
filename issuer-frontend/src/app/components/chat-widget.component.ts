import { Component, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ChatService, ChatMessage } from '../services/chat.service';
import { CustomerService, Customer } from '../services/customer.service';
import { AccountService, Account } from '../services/account.service';
import { CardService, Card } from '../services/card.service';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Floating toggle button -->
    <button class="chat-toggle-btn" (click)="toggleChat()" [class.open]="isOpen" title="AI Assistant">
      <span *ngIf="!isOpen">💬</span>
      <span *ngIf="isOpen">✕</span>
    </button>

    <!-- Chat window -->
    <div class="chat-window" *ngIf="isOpen">
      <div class="chat-header">
        <span class="chat-title">🤖 AI Assistant</span>
        <button class="chat-clear-btn" (click)="clearChat()" title="Clear chat">🗑️</button>
      </div>

      <div class="chat-messages" #messagesContainer>
        <!-- Welcome message -->
        <div class="message assistant" *ngIf="messages.length === 0">
          <div class="message-bubble">
            Hi! I'm your AI assistant. Ask me anything about the system — customers, accounts, cards, or general help!
          </div>
        </div>

        <div *ngFor="let msg of messages" class="message" [ngClass]="msg.role">
          <div class="message-bubble">
            <div class="message-text" [innerHTML]="formatMessage(msg.content)"></div>
          </div>
        </div>

        <!-- Typing indicator -->
        <div class="message assistant" *ngIf="isLoading">
          <div class="message-bubble typing">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <input
          type="text"
          [(ngModel)]="userInput"
          (keydown.enter)="sendMessage()"
          placeholder="Type a message..."
          [disabled]="isLoading"
          #inputField
        />
        <button class="send-btn" (click)="sendMessage()" [disabled]="isLoading || !userInput.trim()">
          ➤
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* ─── Toggle Button ─── */
    .chat-toggle-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      background: #1e293b;
      color: white;
      font-size: 26px;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chat-toggle-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 24px rgba(56, 189, 248, 0.4);
    }
    .chat-toggle-btn.open {
      background: #ef4444;
    }

    /* ─── Chat Window ─── */
    .chat-window {
      position: fixed;
      bottom: 92px;
      right: 24px;
      width: 380px;
      height: 520px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 9998;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ─── Header ─── */
    .chat-header {
      background: #1e293b;
      color: white;
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .chat-title {
      font-weight: 600;
      font-size: 15px;
    }
    .chat-clear-btn {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
    }
    .chat-clear-btn:hover {
      opacity: 1;
    }

    /* ─── Messages ─── */
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f8fafc;
    }
    .chat-messages::-webkit-scrollbar { width: 6px; }
    .chat-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

    .message {
      display: flex;
    }
    .message.user {
      justify-content: flex-end;
    }
    .message.assistant {
      justify-content: flex-start;
    }

    .message-bubble {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }
    .message.user .message-bubble {
      background: #1e293b;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .message.assistant .message-bubble {
      background: #e2e8f0;
      color: #1e293b;
      border-bottom-left-radius: 4px;
    }

    .message-text {
      white-space: pre-wrap;
    }

    /* ─── Typing Indicator ─── */
    .typing {
      display: flex;
      gap: 4px;
      padding: 12px 18px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #94a3b8;
      animation: bounce 1.4s infinite ease-in-out;
    }
    .dot:nth-child(1) { animation-delay: 0s; }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    /* ─── Input Area ─── */
    .chat-input-area {
      display: flex;
      padding: 12px;
      border-top: 1px solid #e2e8f0;
      background: white;
      gap: 8px;
    }
    .chat-input-area input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    .chat-input-area input:focus {
      border-color: #38bdf8;
    }
    .chat-input-area input:disabled {
      background: #f1f5f9;
    }
    .send-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: #1e293b;
      color: white;
      font-size: 18px;
      cursor: pointer;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .send-btn:hover:not(:disabled) {
      background: #334155;
    }
    .send-btn:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }
  `]
})
export class ChatWidgetComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('inputField') private inputField!: ElementRef;

  isOpen = false;
  isLoading = false;
  isLoadingData = false;
  userInput = '';
  messages: ChatMessage[] = [];

  // Live data for context
  private customers: Customer[] = [];
  private accounts: Account[] = [];
  private cards: Card[] = [];
  private dataLoaded = false;

  private static readonly BASE_PROMPT = `You are a helpful AI assistant embedded in a Credit Card Issuer Back-Office system. Answer in plain text only. Do NOT use markdown, bullet points with asterisks, bold, headers, or code blocks. Use simple numbered lists (1. 2. 3.) or dashes (- ) if you need to list items. Keep replies concise and conversational.

ABOUT THE SYSTEM:
This is an internal back-office application for managing credit card customers, their accounts, and cards. It uses a Maker-Checker approval workflow to ensure data integrity.

ROLES:
- STAFF: Can create and edit Customers, Accounts, and Cards. All create/edit actions go to a pending queue for approval. Cannot approve their own requests.
- MANAGER: Can view all data. Approves or rejects pending requests created by Staff. Cannot create or edit records directly.
- ADMIN: Can manage user accounts and assign roles. Also has some edit and approval capabilities.

KEY WORKFLOWS:
1. Creating a Customer: Staff navigates to Customers > Add Customer, fills in the form (name, email, phone, nationality, type, address), and submits. This creates a PENDING request. A Manager must then go to the Pending page and approve it before the customer is actually created.
2. Creating an Account: Staff navigates to Accounts > Add Account, selects a customer, chooses account type, sets initial balance, and submits. This also creates a PENDING request that needs Manager approval.
3. Creating a Card: Staff navigates to Cards > Add Card, selects an account, chooses card type, and submits. Again, this goes through the pending approval process.
4. Editing records: Staff can edit existing customers, accounts, or cards. Edits also go through the Maker-Checker pending approval process.
5. Approving/Rejecting: Managers go to the Pending page to see all pending requests. They can approve (which applies the change) or reject (with a reason). Rejected requests can be re-edited and resubmitted by Staff.

NAVIGATION:
- Dashboard: Overview with summary statistics (total customers, active accounts, active cards, pending requests).
- Customers page: List all customers, search, view details, add new, or edit.
- Accounts page: List all accounts, view details, add new, or edit.
- Cards page: List all cards, view details, add new, or edit.
- Pending page: View all pending create/edit requests awaiting approval.
- Roles page (Admin only): Manage user roles and permissions.

If asked about something outside this system, you can still help but mention you are primarily here to assist with the back-office system.`;

  constructor(
    private chatService: ChatService,
    private customerService: CustomerService,
    private accountService: AccountService,
    private cardService: CardService
  ) {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadLiveData();
      setTimeout(() => this.inputField?.nativeElement?.focus(), 100);
    }
  }

  clearChat() {
    this.messages = [];
  }

  /** Fetch live data from the backend to give the AI real context */
  private loadLiveData() {
    this.isLoadingData = true;
    forkJoin({
      customers: this.customerService.getAllCustomers(),
      accounts: this.accountService.getAllAccounts(),
      cards: this.cardService.getAllCards()
    }).subscribe({
      next: (data) => {
        this.customers = data.customers;
        this.accounts = data.accounts;
        this.cards = data.cards;
        this.dataLoaded = true;
        this.isLoadingData = false;
      },
      error: (err) => {
        console.warn('Could not load live data for chat context:', err);
        this.isLoadingData = false;
      }
    });
  }

  /** Build a system prompt that includes live data */
  private buildSystemPrompt(): ChatMessage {
    let content = ChatWidgetComponent.BASE_PROMPT;

    if (this.dataLoaded) {
      content += '\n\nLIVE DATA (current records in the system):';

      // Customers
      content += `\n\nCUSTOMERS (${this.customers.length} total):`;
      if (this.customers.length === 0) {
        content += '\nNo customers found.';
      } else {
        this.customers.forEach(c => {
          content += `\n- ID: ${c.id}, CustomerNo: ${c.customerNo || 'N/A'}, Name: ${c.name || ((c.firstName || '') + ' ' + (c.lastName || '')).trim() || 'N/A'}, Email: ${c.email || 'N/A'}, Phone: ${c.maskedPhoneNumber || 'N/A'}, Nationality: ${c.nationality || 'N/A'}, Gender: ${c.gender || 'N/A'}, Status: ${c.status || 'N/A'}, Address: ${c.homeAddress || 'N/A'}, DOB: ${c.dob || 'N/A'}, ID Number: ${c.maskedIdNumber || 'N/A'}, Employment: ${c.employmentStatus || 'N/A'}, Employer: ${c.employerName || 'N/A'}, Annual Income: ${c.annualIncome || 'N/A'}`;
        });
      }

      // Accounts
      content += `\n\nACCOUNTS (${this.accounts.length} total):`;
      if (this.accounts.length === 0) {
        content += '\nNo accounts found.';
      } else {
        this.accounts.forEach(a => {
          content += `\n- ID: ${a.id}, Account#: ${a.accountNumber || 'N/A'}, Type: ${a.accountType}, Balance: ${a.balance}, Credit Limit: ${a.creditLimit || 'N/A'}, Status: ${a.status || 'N/A'}, Currency: ${a.currency || 'N/A'}, Billing Cycle: ${a.billingCycle || 'N/A'}, Interest Rate: ${a.interestRate || 'N/A'}, Open Date: ${a.openDate || 'N/A'}, Customer: ${a.customer?.name || 'N/A'}`;
        });
      }

      // Cards
      content += `\n\nCARDS (${this.cards.length} total):`;
      if (this.cards.length === 0) {
        content += '\nNo cards found.';
      } else {
        this.cards.forEach(card => {
          content += `\n- ID: ${card.id}, Card#: ${card.cardNumber || 'N/A'}, Type: ${card.cardType}, Brand: ${card.cardBrand || 'N/A'}, Mode: ${card.cardMode || 'N/A'}, Holder: ${card.cardHolderName || 'N/A'}, Credit Limit: ${card.creditLimit || 'N/A'}, Available Limit: ${card.availableLimit || 'N/A'}, Expiry: ${card.expiryDate || 'N/A'}, Status: ${card.status || 'N/A'}, Issued: ${card.issued ?? 'N/A'}, Account#: ${card.account?.accountNumber || 'N/A'}, Customer: ${card.customer?.name || 'N/A'}`;
        });
      }

      content += '\n\nUse the above live data to answer user questions about specific customers, accounts, or cards. If they ask about a specific record, look it up from the data above.';
    }

    return { role: 'system', content };
  }

  sendMessage() {
    const text = this.userInput.trim();
    if (!text || this.isLoading) return;

    // Add user message
    this.messages.push({ role: 'user', content: text });
    this.userInput = '';
    this.isLoading = true;

    // Build full message history (system prompt with live data + conversation)
    const fullMessages: ChatMessage[] = [
      this.buildSystemPrompt(),
      ...this.messages
    ];

    this.chatService.sendMessage(fullMessages).subscribe({
      next: (response) => {
        this.messages.push({ role: 'assistant', content: response.reply });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Chat error:', err);
        this.messages.push({
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        });
        this.isLoading = false;
      }
    });
  }

  formatMessage(text: string): string {
    // Basic markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px;">$1</code>')
      .replace(/\n/g, '<br>');
  }

  private scrollToBottom() {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }
}
