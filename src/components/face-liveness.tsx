import React, { forwardRef, useImperativeHandle } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppColors, AppRadii } from '../constants/theme';

export type FaceLivenessHandle = {
  start: () => Promise<{ isLive: boolean }>;
};

export type FaceLivenessProps = {
  sessionId: string;
  region: string;
  identityPoolId: string;
  style?: StyleProp<ViewStyle>;
  onError?: (error: { message: string }) => void;
};

// Web fallback. Metro selects face-liveness.native.tsx on Android and iOS.
export const FaceLiveness = forwardRef<FaceLivenessHandle, FaceLivenessProps>(function FaceLivenessFallback(_props, ref) {
  useImperativeHandle(ref, () => ({
    start: async () => ({ isLive: false }),
  }), []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>La verificación facial requiere la app nativa de Android o iOS.</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: AppColors.deep, borderRadius: AppRadii.card },
  text: { color: AppColors.silver, textAlign: 'center', fontSize: 15 },
});
