import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, FlatList, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as Notifications from 'expo-notifications';
import { RootState } from '../store';
import {
  addNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  Notification
} from '../store/slices/notificationSlice';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function PushNotification() {
  const dispatch = useDispatch();
  const { notifications, unreadCount, isLoading } = useSelector((state: RootState) => state.notifications);
  const [expoPushToken, setExpoPushToken] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<string>('');

  useEffect(() => {
    registerForPushNotificationsAsync();

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      handleIncomingNotification(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      handleNotificationResponse(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  const registerForPushNotificationsAsync = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus);

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Push notifications are required for important alerts. Please enable them in settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      setExpoPushToken(token);
      console.log('Push token:', token);
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      setPermissionStatus('error');
    }
  };

  const handleIncomingNotification = (notification: Notifications.Notification) => {
    const notificationData: Notification = {
      id: notification.request.identifier,
      title: notification.request.content.title || 'Notification',
      body: notification.request.content.body || '',
      type: notification.request.content.data?.type || 'general',
      timestamp: Date.now(),
      isRead: false,
      data: notification.request.content.data,
    };

    dispatch(addNotification(notificationData));
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const notificationId = response.notification.request.identifier;
    dispatch(markAsRead(notificationId));

    // Handle deep linking based on notification type
    const data = response.notification.request.content.data;
    if (data?.action === 'liquidity_alert') {
      // Navigate to ledger or relevant screen
      Alert.alert('Liquidity Alert', 'Opening transaction ledger...');
    } else if (data?.action === 'suspicious_activity') {
      Alert.alert('Security Alert', 'Please review recent transactions');
    }
  };

  const sendTestNotification = async (type: 'liquidity' | 'suspicious' | 'general' = 'general') => {
    let title = 'Test Notification';
    let body = 'This is a test notification';
    let data: any = { type };

    switch (type) {
      case 'liquidity':
        title = 'Liquidity Alert';
        body = 'Your e-float balance is low. Consider rebalancing your funds.';
        data = { ...data, action: 'liquidity_alert', threshold: 100 };
        break;
      case 'suspicious':
        title = 'Security Alert';
        body = 'Suspicious activity detected on your account. Please review.';
        data = { ...data, action: 'suspicious_activity', severity: 'high' };
        break;
      default:
        body = 'This is a general notification for testing purposes.';
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: { seconds: 1 },
      });

      Alert.alert('Success', 'Test notification scheduled');
    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert('Error', 'Failed to send notification');
    }
  };

  const sendMockBackendNotification = () => {
    // Simulate receiving a notification from backend
    const mockNotification: Notification = {
      id: `mock_${Date.now()}`,
      title: 'Backend Alert',
      body: 'This notification simulates one received from the backend service.',
      type: 'general',
      timestamp: Date.now(),
      isRead: false,
      data: { source: 'backend', priority: 'normal' },
    };

    dispatch(addNotification(mockNotification));
    Alert.alert('Mock Notification', 'Backend notification added to history');
  };

  const markNotificationAsRead = (id: string) => {
    dispatch(markAsRead(id));
  };

  const deleteNotificationItem = (id: string) => {
    dispatch(deleteNotification(id));
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <View className={`p-3 border-b border-gray-200 rounded-lg mb-2 ${
      item.isRead ? 'bg-gray-50 dark:bg-gray-800' : 'bg-blue-50 dark:bg-gray-700'
    }`}>
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className={`font-semibold text-lg ${
            item.isRead ? 'text-gray-800 dark:text-gray-200' : 'text-blue-800 dark:text-blue-200'
          }`}>
            {item.title}
          </Text>
          <Text className={`text-sm mt-1 ${
            item.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-blue-700 dark:text-blue-300'
          }`}>
            {item.body}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {new Date(item.timestamp).toLocaleString()}
          </Text>
          <Text className="text-xs text-gray-400 dark:text-gray-600 mt-1">
            Type: {item.type}
          </Text>
        </View>
        <View className="flex-row ml-2">
          {!item.isRead && (
            <TouchableOpacity
              onPress={() => markNotificationAsRead(item.id)}
              className="px-2 py-1 bg-green-500 rounded mr-1"
            >
              <Text className="text-white text-xs">Mark Read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => deleteNotificationItem(item.id)}
            className="px-2 py-1 bg-red-500 rounded"
          >
            <Text className="text-white text-xs">Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black p-4">
      <Text className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        Push Notifications
      </Text>

      {/* Status Information */}
      <View className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-4">
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Notification Status
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          Permission: {permissionStatus}
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          Unread: {unreadCount}
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          Total: {notifications.length}
        </Text>
        {expoPushToken && (
          <Text className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Token: {expoPushToken.substring(0, 20)}...
          </Text>
        )}
      </View>

      {/* Test Notification Buttons */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Send Test Notifications
        </Text>
        <View className="flex-row flex-wrap">
          <TouchableOpacity
            onPress={() => sendTestNotification('general')}
            className="px-3 py-2 bg-blue-500 rounded mr-2 mb-2"
          >
            <Text className="text-white text-sm">General</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => sendTestNotification('liquidity')}
            className="px-3 py-2 bg-orange-500 rounded mr-2 mb-2"
          >
            <Text className="text-white text-sm">Liquidity Alert</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => sendTestNotification('suspicious')}
            className="px-3 py-2 bg-red-500 rounded mr-2 mb-2"
          >
            <Text className="text-white text-sm">Security Alert</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mock Backend Button */}
      <TouchableOpacity
        onPress={sendMockBackendNotification}
        className="px-6 py-3 bg-purple-500 rounded-lg mb-4"
      >
        <Text className="text-white font-semibold text-center">
          Simulate Backend Notification
        </Text>
      </TouchableOpacity>

      {/* Bulk Actions */}
      {notifications.length > 0 && (
        <View className="flex-row justify-between mb-4">
          <TouchableOpacity
            onPress={() => dispatch(markAllAsRead())}
            className="px-4 py-2 bg-green-500 rounded"
          >
            <Text className="text-white text-sm">Mark All Read</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => dispatch(clearAllNotifications())}
            className="px-4 py-2 bg-red-500 rounded"
          >
            <Text className="text-white text-sm">Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notification History */}
      <Text className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
        Notification History ({notifications.length})
      </Text>

      {notifications.length === 0 ? (
        <View className="p-8 items-center">
          <Text className="text-gray-500 dark:text-gray-400 text-center">
            No notifications yet. Send a test notification to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationItem}
          className="flex-1"
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Business Logic Info */}
      <View className="mt-4 p-3 bg-yellow-50 dark:bg-gray-800 rounded-lg">
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Business Logic Features:
        </Text>
        <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">
          • Liquidity alerts when e-float balance is low
        </Text>
        <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">
          • Suspicious activity detection and alerts
        </Text>
        <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">
          • Deep linking to relevant app sections
        </Text>
        <Text className="text-xs text-gray-600 dark:text-gray-400">
          • Notification history with read/unread status
        </Text>
      </View>
    </ScrollView>
  );
}

async function registerForPushNotificationsAsync() {
  let token;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    Alert.alert('Failed to get push token for push notification!');
    return;
  }
  token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log(token);

  return token;
}