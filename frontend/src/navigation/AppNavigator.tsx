/** Stack shown while signed in: dashboard, device detail, settings, profile. */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {DashboardScreen} from '@screens/AppStack/DashboardScreen';
import {DeviceDetailScreen} from '@screens/AppStack/DeviceDetailScreen';
import {ProfileScreen} from '@screens/AppStack/ProfileScreen';
import {SettingsScreen} from '@screens/AppStack/SettingsScreen';

export type AppStackParamList = {
  Dashboard: undefined;
  DeviceDetail: {deviceId: string};
  Settings: undefined;
  Profile: undefined;
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
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
