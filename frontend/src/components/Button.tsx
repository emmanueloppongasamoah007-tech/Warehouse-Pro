import { Pressable, Text, type PressableProps } from 'react-native';
import { type ReactNode } from 'react';
import { cn } from '../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary border border-primary text-on-primary',
  secondary: 'bg-secondary border border-secondary text-on-secondary',
  ghost: 'bg-transparent border border-outline text-on-surface',
};

export function Button({ variant = 'primary', children, style, ...props }: ButtonProps) {
  return (
    <Pressable
      android_ripple={{ color: 'rgba(255,255,255,0.14)' }}
      style={cn(`rounded-md px-4 h-12 items-center justify-center ${variantClasses[variant]}`, style)}
      {...props}
    >
      <Text className={`font-semibold text-body-md ${variant === 'ghost' ? 'text-on-surface' : 'text-on-primary'}`}>
        {children}
      </Text>
    </Pressable>
  );
}
