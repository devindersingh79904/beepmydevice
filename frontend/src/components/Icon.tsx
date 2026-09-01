/**
 * The app's only icon entry point.
 *
 * Screens name an icon from `IconName`; they never import an icon set. That
 * keeps the glyph vocabulary closed -- adding an icon is a deliberate edit
 * here -- and lets the one icon that is not in Feather ("vibrate") come from
 * another set without leaking that detail into a screen.
 */

import React from 'react';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {colors, sizes} from '@styles/theme';

/** Every glyph the design canvas uses. */
export type IconName =
  | 'wifi'
  | 'smartphone'
  | 'monitor'
  | 'battery'
  | 'lock'
  | 'user-plus'
  | 'bell'
  | 'volume-2'
  | 'vibrate'
  | 'chevron-left'
  | 'chevron-right'
  | 'help-circle'
  | 'check'
  | 'x'
  | 'info'
  | 'trash-2'
  | 'eye'
  | 'eye-off';

interface IconProps {
  name: IconName;
  /** Defaults to the 18pt row icon. */
  size?: number;
  /** Defaults to the primary ink colour. */
  color?: string;
}

export function Icon({name, size, color}: IconProps): React.JSX.Element {
  const resolvedSize = size ?? sizes.iconSm;
  const resolvedColor = color ?? colors.textPrimary;

  if (name === 'vibrate') {
    return (
      <MaterialCommunityIcons
        name="vibrate"
        size={resolvedSize}
        color={resolvedColor}
      />
    );
  }

  return <Feather name={name} size={resolvedSize} color={resolvedColor} />;
}
