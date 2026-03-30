import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Customer } from './customer.service';

export interface Account {
  id?: number;
  accountNumber?: string; // generated after approval
  accountType: string;
  balance: number;
  status?: string;
  customer: Customer;
}

export interface PendingRequest {
  id?: number;
  entityType: string;
  operation: string;
  payload: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private accountsUrl = '/api/accounts';
  private pendingUrl = '/api/pending';

  constructor(private http: HttpClient) {}

  // Load APPROVED accounts
  getAllAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(this.accountsUrl);
  }

  // Staff → Create Pending request
  create(account: Account): Observable<PendingRequest> {
    const request: PendingRequest = {
      entityType: 'ACCOUNT',
      operation: 'CREATE',
      payload: JSON.stringify(account)
    };
    return this.http.post<PendingRequest>(this.pendingUrl, request);
  }

  // Staff → Update Pending request
  update(id: number, account: Account): Observable<PendingRequest> {
    const request: PendingRequest = {
      entityType: 'ACCOUNT',
      operation: 'UPDATE',
      payload: JSON.stringify({ ...account, id })
    };
    return this.http.post<PendingRequest>(this.pendingUrl, request);
  }

  // Staff → Delete Pending request
  delete(id: number): Observable<PendingRequest> {
    const request: PendingRequest = {
      entityType: 'ACCOUNT',
      operation: 'DELETE',
      payload: JSON.stringify({ id })
    };
    return this.http.post<PendingRequest>(this.pendingUrl, request);
  }
}
