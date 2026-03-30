const fs = require('fs');
const path = require('path');

const files = [
  'pages/accounts.component.ts',
  'pages/cards.component.ts',
  'pages/customers.component.ts',
  'pages/login.component.ts',
  'pages/pending.component.ts',
  'pages/roles.component.ts'
];

const basePath = 'c:/LewYuTianFYPCode/Secure-CreditCard-Issuer-BackOffice_LewYuTian/issuer-frontend/src/app';

for (const file of files) {
  const tsPath = path.join(basePath, file);
  let content = fs.readFileSync(tsPath, 'utf8');

  // Replace alert('...') with this.modalMessage = '...'; this.showMessageModal = true;
  content = content.replace(/alert\((.*)\);?/g, 'this.modalMessage = $1;\n          this.showMessageModal = true;');

  // Now, class injection for fields
  if (!content.includes('showMessageModal = false')) {
    content = content.replace(/export class \w+ (implements OnInit )?\{/, `$&
  showMessageModal = false;
  modalMessage = "";

  closeMessage() {
    this.showMessageModal = false;
  }
`);
  }

  fs.writeFileSync(tsPath, content);
  
  const htmlPath = tsPath.replace('.ts', '.html');
  if (fs.existsSync(htmlPath)) {
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    if (!htmlContent.includes('showMessageModal')) {
      const modalHtml = `
<!-- ================= MESSAGE MODAL ================= -->
<div *ngIf="showMessageModal" class="modal-overlay">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Message</h3>
      <button class="close-btn" (click)="closeMessage()"></button>
    </div>
    <p>{{ modalMessage }}</p>
    <div class="modal-actions">
      <button class="submit-btn" (click)="closeMessage()">OK</button>
    </div>
  </div>
</div>
`;
      fs.writeFileSync(htmlPath, htmlContent + '\n' + modalHtml);
    }
  }
}
