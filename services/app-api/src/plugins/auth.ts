import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { authService, JWTPayload } from '../lib/auth';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }
}

export interface AuthPluginOptions {
  optional?: boolean;
}

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (fastify, options) => {
  // Add authentication hook
  fastify.addHook('preHandler', async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (!options.optional) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication token required',
        });
      }
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = await authService.verifyToken(token, 'access');

      // Get user details from database
      const user = await fastify.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'User not found or inactive',
        });
      }

      // Attach user to request
      request.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid token';

      if (!options.optional) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message,
        });
      }
    }
  });
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['prisma'],
});