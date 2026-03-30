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

  // Fix: `next: () => this.modalMessage = '...'; \n this.showMessageModal = true;,`
  // And `error: (err) => this.modalMessage = '...'; \n this.showMessageModal = true;,`
  // We can just wrap them in { }.
  content = content.replace(/(=>)[ \t]*this\.modalMessage\s*=\s*(.*?);\s*this\.showMessageModal\s*=\s*true;([,}])/g, '$1 { this.modalMessage = $2; this.showMessageModal = true; }$3');

  fs.writeFileSync(tsPath, content);
}
