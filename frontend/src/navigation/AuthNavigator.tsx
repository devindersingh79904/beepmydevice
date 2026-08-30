/** Stack shown while signed out: splash, login, register. */

import React from 'react';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
};

export function AuthNavigator(): React.JSX.Element {
  throw new Error('Not implemented');
}
