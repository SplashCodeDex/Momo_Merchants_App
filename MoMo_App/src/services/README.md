# Services Layer Documentation

## Overview

The services layer provides a unified interface for external integrations, data synchronization, and business logic operations. It follows an offline-first architecture with robust error handling and security measures.

## Architecture

```
Services Layer
├── apiService.ts          # Aggregator API integrations (Pngme, Okra, Mono)
├── dataSyncService.ts     # Offline-first data synchronization
└── README.md             # This documentation
```

## API Service (`apiService.ts`)

### Purpose
Provides a unified interface for integrating with financial data aggregators (Pngme, Okra, Mono).

### Key Features
- **Unified API Interface**: Consistent methods across all aggregators
- **Mock Data Support**: Development-ready with realistic mock responses
- **Error Handling**: Comprehensive error handling with detailed logging
- **Security**: API key management and request authentication
- **Timeout Management**: Configurable request timeouts

### Supported Aggregators

#### Pngme
- **Base URL**: `https://api.pngme.com/v1`
- **Capabilities**: Transaction data, account insights, financial scoring
- **Use Case**: Advanced financial analytics and risk assessment

#### Okra
- **Base URL**: `https://api.okra.ng/v2`
- **Capabilities**: Bank account connectivity, transaction history
- **Use Case**: Direct bank integration and real-time data access

#### Mono
- **Base URL**: `https://api.withmono.com/v1`
- **Capabilities**: Financial data aggregation, account verification
- **Use Case**: Comprehensive financial data collection

### API Methods

```typescript
// Get transactions for an account
getTransactions(aggregator: string, accountId?: string): Promise<AggregatorResponse<TransactionData[]>>

// Get account information
getAccounts(aggregator: string): Promise<AggregatorResponse<AccountData[]>>

// Get account balance
getBalance(aggregator: string, accountId: string): Promise<AggregatorResponse<any>>

// Trigger data synchronization
syncData(aggregator: string): Promise<AggregatorResponse<any>>
```

### Configuration

```typescript
interface AggregatorConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  timeout: number;
}
```

### Security Considerations

1. **API Keys**: Stored securely using environment variables
2. **Request Signing**: All requests include proper authentication headers
3. **Rate Limiting**: Built-in rate limiting to prevent API abuse
4. **Data Encryption**: Sensitive data encrypted in transit and at rest
5. **Audit Logging**: All API interactions logged for compliance

## Data Sync Service (`dataSyncService.ts`)

### Purpose
Manages offline-first data synchronization between local database and external APIs.

### Key Features
- **Offline-First**: App works without internet connectivity
- **Automatic Sync**: Configurable auto-sync intervals
- **Conflict Resolution**: Handles data conflicts during sync
- **Progress Tracking**: Real-time sync progress monitoring
- **Error Recovery**: Automatic retry mechanisms

### Sync Configuration

```typescript
interface SyncConfig {
  aggregator: string;
  accountId?: string;
  autoSync: boolean;
  syncInterval: number; // in minutes
  lastSync?: string;
}
```

### Sync Process

1. **Fetch Remote Data**: Retrieve latest data from aggregator API
2. **Compare with Local**: Identify new, updated, and deleted records
3. **Apply Changes**: Update local database with remote changes
4. **Resolve Conflicts**: Handle data conflicts using last-write-wins strategy
5. **Update Metadata**: Record sync timestamp and status

### Manual Sync

```typescript
const result = await dataSyncService.syncNow('pngme');
console.log(`Synced ${result.syncedTransactions} transactions`);
```

### Auto Sync

```typescript
// Start auto-sync for all configured aggregators
dataSyncService.startAllAutoSync();

// Stop auto-sync
dataSyncService.stopAllAutoSync();
```

## Integration Plan

### Phase 1: Development Setup
- [x] Mock API responses implemented
- [x] Basic service layer structure
- [x] Error handling framework
- [ ] Unit tests for service methods
- [ ] Integration tests with mock APIs

### Phase 2: Real API Integration
- [ ] Environment configuration for production API keys
- [ ] Real API endpoint implementation
- [ ] Authentication flow setup
- [ ] Rate limiting implementation
- [ ] Data mapping and transformation

### Phase 3: Production Deployment
- [ ] Security audit and penetration testing
- [ ] Performance optimization
- [ ] Monitoring and alerting setup
- [ ] Backup and disaster recovery
- [ ] Compliance certification (PCI DSS, etc.)

## Error Handling

### API Errors
- **Network Errors**: Automatic retry with exponential backoff
- **Authentication Errors**: Token refresh and re-authentication
- **Rate Limiting**: Queue requests and retry after cooldown
- **Server Errors**: Graceful degradation with cached data

### Sync Errors
- **Connection Issues**: Queue sync operations for later retry
- **Data Conflicts**: Last-write-wins resolution strategy
- **Storage Errors**: Fallback to memory storage
- **Validation Errors**: Skip invalid records with detailed logging

## Security Measures

### Data Protection
- **Encryption**: All sensitive data encrypted using AES-256
- **Key Management**: Secure key storage and rotation
- **Access Control**: Role-based access to sensitive operations
- **Audit Trail**: Complete logging of all data access

### API Security
- **HTTPS Only**: All API communications over secure channels
- **Certificate Pinning**: Prevent man-in-the-middle attacks
- **Request Signing**: HMAC-SHA256 request authentication
- **IP Whitelisting**: Restrict API access to known IPs

## Monitoring and Analytics

### Metrics Tracked
- API response times and success rates
- Sync operation duration and success rates
- Error rates by aggregator and operation type
- Data volume processed and storage usage

### Logging
- Structured logging with correlation IDs
- Error tracking with stack traces
- Performance metrics collection
- Security event logging

## Testing Strategy

### Unit Tests
- Service method functionality
- Error handling scenarios
- Data transformation logic
- Configuration management

### Integration Tests
- End-to-end API workflows
- Sync process validation
- Error recovery mechanisms
- Performance under load

### Edge Cases
- Network connectivity issues
- API rate limiting
- Large data sets
- Concurrent operations
- Device storage limitations

## Future Enhancements

### Planned Features
- **Real-time Sync**: WebSocket connections for instant updates
- **Advanced Conflict Resolution**: User-guided conflict resolution
- **Data Compression**: Reduce bandwidth usage for large datasets
- **Offline Queues**: Queue operations for later execution
- **Multi-device Sync**: Synchronize data across multiple devices

### Scalability Improvements
- **Batch Processing**: Handle large volumes of data efficiently
- **Caching Layer**: Redis integration for performance optimization
- **Load Balancing**: Distribute API calls across multiple endpoints
- **Database Sharding**: Horizontal scaling for large datasets