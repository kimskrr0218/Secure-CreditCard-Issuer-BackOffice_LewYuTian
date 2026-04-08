import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TopNavbarComponent } from '../components/top-navbar.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, TopNavbarComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  private baseUrl = 'http://localhost:8080/api/profile';

  // Profile data
  profile: any = null;
  loading = true;

  // Email form
  newEmail = '';
  emailMessage = '';
  emailError = false;

  // Password form
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordMessage = '';
  passwordError = false;

  // 2FA
  twoFactorEnabled = false;
  tfaMessage = '';
  tfaError = false;

  // 2FA Setup flow
  tfaSetupMode = false;     // showing QR code
  tfaQrUrl = '';            // otpauth:// URL for QR
  tfaSecret = '';           // Base32 secret to display
  tfaVerifyCode = '';       // 6-digit verification code
  tfaSetupLoading = false;

  // 2FA Disable flow
  tfaDisableMode = false;
  tfaDisableCode = '';

  // OTP digit boxes
  otpDigits: string[] = ['', '', '', '', '', ''];
  disableOtpDigits: string[] = ['', '', '', '', '', ''];

  // Modal
  showModal = false;
  modalTitle = '';
  modalMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.http.get(this.baseUrl, { withCredentials: true }).subscribe({
      next: (data: any) => {
        this.profile = data;
        this.newEmail = data.email || '';
        this.twoFactorEnabled = data.twoFactorEnabled || false;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load profile', err);
        this.loading = false;
      }
    });
  }

  // ─── SAVE PROFILE (Email + Password) ──────────────────────
  saveProfile(): void {
    this.emailMessage = '';
    this.emailError = false;
    this.passwordMessage = '';
    this.passwordError = false;

    const emailChanged = this.newEmail.trim() !== (this.profile.email || '').trim();
    const passwordFilled = this.oldPassword || this.newPassword || this.confirmPassword;

    if (!emailChanged && !passwordFilled) {
      this.emailMessage = 'No changes to save';
      this.emailError = true;
      return;
    }

    // Validate password fields if any are filled
    if (passwordFilled) {
      if (!this.oldPassword) {
        this.passwordMessage = 'Current password is required';
        this.passwordError = true;
        return;
      }
      if (!this.newPassword || this.newPassword.length < 6) {
        this.passwordMessage = 'New password must be at least 6 characters';
        this.passwordError = true;
        return;
      }
      if (this.newPassword !== this.confirmPassword) {
        this.passwordMessage = 'Passwords do not match';
        this.passwordError = true;
        return;
      }
    }

    // Validate email
    if (emailChanged && (!this.newEmail || !this.newEmail.trim())) {
      this.emailMessage = 'Email cannot be empty';
      this.emailError = true;
      return;
    }

    let pending = 0;
    let done = 0;
    const results: string[] = [];

    const checkDone = () => {
      done++;
      if (done === pending) {
        if (!this.emailError && !this.passwordError) {
          this.showModalMessage('Success', results.join('\n'));
        }
      }
    };

    if (emailChanged) pending++;
    if (passwordFilled) pending++;

    if (emailChanged) {
      this.http.put(`${this.baseUrl}/email`, { email: this.newEmail.trim() }, { withCredentials: true }).subscribe({
        next: (res: any) => {
          this.profile.email = this.newEmail.trim();
          results.push(res.message || 'Email updated successfully');
          checkDone();
        },
        error: (err) => {
          this.emailMessage = err.error?.message || 'Failed to update email';
          this.emailError = true;
          checkDone();
        }
      });
    }

    if (passwordFilled) {
      this.http.put(`${this.baseUrl}/password`, {
        oldPassword: this.oldPassword,
        newPassword: this.newPassword
      }, { withCredentials: true }).subscribe({
        next: (res: any) => {
          this.oldPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          results.push(res.message || 'Password changed successfully');
          checkDone();
        },
        error: (err) => {
          this.passwordMessage = err.error?.message || 'Failed to change password';
          this.passwordError = true;
          checkDone();
        }
      });
    }
  }

  // ─── UPDATE EMAIL ─────────────────────────────────────────
  updateEmail(): void {
    this.emailMessage = '';
    this.emailError = false;

    if (!this.newEmail || !this.newEmail.trim()) {
      this.emailMessage = 'Email cannot be empty';
      this.emailError = true;
      return;
    }

    this.http.put(`${this.baseUrl}/email`, { email: this.newEmail.trim() }, { withCredentials: true }).subscribe({
      next: (res: any) => {
        this.emailMessage = res.message || 'Email updated successfully';
        this.emailError = false;
        this.profile.email = this.newEmail.trim();
        this.showModalMessage('Success', this.emailMessage);
      },
      error: (err) => {
        this.emailMessage = err.error?.message || 'Failed to update email';
        this.emailError = true;
      }
    });
  }

  // ─── CHANGE PASSWORD ──────────────────────────────────────
  changePassword(): void {
    this.passwordMessage = '';
    this.passwordError = false;

    if (!this.oldPassword) {
      this.passwordMessage = 'Current password is required';
      this.passwordError = true;
      return;
    }
    if (!this.newPassword || this.newPassword.length < 6) {
      this.passwordMessage = 'New password must be at least 6 characters';
      this.passwordError = true;
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordMessage = 'Passwords do not match';
      this.passwordError = true;
      return;
    }

    this.http.put(`${this.baseUrl}/password`, {
      oldPassword: this.oldPassword,
      newPassword: this.newPassword
    }, { withCredentials: true }).subscribe({
      next: (res: any) => {
        this.passwordMessage = res.message || 'Password changed successfully';
        this.passwordError = false;
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.showModalMessage('Success', this.passwordMessage);
      },
      error: (err) => {
        this.passwordMessage = err.error?.message || 'Failed to change password';
        this.passwordError = true;
      }
    });
  }

  // ─── INITIATE 2FA SETUP ────────────────────────────────────
  startSetup2FA(): void {
    this.tfaMessage = '';
    this.tfaError = false;
    this.tfaSetupLoading = true;

    this.http.post(`${this.baseUrl}/2fa/setup`, {}, { withCredentials: true }).subscribe({
      next: (res: any) => {
        this.tfaSetupLoading = false;
        this.tfaSetupMode = true;
        this.tfaSecret = res.secret;
        this.tfaQrUrl = res.qrUrl;
        this.tfaVerifyCode = '';
        this.otpDigits = ['', '', '', '', '', ''];
      },
      error: (err) => {
        this.tfaSetupLoading = false;
        this.tfaMessage = err.error?.message || 'Failed to initiate 2FA setup';
        this.tfaError = true;
      }
    });
  }

  // ─── VERIFY 2FA SETUP CODE ───────────────────────────────
  confirmSetup2FA(): void {
    this.tfaMessage = '';
    this.tfaError = false;

    if (!this.tfaVerifyCode || this.tfaVerifyCode.length !== 6) {
      this.tfaMessage = 'Please enter a valid 6-digit code';
      this.tfaError = true;
      return;
    }

    this.http.post(`${this.baseUrl}/2fa/verify`, { code: this.tfaVerifyCode }, { withCredentials: true }).subscribe({
      next: (res: any) => {
        this.twoFactorEnabled = true;
        this.tfaSetupMode = false;
        this.tfaSecret = '';
        this.tfaQrUrl = '';
        this.tfaVerifyCode = '';
        this.otpDigits = ['', '', '', '', '', ''];
        this.tfaMessage = res.message || '2FA enabled successfully!';
        this.tfaError = false;
        this.showModalMessage('Success', this.tfaMessage);
      },
      error: (err) => {
        this.tfaMessage = err.error?.message || 'Invalid verification code';
        this.tfaError = true;
      }
    });
  }

  cancelSetup2FA(): void {
    this.tfaSetupMode = false;
    this.tfaSecret = '';
    this.tfaQrUrl = '';
    this.tfaVerifyCode = '';
    this.otpDigits = ['', '', '', '', '', ''];
    this.tfaMessage = '';
  }

  // ─── DISABLE 2FA ──────────────────────────────────────────
  startDisable2FA(): void {
    this.tfaDisableMode = true;
    this.tfaDisableCode = '';
    this.tfaMessage = '';
    this.tfaError = false;
  }

  confirmDisable2FA(): void {
    this.tfaMessage = '';
    this.tfaError = false;

    if (!this.tfaDisableCode || this.tfaDisableCode.length !== 6) {
      this.tfaMessage = 'Please enter a valid 6-digit code';
      this.tfaError = true;
      return;
    }

    this.http.post(`${this.baseUrl}/2fa/disable`, { code: this.tfaDisableCode }, { withCredentials: true }).subscribe({
      next: (res: any) => {
        this.twoFactorEnabled = false;
        this.tfaDisableMode = false;
        this.tfaDisableCode = '';
        this.disableOtpDigits = ['', '', '', '', '', ''];
        this.tfaMessage = res.message || '2FA disabled';
        this.tfaError = false;
        this.showModalMessage('Success', this.tfaMessage);
      },
      error: (err) => {
        this.tfaMessage = err.error?.message || 'Invalid code. 2FA not disabled.';
        this.tfaError = true;
      }
    });
  }

  cancelDisable2FA(): void {
    this.tfaDisableMode = false;
    this.tfaDisableCode = '';
    this.disableOtpDigits = ['', '', '', '', '', ''];
    this.tfaMessage = '';
  }

  // ─── OTP DIGIT BOX HANDLERS ───────────────────────────────
  onOtpInput(event: Event, index: number, mode: 'setup' | 'disable'): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^0-9]/g, '');
    input.value = value;

    const digits = mode === 'setup' ? this.otpDigits : this.disableOtpDigits;
    digits[index] = value;

    if (mode === 'setup') {
      this.tfaVerifyCode = digits.join('');
    } else {
      this.tfaDisableCode = digits.join('');
    }

    // Auto-advance to next box
    if (value && index < 5) {
      const nextInput = (input.parentElement as HTMLElement).querySelectorAll('.otp-box')[index + 1] as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }

    // Auto-submit when all 6 filled
    const code = digits.join('');
    if (code.length === 6) {
      if (mode === 'setup') {
        this.confirmSetup2FA();
      } else {
        this.confirmDisable2FA();
      }
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number, mode: 'setup' | 'disable'): void {
    const input = event.target as HTMLInputElement;
    const digits = mode === 'setup' ? this.otpDigits : this.disableOtpDigits;

    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prevInput = (input.parentElement as HTMLElement).querySelectorAll('.otp-box')[index - 1] as HTMLInputElement;
      if (prevInput) {
        digits[index - 1] = '';
        prevInput.value = '';
        prevInput.focus();
        if (mode === 'setup') {
          this.tfaVerifyCode = digits.join('');
        } else {
          this.tfaDisableCode = digits.join('');
        }
      }
    }
  }

  onOtpPaste(event: ClipboardEvent, mode: 'setup' | 'disable'): void {
    event.preventDefault();
    const paste = (event.clipboardData?.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
    const digits = mode === 'setup' ? this.otpDigits : this.disableOtpDigits;
    const boxes = ((event.target as HTMLInputElement).parentElement as HTMLElement).querySelectorAll('.otp-box');

    for (let i = 0; i < 6; i++) {
      digits[i] = paste[i] || '';
      if (boxes[i]) (boxes[i] as HTMLInputElement).value = digits[i];
    }

    if (mode === 'setup') {
      this.tfaVerifyCode = digits.join('');
    } else {
      this.tfaDisableCode = digits.join('');
    }

    // Focus last filled box
    const focusIdx = Math.min(paste.length, 5);
    if (boxes[focusIdx]) (boxes[focusIdx] as HTMLInputElement).focus();

    if (paste.length === 6) {
      if (mode === 'setup') this.confirmSetup2FA();
      else this.confirmDisable2FA();
    }
  }

  // ─── HELPER: get QR code image URL via public API ─────────
  getQrImageUrl(): string {
    // Use QR Server API (free, no key needed) to render the QR code
    return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(this.tfaQrUrl);
  }

  // ─── MODAL ────────────────────────────────────────────────
  showModalMessage(title: string, message: string): void {
    this.modalTitle = title;
    this.modalMessage = message;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
