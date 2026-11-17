import { User } from './user';

describe('User', () => {
  const now = new Date('2026-11-01T10:00:00Z');
  const base = () =>
    User.register({ id: 'u1', name: 'Daniel Pérez', email: 'DANIEL@uni.mx', passwordHash: 'x', studentId: 'a001' }, now);

  it('normaliza correo y matrícula al registrarse', () => {
    const user = base();
    expect(user.email).toBe('daniel@uni.mx');
    expect(user.studentId).toBe('A001');
    expect(user.role).toBe('STUDENT');
  });

  it('rechaza correos inválidos', () => {
    expect(() => User.register({ id: 'u', name: 'Ana López', email: 'no-es-correo', passwordHash: 'x' }, now)).toThrow(
      'Correo electrónico inválido',
    );
  });

  it('vincula Telegram con un código vigente', () => {
    const user = base();
    user.issueTelegramLinkCode('123456', now);
    user.linkTelegram('123456', '99887766', 'daniel', new Date(now.getTime() + 60_000));
    expect(user.telegramChatId).toBe('99887766');
    expect(user.toPublic().telegramLinked).toBe(true);
  });

  it('rechaza códigos expirados', () => {
    const user = base();
    user.issueTelegramLinkCode('123456', now);
    const later = new Date(now.getTime() + 16 * 60_000);
    expect(() => user.linkTelegram('123456', '1', null, later)).toThrow('expiró');
  });
});
