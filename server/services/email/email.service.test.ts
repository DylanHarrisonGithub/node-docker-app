import email from './email.service';

describe('email service', () => {
  it('should be a function', () => {
    expect(typeof email).toBe('function');
  });

  // Add more tests with mocks for nodemailer
});
