import { AuxUserBffService } from './aux_user_bff.service';

describe('AuxUserBffService - reenvio de confirmação', () => {
  const prisma = {
    users: {
      findFirst: jest.fn(),
    },
  };
  const authService = {
    generateToken: jest.fn(),
  };
  const emailService = {
    sendEmail: jest.fn(),
  };
  const usersService = {};
  const originalSite = process.env.SITE;
  let service: AuxUserBffService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SITE = 'https://zro-app.azurewebsites.net/';
    service = new AuxUserBffService(
      prisma as never,
      usersService as never,
      authService as never,
      emailService as never,
    );
  });

  afterAll(() => {
    if (originalSite === undefined) delete process.env.SITE;
    else process.env.SITE = originalSite;
  });

  it('gera um novo link e envia o e-mail para usuário ainda não verificado', async () => {
    prisma.users.findFirst.mockResolvedValue({
      id: 12,
      email: 'cliente@example.com',
      name: 'Cliente',
      verify_email: false,
    });
    authService.generateToken.mockResolvedValue({ access_token: 'new-token' });
    emailService.sendEmail.mockResolvedValue(undefined);

    await service.resendVerificationEmail(' Cliente@Example.com ');

    expect(prisma.users.findFirst).toHaveBeenCalledWith({
      where: { email: 'cliente@example.com', deletedAt: null },
    });
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      'cliente@example.com',
      'Verificação de email',
      'verifyEmail.hbs',
      {
        verificationLink:
          'https://zro-app.azurewebsites.net/auth/verify-email?token=new-token',
        name: 'Cliente',
      },
    );
  });

  it.each([
    ['conta inexistente', null],
    ['conta já verificada', { id: 12, verify_email: true }],
  ])('responde de forma neutra para %s', async (_scenario, user) => {
    prisma.users.findFirst.mockResolvedValue(user);

    const result = await service.resendVerificationEmail('cliente@example.com');

    expect(result.message).toContain('Se existir uma conta não verificada');
    expect(authService.generateToken).not.toHaveBeenCalled();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });
});
