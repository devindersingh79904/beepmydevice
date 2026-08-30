/**
 * Root component.
 *
 * Provider order matters: ErrorProvider is outermost so failures raised while
 * restoring the session still have somewhere to render; DeviceProvider is
 * innermost because it depends on an authenticated user.
 */

import React from 'react';

export default function App(): React.JSX.Element {
  throw new Error('Not implemented');
}
