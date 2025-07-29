import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import 'react-native-url-polyfill/auto';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Homeicon from '../../assets/images/home icon.tsx';
import Qricon from '../../assets/images/qrcode.tsx';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 76,
          
          paddingTop: 16,
          backgroundColor: '#242424',
          borderTopWidth: 1.5,
          borderTopColor: '#fff',
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#FFFFFF66',
        
        tabBarLabelStyle: {
          fontSize: 12,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        headerShown: false,
        tabBarBackground: () => (
          <View style={{ flex: 1 }}>
            <View
              style={{
                position: 'absolute',
                top: -6,
                height: 1,
                width: '100%',
                backgroundColor: '#fff',
                opacity: 0.4, // tab top border
                zIndex: 999,
              }}
            />
          </View>
        ),
        tabBarButton: ({ children, onPress }) => (

        <Pressable
          onPress={onPress}
          style={{ justifyContent: 'center', alignItems: 'center' }}
          android_ripple={{
            foreground: true,
          }}
        >
          {children}
        </Pressable>

        )
      }}

      
    >
      <Tabs.Screen
        name="main"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Homeicon width={24} height={24} stroke={color}  />,
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => (
            <Qricon width={24} height={24} stroke={color} />
          ),
        }}
      />
    </Tabs>
  );
}
