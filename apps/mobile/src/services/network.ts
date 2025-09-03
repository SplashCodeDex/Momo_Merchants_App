import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { syncEngine } from './syncEngine';

export type NetworkStatus = 'online' | 'offline' | 'unknown';
export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'wimax' | 'vpn' | 'other' | 'none';

export interface NetworkState {
  status: NetworkStatus;
  connectionType: ConnectionType;
  isConnected: boolean;
  isInternetReachable: boolean | null;
  details: {
    isConnectionExpensive?: boolean;
    cellularGeneration?: string;
    wifiEnabled?: boolean;
  };
}

class NetworkService {
  private currentState: NetworkState = {
    status: 'unknown',
    connectionType: 'none',
    isConnected: false,
    isInternetReachable: null,
    details: {},
  };

  private listeners: Array<(state: NetworkState) => void> = [];
  private unsubscribe?: () => void;
  private isMonitoring = false;

  // Start network monitoring
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Initial state check
    this.checkNetworkState();

    // Subscribe to network changes
    this.unsubscribe = NetInfo.addEventListener(this.handleNetworkChange.bind(this));
  }

  // Stop network monitoring
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  // Get current network state
  getCurrentState(): NetworkState {
    return { ...this.currentState };
  }

  // Check if device is online
  isOnline(): boolean {
    return this.currentState.status === 'online';
  }

  // Check if device is offline
  isOffline(): boolean {
    return this.currentState.status === 'offline';
  }

  // Check if connection is reliable (not cellular or expensive)
  isReliableConnection(): boolean {
    const { connectionType, details } = this.currentState;
    return (
      connectionType === 'wifi' ||
      connectionType === 'ethernet' ||
      (connectionType === 'cellular' && !details.isConnectionExpensive)
    );
  }

  // Add network state change listener
  addListener(callback: (state: NetworkState) => void): () => void {
    this.listeners.push(callback);

    // Immediately call with current state
    callback(this.getCurrentState());

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Handle network state changes
  private handleNetworkChange(state: NetInfoState): void {
    const previousState = { ...this.currentState };

    // Convert NetInfo state to our NetworkState format
    this.currentState = this.convertNetInfoState(state);

    // Notify listeners if state changed
    if (this.hasStateChanged(previousState, this.currentState)) {
      this.notifyListeners();

      // Handle online/offline transitions
      this.handleConnectivityChange(previousState, this.currentState);
    }
  }

  // Convert NetInfo state to our format
  private convertNetInfoState(state: NetInfoState): NetworkState {
    let status: NetworkStatus = 'unknown';
    let connectionType: ConnectionType = 'none';

    if (state.isConnected === false) {
      status = 'offline';
      connectionType = 'none';
    } else if (state.isConnected === true && state.isInternetReachable === true) {
      status = 'online';
    } else if (state.isConnected === true && state.isInternetReachable === false) {
      status = 'offline'; // Connected but no internet
    }

    // Determine connection type
    switch (state.type) {
      case NetInfoStateType.wifi:
        connectionType = 'wifi';
        break;
      case NetInfoStateType.cellular:
        connectionType = 'cellular';
        break;
      case NetInfoStateType.ethernet:
        connectionType = 'ethernet';
        break;
      case NetInfoStateType.bluetooth:
        connectionType = 'bluetooth';
        break;
      case NetInfoStateType.wimax:
        connectionType = 'wimax';
        break;
      case NetInfoStateType.vpn:
        connectionType = 'vpn';
        break;
      case NetInfoStateType.other:
        connectionType = 'other';
        break;
      default:
        connectionType = 'none';
    }

    return {
      status,
      connectionType,
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      details: {
        isConnectionExpensive: state.details?.isConnectionExpensive,
        cellularGeneration: state.details?.cellularGeneration,
        wifiEnabled: state.type === NetInfoStateType.wifi,
      },
    };
  }

  // Check if network state has changed
  private hasStateChanged(previous: NetworkState, current: NetworkState): boolean {
    return (
      previous.status !== current.status ||
      previous.connectionType !== current.connectionType ||
      previous.isConnected !== current.isConnected ||
      previous.isInternetReachable !== current.isInternetReachable
    );
  }

  // Notify all listeners of state change
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.getCurrentState());
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  // Handle connectivity changes (online/offline transitions)
  private handleConnectivityChange(previous: NetworkState, current: NetworkState): void {
    const wasOffline = previous.status === 'offline';
    const isNowOnline = current.status === 'online';

    if (wasOffline && isNowOnline) {
      // Came back online - trigger sync
      this.handleCameOnline();
    } else if (!wasOffline && !isNowOnline) {
      // Went offline
      this.handleWentOffline();
    }
  }

  // Handle coming back online
  private async handleCameOnline(): Promise<void> {
    console.log('Network: Came back online, starting sync...');

    try {
      // Start sync process
      const syncResult = await syncEngine.startSync();
      console.log('Network: Sync completed:', syncResult);
    } catch (error) {
      console.error('Network: Sync failed:', error);
    }
  }

  // Handle going offline
  private handleWentOffline(): void {
    console.log('Network: Went offline');

    // Stop any ongoing sync
    syncEngine.stopSync();

    // Could show offline notification to user
    // Could pause background tasks
  }

  // Manual network state check
  async checkNetworkState(): Promise<NetworkState> {
    try {
      const state = await NetInfo.fetch();
      this.handleNetworkChange(state);
      return this.getCurrentState();
    } catch (error) {
      console.error('Error checking network state:', error);
      return this.getCurrentState();
    }
  }

  // Get network quality assessment
  getNetworkQuality(): 'excellent' | 'good' | 'poor' | 'unusable' {
    const { connectionType, details } = this.currentState;

    if (!this.isOnline()) {
      return 'unusable';
    }

    if (connectionType === 'wifi' || connectionType === 'ethernet') {
      return 'excellent';
    }

    if (connectionType === 'cellular') {
      if (details.isConnectionExpensive) {
        return 'poor';
      }

      const generation = details.cellularGeneration;
      if (generation === '4g' || generation === '5g') {
        return 'good';
      } else if (generation === '3g') {
        return 'poor';
      } else {
        return 'unusable';
      }
    }

    return 'poor';
  }

  // Test internet connectivity
  async testConnectivity(): Promise<boolean> {
    try {
      // Simple connectivity test - in a real app, you might ping a reliable endpoint
      const state = await NetInfo.fetch();
      return state.isConnected === true && state.isInternetReachable === true;
    } catch {
      return false;
    }
  }

  // Get connection info for debugging
  getDebugInfo(): {
    currentState: NetworkState;
    isMonitoring: boolean;
    listenerCount: number;
    networkQuality: string;
  } {
    return {
      currentState: this.getCurrentState(),
      isMonitoring: this.isMonitoring,
      listenerCount: this.listeners.length,
      networkQuality: this.getNetworkQuality(),
    };
  }
}

// Export singleton instance
export const networkService = new NetworkService();