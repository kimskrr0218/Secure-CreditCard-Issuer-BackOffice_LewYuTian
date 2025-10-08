import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Card {
  id?: number;
  cardNumber?: string;
  cardType: string;
  status?: string;
  account: { id: number };
}

@Injectable({
  providedIn: 'root'
})
export class CardService {
  private baseUrl = 'http://localhost:8080/api';
  
  constructor(private http: HttpClient) {}

  // --- DIRECT CARD APIs ---
  getAllCards(): Observable<Card[]> {
    return this.http.get<Card[]>(`${this.baseUrl}/cards`);
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
