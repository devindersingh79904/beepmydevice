/**
 * The privacy policy — screen 09 on the canvas.
 *
 * Reachable from two places, which is why it is registered on both stacks: the
 * Settings row while signed in, and the "I agree to the Privacy policy" link on
 * the register form while signed out. Somebody being asked to agree to a
 * document has to be able to read it first, and at that moment they have no
 * account.
 *
 * The layout is the canvas's: a back bar, the date, a 2pt rule, then sections
 * separated by hairlines, with the collect/use lists set as ticked rows rather
 * than bullets. What is *said* deviates from the canvas in four places, all of
 * them cases where the mock states something this product does not do. Those
 * are marked inline. A privacy policy that describes a different system is not
 * a design decision to honour — it is a defect to report, and reporting it is
 * why the corrected sentence is here rather than the drawn one.
 *
 * The same document is served on the web dashboard from
 * `web/src/pages/PrivacyPage.tsx`. The two must agree.
 */

import React from 'react';
import {useNavigation} from '@react-navigation/native';
import {Linking, ScrollView, StyleSheet, Text, View} from 'react-native';

import {Icon, Rule, Screen, ScreenHeader} from '@components/index';
import {borderWidth, colors, sizes, spacing, typography} from '@styles/theme';
import {APP_VERSION, LEGAL} from '@utils/constants';
import {formatLongDate} from '@utils/helpers';

/** A section heading. Same weight as a screen title, per the canvas. */
function Heading({children}: {children: string}): React.JSX.Element {
  return <Text style={styles.heading}>{children}</Text>;
}

/**
 * One ticked line in the collect/use lists.
 *
 * The tick is an icon rather than a "✓" character: the canvas draws a glyph,
 * but a literal tick in a `Text` renders at whatever the platform's emoji font
 * decides, and on Android that is a different weight from the rest of the line.
 */
function Point({children}: {children: string}): React.JSX.Element {
  return (
    <View style={styles.point}>
      <Icon name="check" size={sizes.iconXs} color={colors.primaryDarker} />
      <Text style={styles.pointText}>{children}</Text>
    </View>
  );
}

function Divider(): React.JSX.Element {
  return <View style={styles.divider} />;
}

export function PrivacyPolicyScreen(): React.JSX.Element {
  const navigation = useNavigation();

  const writeToUs = (): void => {
    void Linking.openURL(`mailto:${LEGAL.PRIVACY_EMAIL}`);
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Privacy policy" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>
          Last updated: {formatLongDate(LEGAL.LAST_UPDATED)}
        </Text>
        <Rule />

        <Text style={styles.prose}>
          BeepMyDevice helps you find and alert your devices on your own WiFi
          network. We built it to work with as little of your data as possible —
          this page explains exactly what we collect and why.
        </Text>

        <Heading>Information we collect</Heading>
        <View style={styles.points}>
          {/* The canvas says "email and display name". There is no display
              name: the API has no profile endpoint and login returns an id, a
              token and an expiry. Claiming to collect it would be inventing a
              collection that does not happen. */}
          <Point>Your account email address</Point>
          <Point>Device names, types and battery level you register</Point>
          {/* The canvas says "WiFi network name (SSID)". The app reads the
              router's MAC address (BSSID), not the SSID -- that MAC is the
              whole trust boundary, and naming the wrong field in a privacy
              policy misstates what is actually held. */}
          <Point>
            Your router&apos;s MAC address — only to match devices on the same
            network
          </Point>
          <Point>
            Push notification tokens, so an alert can reach a device
          </Point>
          <Point>Alert history (timestamps and delivery status)</Point>
        </View>

        <Divider />
        <Heading>How we use information</Heading>
        <View style={styles.points}>
          <Point>To deliver beep and vibration alerts to your devices</Point>
          <Point>To show device status (online, battery, last seen)</Point>
          <Point>To keep your account secure</Point>
          <Point>We never sell your data or use it for advertising</Point>
        </View>

        <Divider />
        <Heading>Data security</Heading>
        <Text style={styles.prose}>
          All traffic between your devices and our servers is encrypted in
          transit, and passwords are stored only as a bcrypt hash.
        </Text>
        {/* The canvas says "Alert commands stay on your local network whenever
            possible". They never do. Alerts are relayed out through Apple and
            Google push; there is no hub in the home, and WiFi is an identity
            check rather than a transport. */}
        <Text style={styles.prose}>
          Alerts are delivered through Apple and Google&apos;s push services,
          not over your local network. Sharing a WiFi network is how we check
          that two devices belong together — it is never how the alert travels.
        </Text>

        <Divider />
        <Heading>Data retention</Heading>
        <Text style={styles.prose}>
          Account data is kept until you delete your account. Alert and device
          activity is kept for {LEGAL.ACTIVITY_RETENTION_DAYS} days. Push tokens
          are kept while the app is installed.
        </Text>

        <Divider />
        <Heading>Third-party services</Heading>
        <Text style={styles.prose}>
          Firebase Cloud Messaging (Android) and the Apple Push Notification
          service (iOS) carry our alerts. They receive a notification token and
          the alert itself — no email address, no password, and nothing about
          your network.
        </Text>

        <Divider />
        <Heading>Your rights</Heading>
        <Text style={styles.prose}>
          You can access, correct, export or delete your data, and turn
          notifications off at any time. Notifications are yours to control in
          Settings.
        </Text>
        {/* Deliberately not the canvas's "delete your account ... from
            Settings": there is no endpoint behind that, and the control is
            drawn disabled. Saying so is better than promising a button that
            does nothing. */}
        <Text style={styles.prose}>
          Access, export and account deletion have no button yet — write to us
          and we will carry them out.
        </Text>

        <Divider />
        <Heading>Children&apos;s privacy</Heading>
        <Text style={styles.prose}>
          BeepMyDevice is not intended for children under {LEGAL.MINIMUM_AGE},
          and we do not knowingly collect their data. If we discover that we
          have, we delete it immediately.
        </Text>

        <Divider />
        <Heading>Changes to this policy</Heading>
        <Text style={styles.prose}>
          We may update this policy from time to time. Material changes are
          marked by the date at the top of this page.
        </Text>

        <Divider />
        <Heading>Contact us</Heading>
        <Text style={styles.prose}>
          Questions about this policy? Write to{' '}
          <Text
            accessibilityRole="link"
            style={styles.link}
            onPress={writeToUs}>
            {LEGAL.PRIVACY_EMAIL}
          </Text>
          .
        </Text>

        <Text style={styles.version}>v{APP_VERSION}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.s16,
    paddingTop: spacing.s16,
    paddingBottom: spacing.s24,
    gap: spacing.s8,
  },
  updated: {...typography.caption, color: colors.textSecondary},
  prose: {...typography.prose, color: colors.textPrimary},
  heading: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginTop: spacing.s8,
  },
  points: {gap: spacing.s8},
  point: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s10},
  pointText: {...typography.prose, color: colors.textPrimary, flex: 1},
  // A hairline between sections within the document; the 2pt `Rule` under the
  // date is the one that separates the heading block from the body.
  divider: {
    height: borderWidth.hairline,
    backgroundColor: colors.neutral300,
    marginTop: spacing.s12,
    marginBottom: spacing.s4,
  },
  link: {...typography.prose, color: colors.primaryDarker},
  version: {
    ...typography.caption,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingTop: spacing.s24,
  },
});
