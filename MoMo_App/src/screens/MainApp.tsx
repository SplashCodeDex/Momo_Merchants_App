import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MagicSample from '../components/MagicSample';
import BiometricAuth from '../components/BiometricAuth';
import PushNotification from '../components/PushNotification';
import SMSParsing from '../components/SMSParsing';
import DigitalLedger from '../components/DigitalLedger';
import { AnimatedComponentsDemo } from '../components/AnimatedComponentsDemo';

const Tab = createBottomTabNavigator();

export default function MainApp() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={MagicSample} />
      <Tab.Screen name="Animations" component={AnimatedComponentsDemo} />
      <Tab.Screen name="Auth" component={BiometricAuth} />
      <Tab.Screen name="Notifications" component={PushNotification} />
      <Tab.Screen name="SMS" component={SMSParsing} />
      <Tab.Screen name="Ledger" component={DigitalLedger} />
    </Tab.Navigator>
  );
}