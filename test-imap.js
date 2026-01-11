const Imap = require('imap');

const email = process.argv[2];
const password = process.argv[3];

console.log(`Probando conexión para: ${email}`);

const imap = new Imap({
  user: email,
  password: password,
  host: 'imappro.zoho.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
  connTimeout: 15000,
  authTimeout: 15000,
});

imap.once('ready', () => {
  console.log('✅ CONEXIÓN EXITOSA');
  imap.end();
});

imap.once('error', (err) => {
  console.log('❌ ERROR:', err.message);
  if (err.textCode) console.log('Código:', err.textCode);
});

imap.connect();
