import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

// Import local modules
import { prisma } from './lib/prisma';
import { authService } from './lib/auth';
import authPlugin from './plugins/auth';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import { checkDatabaseHealth } from './utils/database';

// Extend FastifyInstance with custom properties
declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma;
    authService: typeof authService;
  }
}

async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Register Prisma and AuthService
  server.decorate('prisma', prisma);
  server.decorate('authService', authService);

  // Register plugins
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  });

  await server.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    keyGenerator: (req) => {
      return req.user?.id || req.ip;
    },
  });

  // Swagger documentation
  await server.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'MoMo Merchant Companion API',
        description: 'Backend API for mobile money agent management',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
  });

  await server.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Register custom plugins
  await server.register(authPlugin);

  // Register routes
  await server.register(authRoutes, { prefix: '/auth' });
  await server.register(userRoutes, { prefix: '/users' });

  // Health check endpoint
  server.get('/health', async (request, reply) => {
    try {
      const dbHealth = await checkDatabaseHealth();

      const health = {
        status: dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        database: dbHealth,
      };

      const statusCode = health.status === 'healthy' ? 200 : 503;
      reply.code(statusCode).send(health);
    } catch (error) {
      reply.code(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Root endpoint
  server.get('/', async (request, reply) => {
    reply.send({
      name: 'MoMo Merchant Companion API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'Backend API for mobile money agent management',
      documentation: '/documentation',
      health: '/health',
    });
  });

  // Global error handler
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error);

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Validation failed',
        details: error.errors,
      });
    }

    // Handle Prisma errors
    if (error.code?.startsWith('P')) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Database operation failed',
      });
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    const message = statusCode >= 500 ? 'Internal Server Error' : error.message;

    reply.code(statusCode).send({
      error: error.name || 'Error',
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  });

  // Graceful shutdown
  const closeGracefully = async (signal: string) => {
    server.log.info(`Received signal ${signal}, closing server...`);

    await server.close();
    await prisma.$disconnect();

    process.exit(0);
  };

  process.on('SIGINT', () => closeGracefully('SIGINT'));
  process.on('SIGTERM', () => closeGracefully('SIGTERM'));

  return server;
}

// Start server
async function start() {
  try {
    const server = await buildServer();
    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });

    server.log.info(`Server listening on http://${host}:${port}`);
    server.log.info(`API Documentation available at http://${host}:${port}/documentation`);
    server.log.info(`Health check available at http://${host}:${port}/health`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Export for testing
export default buildServer;

// Start if this file is run directly
if (require.main === module) {
  start();
}