import authentication from './authentication.service';

describe('authentication service', () => {

  it('should generate a token', async () => {
    const result = await authentication.generateToken({ user: 'test' });
    expect(result.success).toBe(true);
    expect(typeof result.body).toBe('string');
  });

  it('should decode a token', async () => {
    const { body: token } = await authentication.generateToken({ user: 'test' });
    const result = await authentication.decodeToken(token!);
    expect(result.success).toBe(true);
    expect(result.body).toBeDefined();
    expect((result.body as any).user).toBe('test');
  });

  it('should verify a token', async () => {
    const { body: token } = await authentication.generateToken({ user: 'test' });
    const result = await authentication.verifyToken(token!);
    expect(result.success).toBe(true);
    expect(result.body).toBeDefined();
    expect((result.body as any).user).toBe('test');  
  });

});
