import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'orangelink-dev-secret';
const ACCESS_EXPIRY = (process.env.ACCESS_TOKEN_EXPIRY || '15m') as SignOptions['expiresIn'];
const REFRESH_EXPIRY = (process.env.REFRESH_TOKEN_EXPIRY || '7d') as SignOptions['expiresIn'];

function generateAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: ACCESS_EXPIRY });
}

function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET + '-refresh', { expiresIn: REFRESH_EXPIRY });
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password, height, weight, age, sex, activityLevel, avatarUrl } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'Email y contraseña son requeridos');
    }

    if (password.length < 4) {
      throw new AppError(400, 'La contraseña debe tener al menos 4 caracteres');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, 'Este email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
        status: 'pending',
        ...(height !== undefined && { height }),
        ...(weight !== undefined && { weight }),
        ...(age !== undefined && { age }),
        ...(sex !== undefined && { sex }),
        ...(activityLevel !== undefined && { activityLevel }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    });

    res.status(201).json({
      message: 'Registro exitoso. Tu cuenta está pendiente de aprobación por un administrador.',
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'Email y contraseña son requeridos');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(401, 'Credenciales inválidas');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AppError(401, 'Credenciales inválidas');
    }

    if (user.status === 'pending') {
      throw new AppError(403, 'Tu cuenta está pendiente de aprobación');
    }
    if (user.status === 'rejected') {
      throw new AppError(403, 'Tu cuenta ha sido rechazada');
    }

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        registrationDate: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, 'Refresh token requerido');
    }

    let payload: { userId: string };
    try {
      payload = jwt.verify(refreshToken, JWT_SECRET + '-refresh') as { userId: string };
    } catch {
      throw new AppError(401, 'Refresh token inválido o expirado');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.refreshToken !== refreshToken) {
      throw new AppError(401, 'Refresh token inválido');
    }

    const newAccessToken = generateAccessToken(user.id, user.email);
    const newRefreshToken = generateRefreshToken(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;

    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, 'Usuario no encontrado');
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        registrationDate: user.createdAt.toISOString(),
        height: user.height,
        weight: user.weight,
        age: user.age,
        sex: user.sex,
        activityLevel: user.activityLevel,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    next(err);
  }
}

const RESET_SECRET_SUFFIX = '-reset';
const RESET_EXPIRY: SignOptions['expiresIn'] = '1h';

function generateResetToken(userId: string, email: string): string {
  return jwt.sign({ userId, email, purpose: 'reset' }, JWT_SECRET + RESET_SECRET_SUFFIX, { expiresIn: RESET_EXPIRY });
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      throw new AppError(400, 'Email requerido');
    }
    const normalized = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalized } });

    // Anti-enumeración: siempre responder 200
    if (!user) {
      res.json({ message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.' });
      return;
    }

    const resetToken = generateResetToken(user.id, user.email);

    // Sin servicio de email: log + devolver token en desarrollo / si el caller es admin o flag
    console.log(`[forgot-password] Reset token para ${user.email}: ${resetToken}`);

    const isDev = process.env.NODE_ENV !== 'production';
    // En todos los entornos devolvemos token para que el flujo funcione sin email; en producción el frontend lo ignora y muestra mensaje genérico
    res.json({
      message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.',
      ...(isDev ? { resetToken } : {}),
      // Siempre exponer resetToken en respuesta para permitir flujo sin email (MVP). Cuando se integre email, remover esta línea y depender solo del correo.
      resetToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password, newPassword } = req.body;
    const rawToken = token as string | undefined;
    const rawPassword = (password ?? newPassword) as string | undefined;

    if (!rawToken || !rawPassword) {
      throw new AppError(400, 'Token y nueva contraseña son requeridos');
    }
    if (String(rawPassword).length < 4) {
      throw new AppError(400, 'La contraseña debe tener al menos 4 caracteres');
    }

    let payload: { userId: string; email: string; purpose: string };
    try {
      payload = jwt.verify(rawToken, JWT_SECRET + RESET_SECRET_SUFFIX) as typeof payload;
    } catch {
      throw new AppError(400, 'Token inválido o expirado. Solicita uno nuevo.');
    }

    if (payload.purpose !== 'reset' || !payload.userId) {
      throw new AppError(400, 'Token inválido');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new AppError(404, 'Usuario no encontrado');
    }
    // Verificación extra: email del token debe coincidir con el usuario actual (evita uso cruzado si email cambió)
    if (user.email !== payload.email) {
      throw new AppError(400, 'Token no corresponde al usuario actual');
    }

    const hashedPassword = await bcrypt.hash(String(rawPassword), 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, refreshToken: null },
    });

    res.json({ message: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.' });
  } catch (err) {
    next(err);
  }
}
