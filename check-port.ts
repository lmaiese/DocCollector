import net from 'net';

const server = net.createServer();

server.once('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.log('Port 3000 is in use');
  } else {
    console.log('Error:', err);
  }
});

server.once('listening', () => {
  console.log('Port 3000 is free');
  server.close();
});

server.listen(3000);
