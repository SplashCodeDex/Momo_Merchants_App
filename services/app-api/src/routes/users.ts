import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const userRoutes: FastifyPluginAsync = async (fastify) => {
  // Update profile schema
  const updateProfileSchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().optional(),
  });

  // Change password schema
  const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  });

  // Create merchant schema
  const createMerchantSchema = z.object({
    businessName: z.string().min(1),
    businessType: z.string().min(1),
    registrationNumber: z.string().optional(),
    taxId: z.string().optional(),
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
    }).optional(),
    contactInfo: z.object({
      phone: z.string().optional(),
      email: z.string().email().optional(),
      website: z.string().url().optional(),
    }).optional(),
  });

  // Update merchant schema
  const updateMerchantSchema = z.object({
    businessName: z.string().min(1).optional(),
    businessType: z.string().min(1).optional(),
    registrationNumber: z.string().optional(),
    taxId: z.string().optional(),
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
    }).optional(),
    contactInfo: z.object({
      phone: z.string().optional(),
      email: z.string().email().optional(),
      website: z.string().url().optional(),
    }).optional(),
  });

  // Update user profile
  fastify.put('/profile', {
    preHandler: fastify.auth,
    schema: {
      body: updateProfileSchema,
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
                updatedAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const updates = request.body as z.infer<typeof updateProfileSchema>;

    try {
      const user = await fastify.prisma.user.update({
        where: { id: request.user!.id },
        data: updates,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          updatedAt: true,
        },
      });

      reply.send({ user });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update profile',
      });
    }
  });

  // Change password
  fastify.put('/password', {
    preHandler: fastify.auth,
    schema: {
      body: changePasswordSchema,
    },
  }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body as z.infer<typeof changePasswordSchema>;

    try {
      // Get current user with password hash
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user!.id },
      });

      if (!user) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      // Verify current password
      const isValidPassword = await fastify.authService.verifyPassword(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Current password is incorrect',
        });
      }

      // Hash new password
      const newPasswordHash = await fastify.authService.hashPassword(newPassword);

      // Update password
      await fastify.prisma.user.update({
        where: { id: request.user!.id },
        data: { passwordHash: newPasswordHash },
      });

      // Revoke all existing sessions (force re-login)
      await fastify.authService.revokeAllUserTokens(request.user!.id);

      reply.send({ message: 'Password changed successfully' });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to change password',
      });
    }
  });

  // Get user merchants
  fastify.get('/merchants', {
    preHandler: fastify.auth,
  }, async (request, reply) => {
    try {
      const merchants = await fastify.prisma.merchant.findMany({
        where: { userId: request.user!.id },
        include: {
          _count: {
            select: { transactions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      reply.send({ merchants });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get merchants',
      });
    }
  });

  // Create merchant
  fastify.post('/merchants', {
    preHandler: fastify.auth,
    schema: {
      body: createMerchantSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            merchant: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                businessName: { type: 'string' },
                businessType: { type: 'string' },
                isVerified: { type: 'boolean' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const merchantData = request.body as z.infer<typeof createMerchantSchema>;

    try {
      const merchant = await fastify.prisma.merchant.create({
        data: {
          userId: request.user!.id,
          ...merchantData,
        },
        select: {
          id: true,
          businessName: true,
          businessType: true,
          isVerified: true,
          createdAt: true,
        },
      });

      reply.code(201).send({ merchant });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create merchant',
      });
    }
  });

  // Get merchant by ID
  fastify.get('/merchants/:id', {
    preHandler: fastify.auth,
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const merchant = await fastify.prisma.merchant.findFirst({
        where: {
          id,
          userId: request.user!.id, // Ensure user owns this merchant
        },
        include: {
          _count: {
            select: { transactions: true },
          },
        },
      });

      if (!merchant) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Merchant not found',
        });
      }

      reply.send({ merchant });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get merchant',
      });
    }
  });

  // Update merchant
  fastify.put('/merchants/:id', {
    preHandler: fastify.auth,
    schema: {
      body: updateMerchantSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as z.infer<typeof updateMerchantSchema>;

    try {
      const merchant = await fastify.prisma.merchant.findFirst({
        where: {
          id,
          userId: request.user!.id,
        },
      });

      if (!merchant) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Merchant not found',
        });
      }

      const updatedMerchant = await fastify.prisma.merchant.update({
        where: { id },
        data: updates,
        select: {
          id: true,
          businessName: true,
          businessType: true,
          registrationNumber: true,
          taxId: true,
          address: true,
          contactInfo: true,
          isVerified: true,
          updatedAt: true,
        },
      });

      reply.send({ merchant: updatedMerchant });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update merchant',
      });
    }
  });

  // Delete merchant
  fastify.delete('/merchants/:id', {
    preHandler: fastify.auth,
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const merchant = await fastify.prisma.merchant.findFirst({
        where: {
          id,
          userId: request.user!.id,
        },
      });

      if (!merchant) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Merchant not found',
        });
      }

      await fastify.prisma.merchant.delete({
        where: { id },
      });

      reply.send({ message: 'Merchant deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete merchant',
      });
    }
  });
};

export default userRoutes;