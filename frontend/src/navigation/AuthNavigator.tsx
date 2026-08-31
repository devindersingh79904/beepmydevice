/** Stack shown while signed out: splash, login, register. */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {ForgotPasswordScreen} from '@screens/AuthStack/ForgotPasswordScreen';
import {LoginScreen} from '@screens/AuthStack/LoginScreen';
import {RegisterScreen} from '@screens/AuthStack/RegisterScreen';
import {SplashScreen} from '@screens/AuthStack/SplashScreen';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
