import { Text, View, type ViewProps } from 'react-native';
import { type ReactNode } from 'react';
import { cn } from '../lib/cn';

type StatusVariant = 'pending' | 'complete' | 'delayed';

const variantClasses: Record<StatusVariant, string> = {
  pending: 'bg-primary-container text-primary',
  complete: 'bg-surface-container text-on-surface',
  delayed: 'bg-error-container text-error',
};

interface StatusChipProps extends ViewProps {
  variant?: StatusVariant;
  children: ReactNode;
}

export function StatusChip({ variant = 'pending', children, ...props }: StatusChipProps) {
  return (
    <View style={cn(`rounded-full px-3 py-1 ${variantClasses[variant]}`)} {...props}>
      <Text style={cn('text-label-sm font-semibold')}>{children}</Text>
    </View>
  );
}
