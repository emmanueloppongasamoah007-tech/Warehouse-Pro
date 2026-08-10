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

import { FIELD_BASE_CLASSNAME, STABLE_TEXT_STYLE } from '@/components/field-config';
import { PasswordField } from '@/components/password-field';
import { UserGuide } from '@/components/user-guide';
import { PASSWORD_HINT, validatePassword } from '@/lib/password';
import { supabase } from '@/lib/supabase';
import { useRoleStore } from '@/store/use-role-store';

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
  const clearRole = useRoleStore((state) => state.clearRole);

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
      // The in-memory role is tied to the signed-out user; leaving it set would
      // carry into the next signup on this device.
      clearRole();
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
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />

      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-6 pb-10 pt-6"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text className="text-3xl font-bold text-slate-900">Settings</Text>
            <Text className="mt-1 text-base text-slate-500">Your account and app preferences</Text>

            {state.status === 'loading' ? (
              <View className="mt-10 items-center">
                <ActivityIndicator color="#0f172a" />
                <Text className="mt-3 text-sm text-slate-500">Loading account…</Text>
              </View>
            ) : state.status === 'error' ? (
              <View className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                <Text className="text-sm font-semibold text-red-800">
                  Could not load your account
                </Text>
                <Text className="mt-1 text-sm leading-5 text-red-700">{state.message}</Text>
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
                    <Text className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Email
                    </Text>
                    <View className="mt-1 flex-row items-center justify-between">
                      <Text className="flex-1 text-base text-slate-900">{state.profile.email}</Text>
                      <RoleBadge role={state.profile.role} />
                    </View>
                  </View>

                  <View className="mt-5">
                    <Text className="mb-1.5 text-sm font-medium text-slate-700">Name</Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      editable={!savingProfile}
                      placeholder="e.g. Ama Mensah"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="words"
                      autoComplete="name"
                      returnKeyType="next"
                      className={`${FIELD_BASE_CLASSNAME} px-4`}
                      style={STABLE_TEXT_STYLE}
                    />
                  </View>

                  <View className="mt-4">
                    <Text className="mb-1.5 text-sm font-medium text-slate-700">Employee ID</Text>
                    <TextInput
                      value={employeeId}
                      onChangeText={setEmployeeId}
                      editable={!savingProfile}
                      placeholder="e.g. WP-1042"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleSaveProfile}
                      className={`${FIELD_BASE_CLASSNAME} px-4`}
                      style={STABLE_TEXT_STYLE}
                    />
                  </View>

                  <FeedbackBanner feedback={profileFeedback} />

                  <Pressable
                    onPress={handleSaveProfile}
                    disabled={savingProfile}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: savingProfile }}
                    className={`mt-4 h-12 flex-row items-center justify-center rounded-xl ${
                      savingProfile ? 'bg-slate-400' : 'bg-slate-900 active:opacity-90'
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
                      <MaterialCommunityIcons name="lock-outline" size={20} color="#475569" />
                      <Text className="text-base text-slate-900">Change password</Text>
                    </View>
                    <MaterialCommunityIcons
                      name={showPasswordSection ? 'chevron-up' : 'chevron-down'}
                      size={22}
                      color="#94a3b8"
                    />
                  </Pressable>

                  {showPasswordSection ? (
                    <View className="mt-4 border-t border-slate-100 pt-4">
                      <View>
                        <Text className="mb-1.5 text-sm font-medium text-slate-700">
                          New password
                        </Text>
                        <PasswordField
                          value={newPassword}
                          onChangeText={setNewPassword}
                          editable={!savingPassword}
                          placeholder="Enter new password"
                          placeholderTextColor="#94a3b8"
                          autoComplete="new-password"
                          textContentType="newPassword"
                          returnKeyType="next"
                        />
                        <Text className="mt-1.5 text-xs leading-4 text-slate-500">
                          {PASSWORD_HINT}
                        </Text>
                      </View>

                      <View className="mt-4">
                        <Text className="mb-1.5 text-sm font-medium text-slate-700">
                          Confirm new password
                        </Text>
                        <PasswordField
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          editable={!savingPassword}
                          placeholder="Re-enter new password"
                          placeholderTextColor="#94a3b8"
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
                          savingPassword ? 'bg-slate-400' : 'bg-slate-900 active:opacity-90'
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

                <SectionCard title="How to use WarehousePro">
                  <UserGuide />
                </SectionCard>

                <SectionCard title="Help & support">
                  <InfoRow
                    icon="email-outline"
                    label="support@warehousepro.app"
                    hint="Mon-Fri, 8am-6pm"
                  />
                  <View className="mt-4 border-t border-slate-100 pt-4">
                    <InfoRow icon="information-outline" label="App version" hint={APP_VERSION} />
                  </View>
                </SectionCard>

                {signOutError ? (
                  <View className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3">
                    <Text className="text-sm leading-5 text-red-700">{signOutError}</Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={handleSignOut}
                  disabled={signingOut}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: signingOut }}
                  className={`mt-6 h-12 flex-row items-center justify-center gap-2 rounded-xl border ${
                    signingOut
                      ? 'border-slate-200 bg-slate-100'
                      : 'border-red-200 bg-white active:opacity-90'
                  }`}>
                  {signingOut ? (
                    <ActivityIndicator color="#dc2626" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="logout" size={18} color="#dc2626" />
                      <Text className="text-base font-semibold text-red-600">Sign out</Text>
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
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </Text>
      <View className="rounded-2xl border border-slate-200 bg-white p-4">{children}</View>
    </View>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) {
    return (
      <View className="rounded-full bg-slate-100 px-2.5 py-1">
        <Text className="text-xs font-semibold text-slate-500">No role set</Text>
      </View>
    );
  }

  const isAdmin = role === 'admin';
  return (
    <View className={`rounded-full px-2.5 py-1 ${isAdmin ? 'bg-violet-100' : 'bg-sky-100'}`}>
      <Text className={`text-xs font-semibold ${isAdmin ? 'text-violet-700' : 'text-sky-700'}`}>
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
        isError ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'
      }`}>
      <Text className={`text-sm leading-5 ${isError ? 'text-red-700' : 'text-emerald-700'}`}>
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
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1 flex-row items-center gap-3">
        {/* Icon color is a prop, not a class: @expo/vector-icons is outside
            NativeWind's interop registry, so className would be a no-op. */}
        <MaterialCommunityIcons name={icon} size={20} color="#475569" />
        <Text className="flex-1 text-base text-slate-900">{label}</Text>
      </View>
      <Text className="text-sm text-slate-500">{hint}</Text>
    </View>
  );
}
