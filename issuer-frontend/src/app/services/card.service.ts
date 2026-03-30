import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Card {
  id?: number;
  cardNumber?: string;
  cardType: string;
  cardHolderName?: string;
  creditLimit?: number;
  availableLimit?: number;
  expiryDate?: string;
  cvv?: string;
  status?: string;
  account: { id: number };
}

@Injectable({
  providedIn: 'root'
})
export class CardService {
  private baseUrl = '/api';
  
  constructor(private http: HttpClient) {}

  // --- DIRECT CARD APIs ---
  getAllCards(): Observable<Card[]> {
    return this.http.get<Card[]>(`${this.baseUrl}/cards`);
  }

  getCardById(id: number): Observable<Card> {
    return this.http.get<Card>(`${this.baseUrl}/cards/${id}`);
  }

  // --- Maker action: Submit CREATE request ---
  create(accountId: number, cardType: string): Observable<any> {
    const payload = {
      entityType: 'CARD',
      operation: 'CREATE',
      payload: JSON.stringify({
        account: { id: accountId },
        cardType: cardType
      }),
      createdBy: 'staff'
    };
    return this.http.post(`${this.baseUrl}/pending`, payload);
  }

  // --- Maker action: Submit UPDATE request ---
  update(id: number, cardType: string, status: string): Observable<any> {
    const payload = {
      entityType: 'CARD',
      operation: 'UPDATE',
      payload: JSON.stringify({
        id: id,
        cardType: cardType,
        status: status
      }),
      createdBy: 'staff'
    };
    return this.http.post(`${this.baseUrl}/pending`, payload);
  }

  // --- Maker action: Submit BLOCK request ---
  block(id: number): Observable<any> {
    const payload = {
      entityType: 'CARD',
      operation: 'BLOCK',
      payload: JSON.stringify({ id })
    };
    return this.http.post(`${this.baseUrl}/pending`, payload, { withCredentials: true });
  }

  // --- Maker action: Submit UNBLOCK request ---
  unblock(id: number): Observable<any> {
    const payload = {
      entityType: 'CARD',
      operation: 'UNBLOCK',
      payload: JSON.stringify({ id })
    };
    return this.http.post(`${this.baseUrl}/pending`, payload, { withCredentials: true });
  }

  // --- Maker action: Submit ACTIVATE request ---
  activate(id: number): Observable<any> {
    const payload = {
      entityType: 'CARD',
      operation: 'ACTIVATE',
      payload: JSON.stringify({ id })
    };
    return this.http.post(`${this.baseUrl}/pending`, payload, { withCredentials: true });
  }

  // --- Maker action: Submit DEACTIVATE request ---
  deactivate(id: number): Observable<any> {
    const payload = {
      entityType: 'CARD',
      operation: 'DEACTIVATE',
      payload: JSON.stringify({ id })
    };
    return this.http.post(`${this.baseUrl}/pending`, payload, { withCredentials: true });
  }

  // --- Maker action: Submit DELETE request ---
  delete(id: number): Observable<any> {
    const payload = {
      entityType: 'CARD',
      operation: 'DELETE',
      payload: JSON.stringify({ id }),
      createdBy: 'staff'
    };
    return this.http.post(`${this.baseUrl}/pending`, payload);
  }
}
