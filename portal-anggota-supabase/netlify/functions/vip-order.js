/**
 * NETLIFY SERVERLESS FUNCTION: VIP RESELLER PROXY GATEWAY VIA FIXIE STATIC IP
 * Menjamin transaksi pulsa, kuota, token PLN & cek saldo Teater Q selalu lolos
 * verifikasi IP dengan merutekan traffic keluar melalui Fixie Static Proxy IP (52.87.82.133 / 52.5.155.132).
 */

const http = require('http');
const tls = require('tls');
const url = require('url');

const FIXIE_HOST = 'criterium.usefixie.com';
const FIXIE_PORT = 80;
const FIXIE_AUTH = 'Basic ' + Buffer.from('fixie:UCtY46v5xSWlqFA').toString('base64');

function requestViaFixie(targetUrl, postData) {
  return new Promise((resolve, reject) => {
    const parsedTarget = new url.URL(targetUrl);
    const targetHost = parsedTarget.hostname;
    const targetPort = parsedTarget.port || 443;
    const payload = postData || '';

    // 1. Establish HTTP CONNECT tunnel ke Fixie proxy
    const connectReq = http.request({
      host: FIXIE_HOST,
      port: FIXIE_PORT,
      method: 'CONNECT',
      path: `${targetHost}:${targetPort}`,
      headers: {
        'Host': `${targetHost}:${targetPort}`,
        'Proxy-Authorization': FIXIE_AUTH
      }
    });

    connectReq.setTimeout(15000, () => {
      connectReq.destroy(new Error('Koneksi timeout ke Fixie Proxy'));
    });

    connectReq.on('connect', (res, socket, head) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        return reject(new Error(`Fixie Proxy menolak koneksi (HTTP ${res.statusCode})`));
      }

      // 2. Bungkus socket ke TLS untuk koneksi aman HTTPS ke VIP Reseller
      const tlsSocket = tls.connect({
        socket: socket,
        servername: targetHost
      }, () => {
        // 3. Kirim raw HTTP/1.1 request via secure TLS socket
        const httpRequest = 
          `POST ${parsedTarget.pathname}${parsedTarget.search || ''} HTTP/1.1\r\n` +
          `Host: ${targetHost}\r\n` +
          `Content-Type: application/x-www-form-urlencoded\r\n` +
          `Content-Length: ${Buffer.byteLength(payload)}\r\n` +
          `User-Agent: TeaterQ-Gateway/1.0\r\n` +
          `Connection: close\r\n\r\n` +
          payload;

        tlsSocket.write(httpRequest);
      });

      let chunks = [];
      tlsSocket.on('data', chunk => chunks.push(chunk));
      tlsSocket.on('end', () => {
        const fullResponse = Buffer.concat(chunks).toString('utf-8');
        // Pisahkan header HTTP dan body JSON response
        const splitIndex = fullResponse.indexOf('\r\n\r\n');
        if (splitIndex !== -1) {
          const headerPart = fullResponse.slice(0, splitIndex);
          let bodyPart = fullResponse.slice(splitIndex + 4);
          const statusMatch = headerPart.match(/HTTP\/1\.[01]\s+(\d+)/);
          const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 200;

          // Ekstrak string JSON murni (menghapus framing chunked hex dan trailing bytes)
          const firstBrace = bodyPart.indexOf('{');
          const lastBrace = bodyPart.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            bodyPart = bodyPart.substring(firstBrace, lastBrace + 1);
          }

          resolve({ statusCode, body: bodyPart });
        } else {
          resolve({ statusCode: 200, body: fullResponse });
        }
      });

      tlsSocket.on('error', err => reject(err));
      tlsSocket.setTimeout(25000, () => {
        tlsSocket.destroy(new Error('Koneksi timeout ke VIP Reseller'));
      });
    });

    connectReq.on('error', err => reject(err));
    connectReq.end();
  });
}

exports.handler = async function (event, context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };

  // Tangani CORS Preflight (OPTIONS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ result: false, message: 'Method Not Allowed. Gunakan POST.' })
    };
  }

  try {
    let bodyData = event.body || '';
    if (event.isBase64Encoded && bodyData) {
      bodyData = Buffer.from(bodyData, 'base64').toString('utf-8');
    }

    // Tentukan target URL berdasarkan parameter
    let targetUrl = 'https://vip-reseller.co.id/api/prepaid';
    const reqPath = (event.path || '').toLowerCase();
    if (reqPath.includes('profile') || bodyData.includes('type=profile')) {
      targetUrl = 'https://vip-reseller.co.id/api/profile';
    }

    // Eksekusi request aman melalui Fixie Proxy (Exit IP: 52.87.82.133)
    const fixieResult = await requestViaFixie(targetUrl, bodyData);
    return {
      statusCode: fixieResult.statusCode || 200,
      headers: corsHeaders,
      body: fixieResult.body
    };


  } catch (error) {
    console.error('Error pada VIP Proxy Function:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        result: false,
        message: 'Gagal menghubungi server VIP Reseller: ' + (error.message || error.toString())
      })
    };
  }
};
