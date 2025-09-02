import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function PushNotification() {
  const [expoPushToken, setExpoPushToken] = useState('');

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token || ''));

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  const sendNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Liquidity Alert",
        body: 'Your e-float is low! Consider rebalancing.',
        data: { data: 'goes here' },
      },
      trigger: { seconds: 2 },
    });
  };

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black p-4">
      <Text className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        Push Notifications
      </Text>
      <TouchableOpacity
        onPress={sendNotification}
        className="px-6 py-3 bg-green-500 rounded-lg mb-4"
      >
        <Text className="text-white font-semibold">Send Test Notification</Text>
      </TouchableOpacity>
      <Text className="text-sm text-gray-600 dark:text-gray-400">
        Token: {expoPushToken}
      </Text>
    </View>
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