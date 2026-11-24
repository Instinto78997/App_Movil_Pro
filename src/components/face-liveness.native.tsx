import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import type { ExpoAwsLivenessHandle, ExpoAwsLivenessProps } from '@blacktomang/expo-aws-liveness';
import { AppColors, AppRadii } from '../constants/theme';
import { FaceLivenessHandle, FaceLivenessProps } from './face-liveness';

type NativeDetector = typeof import('@blacktomang/expo-aws-liveness')['ExpoAwsLiveness'];

export const FaceLiveness = forwardRef<FaceLivenessHandle, FaceLivenessProps>(function NativeFaceLiveness(props, ref) {
  const [Detector, setDetector] = useState<NativeDetector | null>(null);
  const nativeRef = useRef<ExpoAwsLivenessHandle | null>(null);

  useEffect(() => {
    let active = true;
    if (Constants.executionEnvironment === 'storeClient') return () => { active = false; };

    import('@blacktomang/expo-aws-liveness').then((module) => {
      if (active) setDetector(() => module.ExpoAwsLiveness);
    }).catch(() => {
      if (active) setDetector(null);
    });

    return () => { active = false; };
  }, []);

  useImperativeHandle(ref, () => ({
    start: async () => {
      if (!nativeRef.current) throw new Error('Face Liveness necesita un development build con el módulo nativo instalado.');
      return nativeRef.current.start();
    },
  }), []);

  if (Constants.executionEnvironment === 'storeClient') {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Face Liveness no está incluido en Expo Go. Abre esta app con un development build.</Text>
      </View>
    );
  }

  if (!Detector) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={AppColors.silver} />
        <Text style={styles.text}>Cargando verificación facial nativa...</Text>
      </View>
    );
  }

  const detectorProps: ExpoAwsLivenessProps = {
    ...props,
    onError: (failure) => props.onError?.(failure),
  };

  return <Detector ref={nativeRef} {...detectorProps} />;
});

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: AppColors.deep, borderRadius: AppRadii.card },
  text: { color: AppColors.silver, textAlign: 'center', fontSize: 15 },
});
