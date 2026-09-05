/** Stack shown while signed in: dashboard, device detail, settings, profile. */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {DashboardScreen} from '@screens/AppStack/DashboardScreen';
import {DeviceDetailScreen} from '@screens/AppStack/DeviceDetailScreen';
import {NotificationSettingsScreen} from '@screens/AppStack/NotificationSettingsScreen';
import {PrivacyPolicyScreen} from '@screens/AppStack/PrivacyPolicyScreen';
import {ProfileScreen} from '@screens/AppStack/ProfileScreen';
import {SettingsScreen} from '@screens/AppStack/SettingsScreen';

export type AppStackParamList = {
  Dashboard: undefined;
  DeviceDetail: {deviceId: string};
  Settings: undefined;
  NotificationSettings: undefined;
  Profile: undefined;
  PrivacyPolicy: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  );
}
