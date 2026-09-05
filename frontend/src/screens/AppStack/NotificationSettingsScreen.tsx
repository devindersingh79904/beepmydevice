/**
 * Alert behaviour: whether an alert stays audible on a silenced phone.
 *
 * A screen of its own, and a Save button rather than the live toggles used
 * elsewhere in Settings, because this one setting is not like the others. The
 * server reads it to choose which Android notification channel an alert is
 * posted to, and that choice is what decides whether a phone face-down on
 * silent makes any sound at all. Both facts are worth a sentence of
 * explanation and a deliberate confirmation, which a row that saves itself
 * the instant a finger brushes it does not give.
 */

import React, {useEffect, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {
  Button,
  Checkbox,
  ErrorAlert,
  Screen,
  ScreenHeader,
  SettingsRow,
  SettingsSectionHeader,
  Toast,
} from '@components/index';
import {useErrors} from '@hooks/useErrors';
import {usePreferences} from '@hooks/usePreferences';
import {useToast} from '@hooks/useToast';
import {borderWidth, colors, spacing, typography} from '@styles/theme';

export function NotificationSettingsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const {preferences, isLoading, setPreference} = usePreferences();
  const {errors, clearErrors} = useErrors();
  const {toast, showToast, dismissToast} = useToast();

  const [alertOnSilent, setAlertOnSilent] = useState(
    preferences.alert_on_silent,
  );
  const [isDirty, setDirty] = useState(false);
  const [isSaving, setSaving] = useState(false);

  // The stored value arrives after the first render, so the local copy has to
  // adopt it -- but only while the user has not touched the box, or the load
  // would undo an edit made in the meantime.
  useEffect(() => {
    if (!isDirty) {
      setAlertOnSilent(preferences.alert_on_silent);
    }
  }, [preferences.alert_on_silent, isDirty]);

  const onToggle = (value: boolean): void => {
    setAlertOnSilent(value);
    setDirty(true);
  };

  const onSave = async (): Promise<void> => {
    setSaving(true);
    try {
      await setPreference('alert_on_silent', alertOnSilent);
      setDirty(false);
      showToast('success', 'Saved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Notifications" onBack={navigation.goBack} />
      <View style={styles.body}>
        <ErrorAlert errors={errors} onDismiss={clearErrors} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <SettingsSectionHeader>ALERT BEHAVIOR</SettingsSectionHeader>
          <SettingsRow
            label="Alert even on silent mode"
            subLabel="Play alert sound even if device is muted"
            onPress={() => onToggle(!alertOnSilent)}
            accessory={
              <Checkbox
                checked={alertOnSilent}
                onChange={onToggle}
                accessibilityLabel="Alert even on silent mode"
              />
            }
          />

          {alertOnSilent ? (
            <View style={styles.info}>
              <Text style={styles.infoText}>
                When enabled, alerts will play even if your device is on silent
                mode.
              </Text>
            </View>
          ) : null}

          <View style={styles.save}>
            <Button
              label={isSaving ? 'Saving…' : 'Save'}
              variant="primary"
              onPress={() => void onSave()}
              disabled={!isDirty || isSaving || isLoading}
            />
          </View>
        </ScrollView>
        <Toast toast={toast} onDismiss={dismissToast} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {flex: 1},
  scroll: {flexGrow: 1},
  info: {
    marginHorizontal: spacing.s16,
    marginTop: spacing.s16,
    padding: spacing.s12,
    backgroundColor: colors.accent100,
    borderLeftWidth: borderWidth.accentBar,
    borderLeftColor: colors.primary,
  },
  infoText: {...typography.body, color: colors.accent900},
  save: {
    marginTop: 'auto',
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s16,
  },
});
