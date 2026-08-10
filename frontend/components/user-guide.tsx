import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

type GuideSection = {
  id: string;
  title: string;
  /** One line per step. Kept short - this is read mid-shift, not studied. */
  steps: string[];
};

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    steps: [
      'Create an account with your work email and a password.',
      'Choose your role: Picker or Admin.',
      'Already have an account? Tap "Sign in" instead of signing up.',
    ],
  },
  {
    id: 'viewing-orders',
    title: 'Viewing orders',
    steps: [
      'Open the Orders tab to see all orders, newest first.',
      'Each card shows the order number, status, bin count and start point.',
      'The first few bin codes are previewed on the card.',
    ],
  },
  {
    id: 'working-a-route',
    title: 'Working a route',
    steps: [
      'Tap an order to open it in the Routes tab.',
      'The map shows the shortest picking path for that order.',
      '"S" is your start point; numbered circles are stops in walking order.',
      'Total distance and your next bin are shown above the map.',
    ],
  },
  {
    id: 'picking-items',
    title: 'Picking items',
    steps: [
      'Work down the Stops list below the map, in order.',
      'Tap "Mark picked" once the item is in your cart.',
      'That stop turns green on the map and the progress bar moves up.',
      'Nothing is lost if you close the app - picks are saved as you go.',
    ],
  },
  {
    id: 'completing-an-order',
    title: 'Completing an order',
    steps: [
      'When every stop is picked, "Complete order" appears at the bottom.',
      'Tap it to finish the order and return to Orders.',
      'The order badge changes from PENDING to COMPLETED.',
    ],
  },
  {
    id: 'managing-your-account',
    title: 'Managing your account',
    steps: [
      'Settings holds your name, employee ID and role badge.',
      'Edit your details and tap Save.',
      'Change your password under Security.',
      'Sign out at the bottom of Settings.',
    ],
  },
];

/**
 * Accordion user guide shown inside Settings.
 *
 * One section open at a time: the list stays scannable, which matters more than
 * reading several sections at once when someone is looking up one answer.
 */
export function UserGuide() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <View>
      {GUIDE_SECTIONS.map((section, index) => {
        const isOpen = section.id === openId;
        const isFirst = index === 0;

        return (
          <View
            key={section.id}
            className={isFirst ? '' : 'mt-3 border-t border-slate-100 pt-3'}>
            <Pressable
              onPress={() => setOpenId(isOpen ? null : section.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={`${section.title}, step ${index + 1} of ${GUIDE_SECTIONS.length}`}
              className="flex-row items-center py-1">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-orange-100">
                <Text className="text-xs font-bold text-orange-700">{index + 1}</Text>
              </View>
              <Text className="ml-3 flex-1 text-base font-medium text-slate-900">
                {section.title}
              </Text>
              {/* Icon color is a prop, not a class: @expo/vector-icons is outside
                  NativeWind's interop registry, so className would be a no-op. */}
              <MaterialCommunityIcons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={22}
                color="#94a3b8"
              />
            </Pressable>

            {isOpen ? (
              // Indented to line up with the title, clearing the number badge.
              <View className="ml-10 mt-1 pb-1">
                {section.steps.map((step) => (
                  <View key={step} className="mt-2 flex-row">
                    <Text className="text-sm leading-5 text-orange-500">•</Text>
                    <Text className="ml-2 flex-1 text-sm leading-5 text-slate-600">{step}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
