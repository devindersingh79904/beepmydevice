/**
 * The BeepMyDevice brand mark, in its tile.
 *
 * A raster asset rather than drawn geometry: the mark is three concentric arcs
 * that fade through the accent ramp, which View borders cannot express without
 * a pile of rotated half-circles, and it is a fixed brand asset that should not
 * drift when someone edits a style. Exported at 1x/2x/3x from the design
 * canvas, so no density upscales.
 *
 * Both variants sit the mark on the light ground it was drawn against; the
 * splash puts that tile on the accent, and the auth screens outline it instead.
 */

import React from 'react';
import {Image, StyleSheet, View} from 'react-native';

import {borderWidth, colors, radius, sizes} from '@styles/theme';

// Metro picks the @2x/@3x variant for the device automatically.
import MARK from '../../assets/images/logo.png';

interface LogoProps {
  /**
   * `splash` is the large tile on the accent background; `auth` is the small
   * outlined tile above the sign-in and sign-up forms.
   */
  variant?: 'splash' | 'auth';
}

export function Logo({variant = 'splash'}: LogoProps): React.JSX.Element {
  const isSplash = variant === 'splash';
  const tile = isSplash ? sizes.splashLogo : sizes.authLogo;
  const mark = isSplash ? sizes.splashLogoIcon : sizes.authLogoIcon;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="BeepMyDevice"
      style={[
        styles.tile,
        {width: tile, height: tile},
        isSplash ? null : styles.outlined,
      ]}>
      <Image
        source={MARK}
        style={{width: mark, height: mark}}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    // The mark was exported on this exact colour, so the tile and the artwork
    // share one ground and no edge shows between them.
    backgroundColor: colors.background,
    borderRadius: radius.none,
  },
  outlined: {
    borderWidth: borderWidth.rule,
    borderColor: colors.textPrimary,
  },
});
