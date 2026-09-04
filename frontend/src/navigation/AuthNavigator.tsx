/**
 * Stack shown while signed out: splash, login, register.
 *
 * The privacy policy is here as well as on the app stack. The register form
 * asks the user to agree to it, and somebody being asked to agree to a
 * document has to be able to read it -- at which point they have no account,
 * so the copy behind the gate is unreachable.
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {PrivacyPolicyScreen} from '@screens/AppStack/PrivacyPolicyScreen';
import {ForgotPasswordScreen} from '@screens/AuthStack/ForgotPasswordScreen';
import {LoginScreen} from '@screens/AuthStack/LoginScreen';
import {RegisterScreen} from '@screens/AuthStack/RegisterScreen';
import {SplashScreen} from '@screens/AuthStack/SplashScreen';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  PrivacyPolicy: undefined;
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
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  );
}
