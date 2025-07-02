import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, TouchableOpacityProps } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { colors, iconSizes } from '../constants';

interface IconButtonProps extends TouchableOpacityProps {
  iconSet?: 'MaterialIcons' | 'FontAwesome5';
  iconName: string;
  iconSize?: keyof typeof iconSizes;
  iconColor?: string;
  text?: string;
  textStyle?: any;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
}

export const IconButton: React.FC<IconButtonProps> = ({
  iconSet = 'MaterialIcons',
  iconName,
  iconSize = 'medium',
  iconColor,
  text,
  textStyle,
  variant = 'primary',
  size = 'medium',
  style,
  ...props
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[`button_${size}`]];
    
    switch (variant) {
      case 'primary':
        return [...baseStyle, styles.buttonPrimary];
      case 'secondary':
        return [...baseStyle, styles.buttonSecondary];
      case 'outline':
        return [...baseStyle, styles.buttonOutline];
      default:
        return baseStyle;
    }
  };

  const getTextColor = () => {
    if (iconColor) return iconColor;
    
    switch (variant) {
      case 'primary':
        return colors.white;
      case 'secondary':
        return colors.white;
      case 'outline':
        return colors.primary;
      default:
        return colors.text;
    }
  };

  const getTextStyle = () => {
    return [
      styles.text,
      styles[`text_${size}`],
      { color: getTextColor() },
      textStyle,
    ];
  };

  const iconSizeValue = iconSizes[iconSize];
  const iconColorValue = iconColor || getTextColor();

  const renderIcon = () => {
    if (iconSet === 'FontAwesome5') {
      return (
        <FontAwesome5 
          name={iconName} 
          size={iconSizeValue} 
          color={iconColorValue}
        />
      );
    }
    
    return (
      <MaterialIcons 
        name={iconName as any} 
        size={iconSizeValue} 
        color={iconColorValue}
      />
    );
  };

  return (
    <TouchableOpacity style={[getButtonStyle(), style]} {...props}>
      <View style={styles.content}>
        {renderIcon()}
        {text && <Text style={getTextStyle()}>{text}</Text>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    flexDirection: 'row',
  },
  button_small: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 28,
  },
  button_medium: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
  },
  button_large: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontWeight: '600',
  },
  text_small: {
    fontSize: 12,
  },
  text_medium: {
    fontSize: 14,
  },
  text_large: {
    fontSize: 16,
  },
});