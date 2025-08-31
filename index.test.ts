import http from 'http';

describe('Server', () => {
  it('should respond with Hello, world!', (done) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Hello, world!\n');
    });

    server.listen(0, () => {
      const { port } = server.address() as any;
      http.get(`http://localhost:${port}/`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          expect(data).toBe('Hello, world!\n');
          server.close();
          done();
        });
      });
    });
  });
});
