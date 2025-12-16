# QR WebSocket Server

Server WebSocket untuk mengirim QR string ke kasir secara real-time.

## Instalasi

```bash
npm install
```

## Konfigurasi

### Allowed Kasir IDs
Edit file `server.js` untuk mengatur daftar kasir yang diizinkan terhubung:

```javascript
const ALLOWED_KASIR_IDS = [
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    // Tambahkan kasir ID lainnya sesuai kebutuhan
];
```

### Connection PIN (Terenkripsi)
PIN koneksi disimpan dalam bentuk **SHA256 hash** untuk keamanan. Edit file `server.js`:

```javascript
// PIN for connection authentication (SHA256 hash of '123654')
const CONNECTION_PIN_HASH = '6460662e217c7a9f899208dd70a2c28abdea42f128666a9b78e6c0c064846493';
```

**Untuk mengubah PIN**, generate hash baru dengan command:
```bash
node -e "const crypto = require('crypto'); console.log(crypto.createHash('sha256').update('PIN_BARU_ANDA').digest('hex'));"
```

> **Note**: Client tetap mengirim PIN dalam bentuk plain text. Server akan hash PIN tersebut dan membandingkannya dengan hash yang tersimpan.

## Menjalankan Server

```bash
# Production
npm start

# Development (dengan auto-reload)
npm run dev
```

Server akan berjalan di:
- **HTTP API**: `http://localhost:3001`
- **WebSocket**: `ws://localhost:3001`

## API Endpoints

### 1. Send QR to Kasir
Mengirim QR string ke kasir tertentu.

```http
POST /send-qr
Content-Type: application/json

{
    "kasir_id": "3",
    "qr_string": "https://payment.example.com/pay/12345",
    "text": "Scan untuk membayar Rp 50.000"
}
```

**Response Success:**
```json
{
    "success": true,
    "message": "QR string sent to Kasir 3",
    "kasir_id": "3",
    "qr_string": "https://payment.example.com/pay/12345",
    "text": "Scan untuk membayar Rp 50.000"
}
```

**Response Error (Kasir tidak terhubung):**
```json
{
    "success": false,
    "error": "Kasir 3 is not connected"
}
```

### 2. Send Payment Success to Kasir
Mengirim notifikasi pembayaran sukses ke kasir tertentu.

```http
POST /payment-success
Content-Type: application/json

{
    "kasir_id": "3",
    "qr_string": "https://payment.example.com/pay/12345",
    "status": true
}
```

**Parameters:**
| Parameter  | Type    | Required | Default | Description |
|------------|---------|----------|---------|-------------|
| kasir_id   | string  | Yes      | -       | ID kasir yang akan menerima notifikasi |
| qr_string  | string  | Yes      | -       | String QR yang terkait dengan pembayaran |
| status     | boolean | No       | true    | Status pembayaran (true = sukses) |

**Response Success:**
```json
{
    "success": true,
    "message": "Payment success notification sent to Kasir 3",
    "kasir_id": "3",
    "qr_string": "https://payment.example.com/pay/12345",
    "status": true
}
```

**Response Error (Kasir tidak terhubung):**
```json
{
    "success": false,
    "error": "Kasir 3 is not connected"
}
```

### 3. List Connected Clients
Mendapatkan daftar kasir yang sedang terhubung.

```http
GET /clients
```

**Response:**
```json
{
    "success": true,
    "count": 2,
    "clients": ["3", "4"]
}
```

### 4. Check Kasir Connection
Mengecek apakah kasir tertentu sedang terhubung.

```http
GET /client/3
```

**Response:**
```json
{
    "success": true,
    "kasir_id": "3",
    "connected": true
}
```

### 5. Health Check
Mengecek status server.

```http
GET /health
```

**Response:**
```json
{
    "success": true,
    "status": "running",
    "timestamp": "2025-12-16T10:30:00.000Z"
}
```

## WebSocket Connection

### Koneksi dari Client (Kasir)

Koneksi memerlukan `kasir_id` dan `pin` sebagai query parameter:

```javascript
const kasirId = '3';
const pin = '123654';
const ws = new WebSocket(`ws://localhost:3001?kasir_id=${kasirId}&pin=${pin}`);

ws.onopen = function() {
    console.log('Connected to server');
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    
    if (data.type === 'qr_code') {
        console.log('Received QR:', data.qr_string);
        // Generate dan tampilkan QR code
    }
    
    if (data.type === 'payment_success') {
        console.log('Payment success:', data.qr_string, data.status);
        // Handle payment success notification
    }
};
```

### Message Types

**Connected (Server → Client):**
```json
{
    "type": "connected",
    "message": "Welcome Kasir 3",
    "kasir_id": "3"
}
```

**QR Code (Server → Client):**
```json
{
    "type": "qr_code",
    "qr_string": "https://payment.example.com/pay/12345",
    "text": "Scan untuk membayar Rp 50.000",
    "timestamp": "2025-12-16T10:30:00.000Z"
}
```

**Payment Success (Server → Client):**
```json
{
    "type": "payment_success",
    "qr_string": "https://payment.example.com/pay/12345",
    "status": true,
    "timestamp": "2025-12-16T10:30:00.000Z"
}
```

## Contoh Penggunaan

### 1. Buka Client (Kasir)
Buka file `client-example.html` di browser, masukkan Kasir ID, lalu klik Connect.

### 2. Kirim QR via cURL
```bash
curl -X POST http://localhost:3001/send-qr \
  -H "Content-Type: application/json" \
  -d '{"kasir_id": "3", "qr_string": "TEST-QR-STRING-12345", "text": "Scan untuk bayar"}'
```

### 3. Kirim QR via PHP
```php
$data = [
    'kasir_id' => '3',
    'qr_string' => 'https://payment.example.com/pay/12345',
    'text' => 'Scan untuk membayar Rp 50.000'
];

$ch = curl_init('http://localhost:3001/send-qr');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
```

## Flow Diagram

```
┌─────────────┐     POST /send-qr      ┌──────────────┐     WebSocket      ┌─────────────┐
│   Backend   │ ─────────────────────► │   QR Server  │ ──────────────────►│    Kasir    │
│   (PHP)     │   {kasir_id, qr_str}   │  (Node.js)   │   {type: qr_code}  │   (Browser) │
└─────────────┘                        └──────────────┘                    └─────────────┘
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT     | 3001    | Port untuk HTTP dan WebSocket server |

## WebSocket Close Codes

| Code | Reason | Description |
|------|--------|-------------|
| 4001 | kasir_id is required | Tidak ada kasir_id pada query parameter |
| 4002 | Invalid PIN | PIN tidak valid atau tidak disediakan |
| 4003 | kasir_id is not allowed | kasir_id tidak terdaftar dalam allowed list |
