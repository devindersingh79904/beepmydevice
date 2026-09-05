/**
 * Root component.
 *
 * Provider order matters: ErrorProvider is outermost so failures raised while
 * restoring the session still have somewhere to render; DeviceProvider is
 * innermost because it depends on an authenticated user.
 */

import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {AuthProvider} from '@context/AuthContext';
import {DeviceProvider} from '@context/DeviceContext';
import {ErrorProvider} from '@context/ErrorContext';
import {useAuth} from '@hooks/useAuth';
import {useDeviceRegistration} from '@hooks/useDeviceRegistration';
import {usePushNotifications} from '@hooks/usePushNotifications';
import {RootNavigator} from '@/navigation/RootNavigator';
import {colors} from '@styles/theme';

/**
 * Runs the this-device concerns that need to sit inside the providers.
 *
 * A component rather than a call in App, because hooks cannot run above the
 * providers whose context they read.
 */
function DeviceSession(): React.JSX.Element {
  const {pushToken, isReady} = usePushNotifications();
  const {user} = useAuth();
  // Registration is per account: signing in as someone else must produce a
  // device row for them, not leave this phone attached to the previous session.
  useDeviceRegistration(pushToken, isReady, user?.user_id ?? null);
  return <RootNavigator />;
}

export default function App(): React.JSX.Element {
  return (
    // SafeAreaProvider wraps everything: every Screen reads its insets, and
    // without it they all render at zero.
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ErrorProvider>
        <AuthProvider>
          <DeviceProvider>
            <DeviceSession />
          </DeviceProvider>
        </AuthProvider>
      </ErrorProvider>
    </SafeAreaProvider>
  );
}
