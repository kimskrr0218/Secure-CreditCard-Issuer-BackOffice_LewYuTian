import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TopNavbarComponent } from '../components/top-navbar.component';

@Component({
  selector: 'app-view-card',
  standalone: true,
  imports: [CommonModule, TopNavbarComponent],
  templateUrl: './view-card.component.html',
  styleUrls: ['./view-card.component.css']
})
export class ViewCardComponent implements OnInit {
  card: any = null;
  requestStatus: string | null = null;
  rejectionReason: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private location: Location
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const fromPending = this.route.snapshot.queryParamMap.get('from') === 'pending';
    const stateRequest = history.state?.request;

    if (stateRequest) {
      if (stateRequest.status === 'REJECTED') {
        this.requestStatus = 'REJECTED';
        this.rejectionReason = stateRequest.rejectionReason || stateRequest.reason || 'No reason provided';
      }
    }

    if (id) {
      if (fromPending) {
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

              this.card = {
                ...payloadObj,
                cardNumber: 'Pending...',
                status: req.status || 'PENDING',
                customerName: payloadObj.customerName || req.customerNo || 'N/A'
              };
            }
          },
          error: (err) => console.error('Error fetching pending request', err)
        });
      } else {
        this.http.get(`/api/cards/${id}`, { withCredentials: true }).subscribe({
          next: (data) => this.card = data,
          error: (err) => {
            console.error('Error fetching card details', err);
            if (stateRequest && stateRequest.operation === 'CREATE') {
              let payloadObj: any = {};
              try {
                payloadObj = typeof stateRequest.payload === 'string'
                  ? JSON.parse(stateRequest.payload)
                  : stateRequest.payload;
              } catch (e) {}

              this.card = {
                ...payloadObj,
                cardNumber: stateRequest.cardNumber || payloadObj.cardNumber || 'N/A',
                status: payloadObj.status || 'PENDING',
                customerName: stateRequest.customerName || 'N/A'
              };
            }
          }
        });
      }
    }
  }

  goBack(): void {
    this.location.back();
  }

  maskCardNumber(number: string): string {
    if (!number || number.length < 16 || number === 'Pending...') return number;
    return number.substring(0, 4) + ' **** **** ' + number.substring(number.length - 4);
  }
}
