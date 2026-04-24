import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TopNavbarComponent } from '../components/top-navbar.component';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, TopNavbarComponent],
  template: `
    <app-top-navbar></app-top-navbar>
    <div class="page-container">
      <div class="page-header">
        <h2>Report Generation</h2>
      </div>

      <div class="main-section">
        <!-- ─── FILTER FORM ─── -->
        <div class="report-form">
          <div class="form-grid">
            <div class="form-group">
              <label>Report Type</label>
              <select [(ngModel)]="reportType" (ngModelChange)="resetPreview()">
                <option value="customers">Customer Report</option>
                <option value="accounts">Account Report</option>
                <option value="cards">Card Report</option>
              </select>
            </div>

            <div class="form-group">
              <label>From Date</label>
              <input type="date" [(ngModel)]="fromDate" />
            </div>

            <div class="form-group">
              <label>Status Filter</label>
              <select [(ngModel)]="status">
                <option value="">All</option>
                <ng-container *ngIf="reportType === 'customers'">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </ng-container>
                <ng-container *ngIf="reportType === 'accounts'">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="CLOSED">Closed</option>
                  <option value="SUSPENDED">Suspended</option>
                </ng-container>
                <ng-container *ngIf="reportType === 'cards'">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="EXPIRED">Expired</option>
                </ng-container>
              </select>
            </div>

            <div class="form-group">
              <label>To Date</label>
              <input type="date" [(ngModel)]="toDate" />
            </div>
          </div>

          <div class="actions">
            <button class="btn-primary" (click)="previewReport()" [disabled]="loading">
              <span *ngIf="!loading">🔍 Preview Report</span>
              <span *ngIf="loading">Loading...</span>
            </button>
          </div>

          <div *ngIf="error" class="error-msg">{{ error }}</div>
        </div>

        <!-- ─── PREVIEW TABLE ─── -->
        <div *ngIf="previewData" class="preview-section">
          <div class="preview-header">
            <div>
              <h3 class="preview-title">{{ previewData.title }}</h3>
              <span class="record-count">{{ previewData.totalRecords }} record(s) found</span>
              <span class="filter-info" *ngIf="status || fromDate || toDate">
                — Filters:
                <span *ngIf="status"> Status = {{ status }}</span>
                <span *ngIf="fromDate"> From {{ fromDate }}</span>
                <span *ngIf="toDate"> To {{ toDate }}</span>
              </span>
            </div>
            <button class="btn-download" (click)="downloadPdf()" [disabled]="downloading">
              <span *ngIf="!downloading">📄 Download PDF</span>
              <span *ngIf="downloading">Generating...</span>
            </button>
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th *ngFor="let h of previewData.headers">{{ h }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of previewData.rows">
                  <td *ngFor="let cell of row">{{ cell }}</td>
                </tr>
                <tr *ngIf="previewData.rows.length === 0">
                  <td [attr.colspan]="previewData.headers.length" class="no-data">No records found.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 30px;
      font-family: "Segoe UI", sans-serif;
      background-color: #f8fafc;
      min-height: 100vh;
      color: #1e293b;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .page-header h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }
    .main-section {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.07);
      padding: 32px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
      max-width: 720px;
      margin-left: auto;
      margin-right: auto;
    }
    .form-group label {
      display: block;
      font-weight: 600;
      margin-bottom: 6px;
      color: #334155;
      font-size: 0.9rem;
    }
    .form-group select,
    .form-group input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.95rem;
      background: #f8fafc;
      transition: border-color 0.2s;
    }
    .form-group select:focus,
    .form-group input:focus {
      outline: none;
      border-color: #6366f1;
    }
    .actions { text-align: center; }
    .btn-primary {
      background: #6366f1;
      color: #fff;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-primary:hover:not(:disabled) { background: #4f46e5; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .error-msg {
      color: #dc2626;
      margin-top: 16px;
      text-align: center;
      font-weight: 500;
    }

    /* ─── Preview Section ─── */
    .preview-section {
      margin-top: 32px;
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
    }
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .preview-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px 0;
    }
    .record-count {
      font-size: 0.85rem;
      color: #64748b;
    }
    .filter-info {
      font-size: 0.85rem;
      color: #64748b;
    }
    .btn-download {
      background: #16a34a;
      color: #fff;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      white-space: nowrap;
    }
    .btn-download:hover:not(:disabled) { background: #15803d; }
    .btn-download:disabled { opacity: 0.6; cursor: not-allowed; }

    /* ─── Table ─── */
    .table-wrapper {
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }
    thead tr {
      background: #1e293b;
      color: #fff;
    }
    th {
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      white-space: nowrap;
    }
    td {
      padding: 9px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover { background: #eef2ff; }
    .no-data {
      text-align: center;
      padding: 24px;
      color: #94a3b8;
      font-style: italic;
    }
  `]
})
export class ReportsComponent {
  reportType = 'customers';
  status = '';
  fromDate = '';
  toDate = '';
  loading = false;
  downloading = false;
  error = '';

  previewData: { title: string; headers: string[]; rows: string[][]; totalRecords: number } | null = null;

  constructor(private http: HttpClient) {}

  resetPreview() {
    this.previewData = null;
    this.error = '';
  }

  previewReport() {
    this.loading = true;
    this.error = '';
    this.previewData = null;

    const params = this.buildParams();

    this.http.get<any>(`/api/reports/preview/${this.reportType}`, {
      params,
      withCredentials: true
    }).subscribe({
      next: (data) => {
        this.previewData = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load report preview. Please try again.';
        this.loading = false;
      }
    });
  }

  downloadPdf() {
    this.downloading = true;

    const params = this.buildParams();

    this.http.get(`/api/reports/${this.reportType}`, {
      params,
      responseType: 'blob',
      withCredentials: true
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const typeLabel = this.reportType.charAt(0).toUpperCase() + this.reportType.slice(1);
        a.download = `${typeLabel}_Report.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.downloading = false;
      },
      error: () => {
        this.error = 'Failed to download PDF. Please try again.';
        this.downloading = false;
      }
    });
  }

  private buildParams(): HttpParams {
    let params = new HttpParams();
    if (this.status) params = params.set('status', this.status);
    if (this.fromDate) params = params.set('fromDate', this.fromDate);
    if (this.toDate) params = params.set('toDate', this.toDate);
    return params;
  }
}