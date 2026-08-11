import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FIELD_BASE_CLASSNAME, useStableTextStyle } from '@/components/field-config';
import { PasswordField } from '@/components/password-field';
import { PickerList } from '@/components/picker-list';
import { UserGuide } from '@/components/user-guide';
import { usePalette } from '@/hooks/use-palette';
import { PASSWORD_HINT, validatePassword } from '@/lib/password';
import { supabase } from '@/lib/supabase';
import { useThemePreference, type ThemePreference } from '@/store/use-theme-preference';

const APP_VERSION = '1.0.0';

type Profile = {
  email: string;
  name: string;
  employeeId: string;
  role: string | null;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: Profile };

/** Feedback banner shown under a section after an action resolves. */
type Feedback = { tone: 'error' | 'success'; message: string } | null;

export default function SettingsScreen() {
  const router = useRouter();
  const palette = usePalette();
  const stableTextStyle = useStableTextStyle();

  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<Feedback>(null);

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);

  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      // getUser() hits the auth server rather than reading cached session
      // storage, so the metadata shown here reflects what is actually stored.
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        setState({ status: 'error', message: error.message });
        return;
      }
      if (!data.user) {
        setState({ status: 'error', message: 'No signed-in user.' });
        return;
      }

      // `role` is the key signup.tsx writes via options.data.
      const metadata = data.user.user_metadata ?? {};
      const profile: Profile = {
        email: data.user.email ?? '(no email on account)',
        name: typeof metadata.name === 'string' ? metadata.name : '',
        employeeId: typeof metadata.employeeId === 'string' ? metadata.employeeId : '',
        role: typeof metadata.role === 'string' ? metadata.role : null,
      };

      setName(profile.name);
      setEmployeeId(profile.employeeId);
      setState({ status: 'ready', profile });
    } catch (caught) {
      // Auth calls reject on transport failure rather than returning an error.
      setState({
        status: 'error',
        message:
          caught instanceof Error
            ? `Could not reach Supabase: ${caught.message}`
            : 'Could not reach Supabase.',
      });
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleSaveProfile() {
    setProfileFeedback(null);
    setSavingProfile(true);
    try {
      // Merged into existing metadata by re-sending role: updateUser replaces
      // the whole `data` object, so omitting role here would erase it.
      const { data, error } = await supabase.auth.updateUser({
        data: {
          name: name.trim(),
          employeeId: employeeId.trim(),
          role: state.status === 'ready' ? state.profile.role : null,
        },
      });

      if (error) {
        setProfileFeedback({ tone: 'error', message: error.message });
        return;
      }

      const metadata = data.user?.user_metadata ?? {};
      setState((prev) =>
        prev.status === 'ready'
          ? {
              status: 'ready',
              profile: {
                ...prev.profile,
                name: typeof metadata.name === 'string' ? metadata.name : name.trim(),
                employeeId:
                  typeof metadata.employeeId === 'string'
                    ? metadata.employeeId
                    : employeeId.trim(),
              },
            }
          : prev,
      );
      setProfileFeedback({ tone: 'success', message: 'Profile saved.' });
    } catch (caught) {
      setProfileFeedback({
        tone: 'error',
        message:
          caught instanceof Error
            ? `Could not reach Supabase: ${caught.message}`
            : 'Could not reach Supabase.',
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    setPasswordFeedback(null);

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ tone: 'error', message: 'Passwords do not match.' });
      return;
    }
    const problem = validatePassword(newPassword);
    if (problem) {
      setPasswordFeedback({ tone: 'error', message: problem });
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordFeedback({ tone: 'error', message: error.message });
        return;
      }
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      setPasswordFeedback({ tone: 'success', message: 'Password updated.' });
    } catch (caught) {
      setPasswordFeedback({
        tone: 'error',
        message:
          caught instanceof Error
            ? `Could not reach Supabase: ${caught.message}`
            : 'Could not reach Supabase.',
      });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSignOut() {
    setSignOutError(null);
    setSigningOut(true);
    try {
      // scope: 'local' signs out this device only. The default is global, which
      // would end the user's sessions everywhere - surprising for a shared
      // warehouse device where someone else may be signed in elsewhere.
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        setSignOutError(error.message);
        return;
      }
      // replace, not push: the tabs must not stay on the back stack.
      router.replace('/signin');
    } catch (caught) {
      setSignOutError(
        caught instanceof Error
          ? `Could not reach Supabase: ${caught.message}`
          : 'Could not reach Supabase.',
      );
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusBar style="auto" />

      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-6 pb-10 pt-6"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text className="text-3xl font-bold text-slate-900 dark:text-slate-100">Settings</Text>
            <Text className="mt-1 text-base text-slate-500 dark:text-slate-400">
              Your account and app preferences
            </Text>

            {state.status === 'loading' ? (
              <View className="mt-10 items-center">
                <ActivityIndicator color={palette.strong} />
                <Text className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  Loading account…
                </Text>
              </View>
            ) : state.status === 'error' ? (
              <View className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
                <Text className="text-sm font-semibold text-red-800 dark:text-red-300">
                  Could not load your account
                </Text>
                <Text className="mt-1 text-sm leading-5 text-red-700 dark:text-red-400">
                  {state.message}
                </Text>
                <Pressable
                  onPress={loadProfile}
                  accessibilityRole="button"
                  className="mt-3 h-10 items-center justify-center rounded-xl bg-red-600 active:opacity-90">
                  <Text className="text-sm font-semibold text-white">Try again</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <SectionCard title="Account">
                  <View>
                    <Text className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Email
                    </Text>
                    <View className="mt-1 flex-row items-center justify-between">
                      <Text className="flex-1 text-base text-slate-900 dark:text-slate-100">
                        {state.profile.email}
                      </Text>
                      <RoleBadge role={state.profile.role} />
                    </View>
                  </View>

                  <View className="mt-5">
                    <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Name
                    </Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      editable={!savingProfile}
                      placeholder="e.g. Ama Mensah"
                      placeholderTextColor={palette.muted}
                      autoCapitalize="words"
                      autoComplete="name"
                      returnKeyType="next"
                      className={`${FIELD_BASE_CLASSNAME} px-4`}
                      style={stableTextStyle}
                    />
                  </View>

                  <View className="mt-4">
                    <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Employee ID
                    </Text>
                    <TextInput
                      value={employeeId}
                      onChangeText={setEmployeeId}
                      editable={!savingProfile}
                      placeholder="e.g. WP-1042"
                      placeholderTextColor={palette.muted}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleSaveProfile}
                      className={`${FIELD_BASE_CLASSNAME} px-4`}
                      style={stableTextStyle}
                    />
                  </View>

                  <FeedbackBanner feedback={profileFeedback} />

                  <Pressable
                    onPress={handleSaveProfile}
                    disabled={savingProfile}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: savingProfile }}
                    className={`mt-4 h-12 flex-row items-center justify-center rounded-xl ${
                      savingProfile
                        ? 'bg-slate-400 dark:bg-slate-700'
                        : 'bg-slate-900 active:opacity-90 dark:bg-orange-500'
                    }`}>
                    {savingProfile ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text className="text-base font-semibold text-white">Save</Text>
                    )}
                  </Pressable>
                </SectionCard>

                <SectionCard title="Security">
                  <Pressable
                    onPress={() => {
                      setShowPasswordSection((open) => !open);
                      setPasswordFeedback(null);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showPasswordSection }}
                    className="flex-row items-center justify-between py-1">
                    <View className="flex-row items-center gap-3">
                      <MaterialCommunityIcons name="lock-outline" size={20} color={palette.meta} />
                      <Text className="text-base text-slate-900 dark:text-slate-100">
                        Change password
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name={showPasswordSection ? 'chevron-up' : 'chevron-down'}
                      size={22}
                      color={palette.muted}
                    />
                  </Pressable>

                  {showPasswordSection ? (
                    <View className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <View>
                        <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                          New password
                        </Text>
                        <PasswordField
                          value={newPassword}
                          onChangeText={setNewPassword}
                          editable={!savingPassword}
                          placeholder="Enter new password"
                          placeholderTextColor={palette.muted}
                          autoComplete="new-password"
                          textContentType="newPassword"
                          returnKeyType="next"
                        />
                        <Text className="mt-1.5 text-xs leading-4 text-slate-500 dark:text-slate-400">
                          {PASSWORD_HINT}
                        </Text>
                      </View>

                      <View className="mt-4">
                        <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                          Confirm new password
                        </Text>
                        <PasswordField
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          editable={!savingPassword}
                          placeholder="Re-enter new password"
                          placeholderTextColor={palette.muted}
                          autoComplete="new-password"
                          textContentType="newPassword"
                          returnKeyType="done"
                          onSubmitEditing={handleChangePassword}
                        />
                      </View>

                      <Pressable
                        onPress={handleChangePassword}
                        disabled={savingPassword}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: savingPassword }}
                        className={`mt-4 h-12 flex-row items-center justify-center rounded-xl ${
                          savingPassword
                            ? 'bg-slate-400 dark:bg-slate-700'
                            : 'bg-slate-900 active:opacity-90 dark:bg-orange-500'
                        }`}>
                        {savingPassword ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <Text className="text-base font-semibold text-white">
                            Update password
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  ) : null}

                  <FeedbackBanner feedback={passwordFeedback} />
                </SectionCard>

                {/* Above the role-gated sections, so both roles find it in the
                    same place regardless of which of those two they get. */}
                <SectionCard title="Appearance">
                  <AppearancePicker />
                </SectionCard>

                {/* Admin only. Gated on the profile already loaded above rather
                    than a second session read, so the section cannot disagree
                    with the role badge shown in Account. */}
                {state.profile.role === 'admin' ? (
                  <SectionCard title="Team">
                    <PickerList />
                  </SectionCard>
                ) : null}

                {/* Pickers only - the guide covers the picking flow, which is not
                    what an admin uses this app for. Same role source as Team
                    above, so the two cannot disagree. */}
                {state.profile.role === 'admin' ? null : (
                  <SectionCard title="How to use WarehousePro">
                    <UserGuide />
                  </SectionCard>
                )}

                <SectionCard title="About">
                  <InfoRow icon="information-outline" label="App version" hint={APP_VERSION} />
                </SectionCard>

                {signOutError ? (
                  <View className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
                    <Text className="text-sm leading-5 text-red-700 dark:text-red-400">
                      {signOutError}
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={handleSignOut}
                  disabled={signingOut}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: signingOut }}
                  className={`mt-6 h-12 flex-row items-center justify-center gap-2 rounded-xl border ${
                    signingOut
                      ? 'border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900'
                      : 'border-red-200 bg-white active:opacity-90 dark:border-red-500/30 dark:bg-slate-900'
                  }`}>
                  {signingOut ? (
                    <ActivityIndicator color={palette.danger} size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="logout" size={18} color={palette.danger} />
                      <Text className="text-base font-semibold text-red-600 dark:text-red-400">
                        Sign out
                      </Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-6">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </Text>
      <View className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        {children}
      </View>
    </View>
  );
}

