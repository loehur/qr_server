# QR WebSocket Server

Server WebSocket untuk mengirim QR string ke kasir secara real-time.

## Instalasi

```bash
npm install
```

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
    "kasir_id": "KASIR001",
    "qr_string": "https://payment.example.com/pay/12345",
    "text": "Scan untuk membayar Rp 50.000"
}
```

**Response Success:**
```json
{
    "success": true,
    "message": "QR string sent to Kasir KASIR001",
    "kasir_id": "KASIR001",
    "qr_string": "https://payment.example.com/pay/12345",
    "text": "Scan untuk membayar Rp 50.000"
}
```

**Response Error (Kasir tidak terhubung):**
```json
{
    "success": false,
    "error": "Kasir KASIR001 is not connected"
}
```

### 2. List Connected Clients
Mendapatkan daftar kasir yang sedang terhubung.

```http
GET /clients
```

**Response:**
```json
{
    "success": true,
    "count": 2,
    "clients": ["KASIR001", "KASIR002"]
}
```

### 3. Check Kasir Connection
Mengecek apakah kasir tertentu sedang terhubung.

```http
GET /client/KASIR001
```

**Response:**
```json
{
    "success": true,
    "kasir_id": "KASIR001",
    "connected": true
}
```

### 4. Health Check
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

```javascript
const ws = new WebSocket('ws://localhost:3001?kasir_id=KASIR001');

ws.onopen = function() {
    console.log('Connected to server');
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    
    if (data.type === 'qr_code') {
        console.log('Received QR:', data.qr_string);
        // Generate dan tampilkan QR code
    }
};
```

### Message Types

**Connected (Server → Client):**
```json
{
    "type": "connected",
    "message": "Welcome Kasir KASIR001",
    "kasir_id": "KASIR001"
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

## Contoh Penggunaan

### 1. Buka Client (Kasir)
Buka file `client-example.html` di browser, masukkan Kasir ID, lalu klik Connect.

### 2. Kirim QR via cURL
```bash
curl -X POST http://localhost:3001/send-qr \
  -H "Content-Type: application/json" \
  -d '{"kasir_id": "KASIR001", "qr_string": "TEST-QR-STRING-12345", "text": "Scan untuk bayar"}'
```

### 3. Kirim QR via PHP
```php
$data = [
    'kasir_id' => 'KASIR001',
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
