import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { AppColors, AppRadii } from '../constants/theme';
import { FaceLiveness, FaceLivenessHandle } from '../components/face-liveness';
import { createLivenessSession, getLivenessResult, getProfile, profileImageToBase64 } from '../services/api';

export default function LivenessScreen() {
  const params = useLocalSearchParams<{ mode?: string; id?: string }>();
  const mode = params.mode === 'profile' ? 'profile' : 'login';
  const userId = Number(params.id ?? 0);
  const detector = useRef<FaceLivenessHandle | null>(null);
  const canRunNativeLiveness = Platform.OS !== 'web' && Constants.executionEnvironment !== 'storeClient';
  const [sessionId, setSessionId] = useState('');
  const [profileImageBase64, setProfileImageBase64] = useState<string>();
  const [loading, setLoading] = useState(canRunNativeLiveness);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(canRunNativeLiveness
    ? ''
    : Platform.OS === 'web'
      ? 'La verificación facial se ejecuta en la app nativa de Android o iOS.'
      : 'Expo Go no incluye Face Liveness. Abre la app con un development build.');
  const identityPoolId = Constants.expoConfig?.extra?.awsIdentityPoolId as string | undefined;

  useEffect(() => {
    if (!canRunNativeLiveness) return;
    let active = true;
    const prepare = async () => {
      try {
        if (!identityPoolId) throw new Error('Falta configurar el Identity Pool de AWS.');
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) throw new Error('Se necesita permiso de cámara para verificar tu rostro.');
        if (mode === 'profile') {
          if (!userId) throw new Error('No se recibió el ID del usuario.');
          const profile = await getProfile(userId);
          const image = profileImageToBase64(profile.foto_bytea);
          if (!image) throw new Error('El perfil no tiene una foto compatible para comparar. Agrega una foto desde tu perfil.');
          if (active) setProfileImageBase64(image);
        }
        const session = await createLivenessSession();
        if (!session) throw new Error('La Lambda devolvió una sesión vacía.');
        if (active) setSessionId(session);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudo preparar la verificación facial.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void prepare();
    return () => { active = false; };
  }, [canRunNativeLiveness, identityPoolId, mode, userId]);

  const begin = async () => {
    if (!canRunNativeLiveness) {
      setError(Platform.OS === 'web'
        ? 'La verificación facial se ejecuta en la app nativa de Android o iOS.'
        : 'Expo Go no incluye Face Liveness. Abre la app con un development build.');
      return;
    }
    if (!detector.current || !sessionId) return;
    setRunning(true);
    setError('');
    try {
      const completed = await detector.current.start();
      if (!completed.isLive) throw new Error('La verificación de presencia no se completó.');
      const result = await getLivenessResult({
        sessionId,
        identifyAll: mode === 'login',
        ...(mode === 'profile' && profileImageBase64 ? { profileImageBase64 } : {}),
      });

      if (mode === 'login' && result.isMatch && result.user?.id) {
        router.replace({
          pathname: '/profile',
          params: {
            id: String(result.user.id),
            userName: result.user.nombre,
            role: result.user.rol,
            email: result.user.correo,
          },
        });
        return;
      }
      if (mode === 'profile') {
        Alert.alert(
          result.isMatch ? 'Identidad verificada' : 'No se pudo verificar',
          result.message ?? (result.isMatch ? 'El rostro coincide con la foto del perfil.' : 'El rostro no coincide con la foto del perfil.'),
          [{ text: 'Aceptar', onPress: () => router.back() }],
        );
      } else {
        Alert.alert('Rostro no reconocido', result.message ?? 'No encontramos una cuenta que coincida con el rostro.', [
          { text: 'Intentar de nuevo', onPress: () => router.replace('/') },
          { text: 'Volver', onPress: () => router.back() },
        ]);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Falló la verificación facial.';
      setError(message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>IDENTIDAD SEGURA</Text>
      <Text style={styles.title}>{mode === 'login' ? 'Acceso facial' : 'Verificar identidad'}</Text>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={AppColors.silver} /><Text style={styles.message}>Preparando la sesión segura...</Text></View>
      ) : error && !sessionId ? (
        <View style={styles.center}><Text style={styles.error}>{error}</Text><TouchableOpacity style={styles.button} onPress={() => router.back()}><Text style={styles.buttonText}>Volver</Text></TouchableOpacity></View>
      ) : (
        <>
          <Text style={styles.message}>Sigue las instrucciones en pantalla para completar la prueba de presencia.</Text>
          <FaceLiveness
            ref={detector}
            sessionId={sessionId}
            region="us-east-1"
            identityPoolId={identityPoolId!}
            style={styles.detector}
            onError={(failure) => setError(failure.message)}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {running ? <ActivityIndicator size="large" color={AppColors.silver} /> : (
            <TouchableOpacity style={styles.button} onPress={begin} disabled={running}>
              <Text style={styles.buttonText}>Iniciar reconocimiento facial</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      <TouchableOpacity style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>Cancelar</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.night, paddingHorizontal: 20, paddingTop: 42, paddingBottom: 10 },
  eyebrow: { color: AppColors.silver, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, textAlign: 'center', marginBottom: 9 },
  title: { color: AppColors.white, fontSize: 29, fontWeight: '800', textAlign: 'center', marginBottom: 5, letterSpacing: -0.5 },
  message: { color: AppColors.silver, fontSize: 15, lineHeight: 22, textAlign: 'center', marginVertical: 12, paddingHorizontal: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  detector: { flex: 1, minHeight: 300, marginVertical: 12, borderRadius: AppRadii.card, overflow: 'hidden' },
  error: { color: AppColors.danger, textAlign: 'center', margin: 10, lineHeight: 20 },
  button: { minHeight: 54, backgroundColor: AppColors.silver, padding: 15, borderRadius: AppRadii.button, alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  buttonText: { color: AppColors.night, fontWeight: '800', fontSize: 15 },
  back: { alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 12, borderRadius: AppRadii.pill },
  backText: { color: AppColors.silver, fontWeight: '700' },
});
