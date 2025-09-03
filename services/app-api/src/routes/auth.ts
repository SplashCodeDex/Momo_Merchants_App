import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authService } from '../lib/auth';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register schema
  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
  });

  // Login schema
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  // Refresh token schema
  const refreshSchema = z.object({
    refreshToken: z.string(),
  });

  // Register endpoint
  fastify.post('/register', {
    schema: {
      body: registerSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                phone: { type: 'string' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string' },
              },
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password, firstName, lastName, phone } = request.body as z.infer<typeof registerSchema>;

    try {
      // Check if user already exists
      const existingUser = await fastify.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'User with this email already exists',
        });
      }

      // Create user
      const user = await authService.createUser({
        email,
        password,
        firstName,
        lastName,
        phone,
      });

      // Generate tokens
      const tokens = await authService.generateTokens(user);

      // Return user data (without password hash)
      const userResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
      };

      reply.code(201).send({
        user: userResponse,
        tokens,
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to register user',
      });
    }
  });

  // Login endpoint
  fastify.post('/login', {
    schema: {
      body: loginSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                phone: { type: 'string' },
                lastLoginAt: { type: 'string' },
              },
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body as z.infer<typeof loginSchema>;

    try {
      const user = await authService.authenticateUser(email, password);

      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Generate tokens
      const tokens = await authService.generateTokens(user);

      // Return user data
      const userResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        lastLoginAt: user.lastLoginAt,
      };

      reply.send({
        user: userResponse,
        tokens,
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to authenticate user',
      });
    }
  });

  // Refresh token endpoint
  fastify.post('/refresh', {
    schema: {
      body: refreshSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { refreshToken } = request.body as z.infer<typeof refreshSchema>;

    try {
      const tokens = await authService.refreshAccessToken(refreshToken);

      reply.send({ tokens });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid refresh token';

      reply.code(401).send({
        error: 'Unauthorized',
        message,
      });
    }
  });

  // Logout endpoint (requires authentication)
  fastify.post('/logout', {
    preHandler: fastify.auth,
  }, async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await authService.revokeToken(token);
      }

      reply.send({ message: 'Logged out successfully' });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to logout',
      });
    }
  });

  // Get current user profile (requires authentication)
  fastify.get('/me', {
    preHandler: fastify.auth,
  }, async (request, reply) => {
    try {
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user!.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      reply.send({ user });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get user profile',
      });
    }
  });
};

export default authRoutes;