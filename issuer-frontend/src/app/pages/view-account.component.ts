import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TopNavbarComponent } from '../components/top-navbar.component';

@Component({
  selector: 'app-view-account',
  standalone: true,
  imports: [CommonModule, TopNavbarComponent],
  templateUrl: './view-account.component.html',
  styleUrls: ['./view-account.component.css']
})
export class ViewAccountComponent implements OnInit {
  account: any = null;
  requestStatus: string | null = null;
  rejectionReason: string | null = null;
  backLabel: string = 'Back to Accounts';
  backPath: string = '/accounts';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const fromPending = this.route.snapshot.queryParamMap.get('from') === 'pending';
    const stateRequest = history.state?.request;

    if (fromPending) {
      this.backLabel = 'Back to Pending Requests';
      this.backPath = '/pending';
    }

    if (stateRequest) {
      if (stateRequest.status === 'REJECTED') {
        this.requestStatus = 'REJECTED';
        this.rejectionReason = stateRequest.rejectionReason || stateRequest.reason || 'No reason provided';
      }
    }

    if (id) {
      if (fromPending) {
        // Fetch from pending endpoint
        this.http.get(`/api/pending`, { withCredentials: true }).subscribe({
          next: (data: any) => {
            const req = data.find((r: any) => r.id === Number(id));
            if (req) {
              let payloadObj: any = {};
              try {
                payloadObj = typeof req.payload === 'string'
                  ? JSON.parse(req.payload)
                  : req.payload;
              } catch (e) {}

              this.requestStatus = req.status;
              this.rejectionReason = req.rejectionReason || req.reason;

              this.account = {
                ...payloadObj,
                accountNumber: payloadObj.accountNumber || 'Pending...',
                status: req.status || 'PENDING',
                isPendingView: true
              };
            }
          },
          error: (err) => console.error('Error fetching pending request', err)
        });
      } else {
        // Existing direct account fetch
        this.http.get(`/api/accounts/${id}`, { withCredentials: true }).subscribe({
          next: (data) => this.account = data,
          error: (err) => {
            console.error('Error fetching account details', err);
            // Fallback if it's a rejected CREATE request (no account exists in DB yet)
            if (stateRequest && stateRequest.operation === 'CREATE') {
              let payloadObj: any = {};
              try {
                payloadObj = typeof stateRequest.payload === 'string'
                  ? JSON.parse(stateRequest.payload)
                  : stateRequest.payload;
              } catch (e) {}

              this.account = {
                ...payloadObj,
                accountNumber: stateRequest.accountNumber || payloadObj.accountNumber || 'N/A',
                status: payloadObj.status || 'PENDING',
                customer: {
                  customerNo: stateRequest.customerNo || 'N/A',
                  name: stateRequest.name || ''
                }
              };
            }
          }
        });
      }
    }
  }

  goBack(): void {
    this.router.navigate([this.backPath]);
  }
}
