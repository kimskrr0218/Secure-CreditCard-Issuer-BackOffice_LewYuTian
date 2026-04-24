import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Customer {
  id?: number;
  customerNo?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  nationality?: string;
  employmentStatus?: string;
  companyName?: string;
  dob?: string;
  idNumber?: string;
  phoneNumber?: string;
  maskedIdNumber?: string;
  maskedPhoneNumber?: string;
  homeAddress?: string;
  annualIncome?: any;
  maskedAnnualIncome?: string;
  employerName?: string;
  email: string;
  status?: string;
}

export interface PendingRequest {
  id?: number;
  entityType: string;   // "CUSTOMER"
  operation: string;    // "CREATE", "UPDATE", "DELETE"
  payload: string;      
  status?: string;      // "PENDING", "APPROVED", "REJECTED"
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private customerUrl = '/api/customers';
  private pendingUrl = '/api/pending';

  constructor(private http: HttpClient) {}

  // Approved customers (for staff view)
  getAllCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.customerUrl);
  }

  // Staff → submit pending requests
  createPending(customer: Customer): Observable<PendingRequest> {
    return this.http.post<PendingRequest>(this.pendingUrl, {
      entityType: 'CUSTOMER',
      operation: 'CREATE',
      payload: JSON.stringify(customer)
    });
  }

  updatePending(id: number, customer: Customer): Observable<PendingRequest> {
    return this.http.post<PendingRequest>(this.pendingUrl, {
      entityType: 'CUSTOMER',
      operation: 'UPDATE',
      payload: JSON.stringify({ ...customer, id })
    });
  }

  deletePending(id: number): Observable<PendingRequest> {
    return this.http.post<PendingRequest>(this.pendingUrl, {
      entityType: 'CUSTOMER',
      operation: 'DELETE',
      payload: JSON.stringify({ id })
    });
  }
}

