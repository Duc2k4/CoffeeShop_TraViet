let sseClients = [];

const addClient = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Kitchen SSE Connected', clientId })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
};

const broadcastSSE = (eventType, payload) => {
  const dataString = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(dataString);
    } catch (e) {
      console.error('[SSE ERROR]:', e);
    }
  });
};

module.exports = {
  addClient,
  broadcastSSE
};
