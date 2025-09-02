import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider } from 'react-redux';
import { store } from './src/store';
import MagicSample from './src/components/MagicSample';
import BiometricAuth from './src/components/BiometricAuth';
import PushNotification from './src/components/PushNotification';
import SMSParsing from './src/components/SMSParsing';
import DigitalLedger from './src/components/DigitalLedger';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Tab.Navigator>
          <Tab.Screen name="Home" component={MagicSample} />
          <Tab.Screen name="Auth" component={BiometricAuth} />
          <Tab.Screen name="Notifications" component={PushNotification} />
          <Tab.Screen name="SMS" component={SMSParsing} />
          <Tab.Screen name="Ledger" component={DigitalLedger} />
        </Tab.Navigator>
      </NavigationContainer>
    </Provider>
  );
}
