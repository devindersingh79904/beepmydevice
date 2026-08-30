/**
 * Top-level navigator.
 *
 * Switches between the auth and app stacks on `isAuthenticated`. Swapping
 * whole stacks rather than pushing a login screen means a logout cannot leave
 * authenticated screens on the back stack.
 */

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';

import {SplashScreen} from '@screens/AuthStack/SplashScreen';
import {useAuth} from '@hooks/useAuth';

import {AppNavigator} from './AppNavigator';
import {AuthNavigator} from './AuthNavigator';

export function RootNavigator(): React.JSX.Element {
  const {isAuthenticated, isLoading} = useAuth();

  // The splash stays up while the persisted session is restored, so a signed-in
  // user never sees the login screen flash past.
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
