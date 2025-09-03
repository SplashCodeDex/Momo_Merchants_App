import { prisma } from '../lib/prisma';

/**
 * Database utility functions for health checks and connection management
 */

export interface DatabaseHealth {
  status: 'healthy' | 'unhealthy';
  latency: number;
  timestamp: Date;
  details?: string;
}

/**
 * Check database connection health
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const startTime = Date.now();

  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`;

    const latency = Date.now() - startTime;

    return {
      status: 'healthy',
      latency,
      timestamp: new Date(),
    };
  } catch (error) {
    const latency = Date.now() - startTime;

    return {
      status: 'unhealthy',
      latency,
      timestamp: new Date(),
      details: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    // Get table counts
    const [userCount, merchantCount, transactionCount] = await Promise.all([
      prisma.user.count(),
      prisma.merchant.count(),
      prisma.transaction.count(),
    ]);

    // Get recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        merchant: {
          select: {
            businessName: true,
          },
        },
      },
    });

    return {
      counts: {
        users: userCount,
        merchants: merchantCount,
        transactions: transactionCount,
      },
      recentTransactions,
    };
  } catch (error) {
    throw new Error(`Failed to get database stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isActive: false },
        ],
      },
    });

    return result.count;
  } catch (error) {
    throw new Error(`Failed to cleanup expired sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clean up old rate limit entries
 */
export async function cleanupOldRateLimits(): Promise<number> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await prisma.rateLimit.deleteMany({
      where: {
        windowEnd: { lt: oneHourAgo },
      },
    });

    return result.count;
  } catch (error) {
    throw new Error(`Failed to cleanup old rate limits: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Initialize database with required extensions and functions
 */
export async function initializeDatabase() {
  try {
    // Check if uuid7 function exists
    const uuid7Exists = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'uuid7'
      ) as exists
    `;

    if (!uuid7Exists[0]?.exists) {
      throw new Error('UUID v7 function not found. Please run database migrations.');
    }

    // Verify required extensions
    const extensions = await prisma.$queryRaw<{ name: string }[]>`
      SELECT name FROM pg_available_extensions
      WHERE name IN ('uuid-ossp', 'pgcrypto') AND installed_version IS NOT NULL
    `;

    if (extensions.length < 2) {
      throw new Error('Required PostgreSQL extensions not installed: uuid-ossp, pgcrypto');
    }

    return { success: true, message: 'Database initialized successfully' };
  } catch (error) {
    throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}