/** Label and caption for each choice. Order is the order shown. */
const APPEARANCE_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/**
 * Three-way appearance control.
 *
 * Tri-state rather than a Dark switch so "follow the device" stays reachable -
 * a boolean would force a permanent choice and lose the automatic day/night
 * behaviour the app ships with today.
 */
function AppearancePicker() {
  const preference = useThemePreference((state) => state.preference);
  const setPreference = useThemePreference((state) => state.setPreference);

  return (
    <View>
      <View className="flex-row rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {APPEARANCE_OPTIONS.map((option) => {
          const selected = option.value === preference;
          return (
            <Pressable
              key={option.value}
              onPress={() => setPreference(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.label} appearance`}
              className={`h-9 flex-1 items-center justify-center rounded-lg ${
                selected ? 'bg-slate-900 dark:bg-orange-500' : 'active:opacity-70'
              }`}>
              <Text
                className={`text-sm font-semibold ${
                  selected ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                }`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mt-2 text-xs leading-4 text-slate-500 dark:text-slate-400">
        {preference === 'system'
          ? 'Follows your device setting.'
          : `Always ${preference}, whatever your device is set to.`}
      </Text>
    </View>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) {
    return (
      <View className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
        <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          No role set
        </Text>
      </View>
    );
  }

  const isAdmin = role === 'admin';
  return (
    <View
      className={`rounded-full px-2.5 py-1 ${
        isAdmin ? 'bg-violet-100 dark:bg-violet-500/20' : 'bg-sky-100 dark:bg-sky-500/20'
      }`}>
      <Text
        className={`text-xs font-semibold ${
          isAdmin ? 'text-violet-700 dark:text-violet-300' : 'text-sky-700 dark:text-sky-300'
        }`}>
        {isAdmin ? 'Admin' : 'Picker'}
      </Text>
    </View>
  );
}

function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;

  const isError = feedback.tone === 'error';
  return (
    <View
      className={`mt-4 rounded-xl border p-3 ${
        isError
          ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
          : 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
      }`}>
      <Text
        className={`text-sm leading-5 ${
          isError ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'
        }`}>
        {feedback.message}
      </Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  hint,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  hint: string;
}) {
  const palette = usePalette();

  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1 flex-row items-center gap-3">
        {/* Icon color is a prop, not a class: @expo/vector-icons is outside
            NativeWind's interop registry, so className would be a no-op. */}
        <MaterialCommunityIcons name={icon} size={20} color={palette.meta} />
        <Text className="flex-1 text-base text-slate-900 dark:text-slate-100">{label}</Text>
      </View>
      <Text className="text-sm text-slate-500 dark:text-slate-400">{hint}</Text>
    </View>
  );
}
