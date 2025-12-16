const WebSocket = require('ws');
const express = require('express');
const http = require('http');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients by kasir_id
const clients = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    // Extract kasir_id from query parameter
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const kasirId = urlParams.get('kasir_id');

    if (!kasirId) {
        console.log('Connection rejected: missing kasir_id');
        ws.close(4001, 'kasir_id is required');
        return;
    }

    console.log(`Kasir ${kasirId} connected`);

    // Store the client connection
    clients.set(kasirId, ws);

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connected',
        message: `Welcome Kasir ${kasirId}`,
        kasir_id: kasirId
    }));

    // Handle incoming messages from client
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`Message from Kasir ${kasirId}:`, data);
        } catch (e) {
            console.log(`Raw message from Kasir ${kasirId}:`, message.toString());
        }
    });

    // Handle client disconnect
    ws.on('close', () => {
        console.log(`Kasir ${kasirId} disconnected`);
        clients.delete(kasirId);
    });

    // Handle errors
    ws.on('error', (error) => {
        console.error(`Error for Kasir ${kasirId}:`, error.message);
        clients.delete(kasirId);
    });

    // Heartbeat to keep connection alive
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });
});

// Heartbeat interval to detect dead connections
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(heartbeatInterval);
});

// ============================================
// HTTP API Endpoints
// ============================================

// Handle favicon requests to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

/**
 * Send QR string to specific kasir
 * POST /send-qr
 * Body: { kasir_id: string, qr_string: string, text: string (optional) }
 */
app.post('/send-qr', (req, res) => {
    const { kasir_id, qr_string, text } = req.body;

    if (!kasir_id) {
        return res.status(400).json({
            success: false,
            error: 'kasir_id is required'
        });
    }

    if (!qr_string) {
        return res.status(400).json({
            success: false,
            error: 'qr_string is required'
        });
    }

    const clientWs = clients.get(kasir_id);

    if (!clientWs || clientWs.readyState !== WebSocket.OPEN) {
        return res.status(404).json({
            success: false,
            error: `Kasir ${kasir_id} is not connected`
        });
    }

    // Send QR string and text to the kasir
    const message = JSON.stringify({
        type: 'qr_code',
        qr_string: qr_string,
        text: text || '',
        timestamp: new Date().toISOString()
    });

    clientWs.send(message);

    console.log(`QR sent to Kasir ${kasir_id}: ${qr_string}${text ? ' | Text: ' + text : ''}`);

    return res.json({
        success: true,
        message: `QR string sent to Kasir ${kasir_id}`,
        kasir_id: kasir_id,
        qr_string: qr_string,
        text: text || ''
    });
});

/**
 * Get list of connected kasir
 * GET /clients
 */
app.get('/clients', (req, res) => {
    const connectedClients = [];
    clients.forEach((ws, kasirId) => {
        if (ws.readyState === WebSocket.OPEN) {
            connectedClients.push(kasirId);
        }
    });

    return res.json({
        success: true,
        count: connectedClients.length,
        clients: connectedClients
    });
});

/**
 * Check if specific kasir is connected
 * GET /client/:kasir_id
 */
app.get('/client/:kasir_id', (req, res) => {
    const kasirId = req.params.kasir_id;
    const clientWs = clients.get(kasirId);
    const isConnected = clientWs && clientWs.readyState === WebSocket.OPEN;

    return res.json({
        success: true,
        kasir_id: kasirId,
        connected: isConnected
    });
});

/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', (req, res) => {
    return res.json({
        success: true,
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// Start Server
// ============================================

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces for VPS access

server.listen(PORT, HOST, () => {
    console.log('========================================');
    console.log(`  QR WebSocket Server`);
    console.log('========================================');
    console.log(`  HTTP API : http://localhost:${PORT}`);
    console.log(`  WebSocket: ws://localhost:${PORT}`);
    console.log('========================================');
    console.log('');
    console.log('Endpoints:');
    console.log('  POST /send-qr       - Send QR to kasir');
    console.log('  GET  /clients       - List connected kasir');
    console.log('  GET  /client/:id    - Check kasir connection');
    console.log('  GET  /health        - Health check');
    console.log('');
    console.log('WebSocket connection:');
    console.log(`  ws://localhost:${PORT}?kasir_id=YOUR_KASIR_ID`);
    console.log('========================================');
});
