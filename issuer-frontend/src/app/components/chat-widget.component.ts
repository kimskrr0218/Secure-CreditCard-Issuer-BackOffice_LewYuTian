import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ChatService, ChatMessage } from '../services/chat.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Floating chat button -->
    <button class="chat-fab" (click)="toggleChat()" [class.hidden]="isOpen">
      <span class="chat-icon">💬</span>
    </button>

    <!-- Chat window -->
    <div class="chat-window" *ngIf="isOpen">
      <div class="chat-header">
        <span>AI Assistant</span>
        <button class="close-btn" (click)="toggleChat()">✕</button>
      </div>

      <div class="chat-body" #chatBody>
        <div *ngFor="let msg of messages" class="chat-msg" [ngClass]="msg.role">
          <div class="msg-bubble">{{ msg.content }}</div>
        </div>
        <div *ngIf="loading" class="chat-msg assistant">
          <div class="msg-bubble typing">Thinking...</div>
        </div>
      </div>

      <div class="chat-footer">
        <input
          type="text"
          [(ngModel)]="userInput"
          (keydown.enter)="send()"
          placeholder="Type a message..."
          [disabled]="loading"
        />
        <button (click)="send()" [disabled]="loading || !userInput.trim()">Send</button>
      </div>
    </div>
  `,
  styles: [`
    .chat-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #1F4E79;
      color: #fff;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    .chat-fab:hover { transform: scale(1.1); }
    .chat-fab.hidden { display: none; }
    .chat-icon { font-size: 24px; }

    .chat-window {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 380px;
      height: 500px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.25);
      display: flex;
      flex-direction: column;
      z-index: 10000;
      overflow: hidden;
    }

    .chat-header {
      background: #1F4E79;
      color: #fff;
      padding: 14px 16px;
      font-weight: 600;
      font-size: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .close-btn {
      background: none;
      border: none;
      color: #fff;
      font-size: 18px;
      cursor: pointer;
    }

    .chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #f5f7fa;
    }

    .chat-msg { display: flex; }
    .chat-msg.user { justify-content: flex-end; }
    .chat-msg.assistant { justify-content: flex-start; }

    .msg-bubble {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
      white-space: pre-wrap;
    }
    .user .msg-bubble {
      background: #1F4E79;
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .assistant .msg-bubble {
      background: #e8ecf1;
      color: #222;
      border-bottom-left-radius: 4px;
    }
    .typing { font-style: italic; color: #888; }

    .chat-footer {
      display: flex;
      padding: 10px;
      border-top: 1px solid #e0e0e0;
      gap: 8px;
      background: #fff;
    }
    .chat-footer input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #ccc;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
    }
    .chat-footer input:focus { border-color: #1F4E79; }
    .chat-footer button {
      padding: 10px 16px;
      background: #1F4E79;
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    }
    .chat-footer button:disabled {
      background: #aaa;
      cursor: not-allowed;
    }
  `]
})
export class ChatWidgetComponent implements OnInit {
  isOpen = false;
  userInput = '';
  loading = false;
  messages: ChatMessage[] = [];
  private systemPrompt = '';

  constructor(private chatService: ChatService, private http: HttpClient) {}

  ngOnInit(): void {
    this.buildSystemPrompt();
  }

  private buildSystemPrompt(): void {
    const base = `You are an AI assistant for the Secure Credit Card Issuer Back-Office System. You help Staff and Manager users with their daily tasks. Answer ONLY based on this system's features and the live data provided below. Do not give generic advice.

SYSTEM FEATURES:
- Customer Management: Create, update, view, activate, deactivate, delete customers. Navigate to Customers page.
- Account Management: Create, update, view, close accounts. Each account belongs to a customer. Navigate to Accounts page.
- Card Management: Create, issue, activate, block, replace cards. Each card belongs to an account. Navigate to Cards page.
- Maker-Checker Workflow: Staff (Maker) submits requests, Manager (Checker) approves/rejects them from the Tasks page.
- Report Generation: Generate PDF reports for customers, accounts, and cards with filters. Navigate to Reports page.
- Dashboard: View system overview with quick actions.
- User Profile: Update profile, change password with OTP verification.

HOW TO CREATE A CUSTOMER:
1. Navigate to Customers page from the navbar
2. Click the "+ Customer" button
3. Fill in all required fields: First Name, Last Name, Gender, Nationality, Date of Birth, ID Number, Email, Phone Number, Home Address, Employment Status, Gross Annual Income
4. Click Submit — this creates a PENDING request
5. A Manager must approve it from the Tasks page

HOW TO CREATE AN ACCOUNT:
1. Navigate to Accounts page from the navbar
2. Click the "+ Account" button
3. Select a customer, set currency, initial balance, credit limit, billing cycle, interest rate
4. Click Submit — this creates a PENDING request requiring Manager approval

HOW TO CREATE A CARD:
1. Navigate to Cards page from the navbar
2. Click the "+ Card" button
3. Select a customer and account, choose card type, brand, and mode
4. Click Submit — this creates a PENDING request requiring Manager approval

LIVE DATA:\n`;

    // Fetch all live data in parallel and wait for ALL to complete
    forkJoin({
      customers: this.http.get<any[]>('/api/customers', { withCredentials: true }),
      accounts: this.http.get<any[]>('/api/accounts', { withCredentials: true }),
      cards: this.http.get<any[]>('/api/cards', { withCredentials: true })
    }).subscribe({
      next: ({ customers, accounts, cards }) => {
        let data = '';

        data += `\nCUSTOMERS (${customers.length} total):\n`;
        customers.slice(0, 20).forEach(c => {
          data += `- ${c.customerNo || 'N/A'}: ${c.name || 'N/A'}, Email: ${c.email || 'N/A'}, Phone: ${c.maskedPhoneNumber || 'N/A'}, Status: ${c.status || 'N/A'}\n`;
        });

        data += `\nACCOUNTS (${accounts.length} total):\n`;
        accounts.slice(0, 20).forEach(a => {
          data += `- ${a.accountNumber || 'N/A'}: Type: ${a.accountType || 'N/A'}, Status: ${a.status || 'N/A'}, Currency: ${a.currency || 'N/A'}, Customer: ${a.customer?.name || 'N/A'}\n`;
        });

        data += `\nCARDS (${cards.length} total):\n`;
        cards.slice(0, 20).forEach(card => {
          data += `- ${card.cardNumber || 'N/A'}: Type: ${card.cardType || 'N/A'}, Brand: ${card.cardBrand || 'N/A'}, Status: ${card.status || 'N/A'}, Holder: ${card.cardHolderName || 'N/A'}\n`;
        });

        this.systemPrompt = base + data;
      },
      error: () => {
        this.systemPrompt = base + '\n(Live data could not be loaded.)\n';
      }
    });
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  send(): void {
    const text = this.userInput.trim();
    if (!text || this.loading) return;

    this.messages.push({ role: 'user', content: text });
    this.userInput = '';
    this.loading = true;

    const payload: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      ...this.messages.map(m => ({ role: m.role, content: m.content }))
    ];

    this.chatService.sendMessage(payload).subscribe({
      next: (res) => {
        this.messages.push({ role: 'assistant', content: res.reply });
        this.loading = false;
      },
      error: () => {
        this.messages.push({ role: 'assistant', content: 'Sorry, something went wrong. Please try again.' });
        this.loading = false;
      }
    });
  }
}
