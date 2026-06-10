import { getRequiredPort } from './bootstrap';

describe('getRequiredPort', () => {
  it('throws when PORT is missing', () => {
    expect(() => getRequiredPort({})).toThrow(
      'PORT environment variable is required',
    );
  });

  it('throws when PORT is not a valid TCP port', () => {
    expect(() => getRequiredPort({ PORT: 'abc' })).toThrow(
      'PORT must be a valid TCP port number',
    );
  });

  it('returns the numeric port when PORT is valid', () => {
    expect(getRequiredPort({ PORT: '3001' })).toBe(3001);
  });
});
