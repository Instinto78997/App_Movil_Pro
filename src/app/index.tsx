import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { AppColors, AppRadii } from '../constants/theme';
import { login } from '../services/api';

export default function LoginScreen() {
  const [ email, setEmail ] = useState('');
  const [ password, setPassword ] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);


  //Login
  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Porfavor ingresa tu correo y contraseña');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      setLoading(false);
      router.replace({
        pathname: '/profile',
        params: {
          id: String(result.user.id),
          userName: result.user.nombre,
          role: result.user.rol,
          email: result.user.correo,
        },
      });
    } catch (error) {
      setLoading(false);
      Alert.alert('No se pudo iniciar sesión', error instanceof Error ? error.message : 'Revisa tus datos e inténtalo de nuevo.');
    }
  };

  //Login Recognition
  const handleFacialLogin = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para verificar tu rostro.');
      return;
    }
    router.push('/liveness?mode=login');
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.brandRow}>
            <Text style={styles.brandName}>Restaurante</Text>
            <Text style={styles.title}>Iniciar sesión</Text>
            <Text style={styles.subtitle}>Ingresa con tus datos para continuar.</Text>
          </View>
      <View style={styles.loginCard}>
      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor={AppColors.mist}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <View style={styles.passwordField}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Contraseña"
          placeholderTextColor={AppColors.mist}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={() => void handleEmailLogin()}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          style={styles.passwordToggle}
          onPress={() => setShowPassword((visible) => !visible)}>
          <Text style={styles.passwordToggleText}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={AppColors.silver} style={{ marginVertical: 15 }} />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleEmailLogin}>
          <Text style={styles.buttonText}>Ingresar</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.orText}>o</Text>
      <TouchableOpacity style={styles.facialButton} onPress={handleFacialLogin} disabled={loading}>
        <Text style={styles.facialButtonText}>Reconocimiento facial</Text>
      </TouchableOpacity>
      </View>

      <TouchableOpacity
        accessibilityRole="link"
        accessibilityLabel="Registrarme"
        style={styles.linkButton}
        onPress={() => router.push('/register')}>
        <Text style={styles.linkHint}>¿No tienes una cuenta? </Text>
        <Text style={styles.linkText}>Regístrate</Text>
      </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: AppColors.night },
  container: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: 28, paddingTop: 48, paddingBottom: 28 },
  brandRow: { alignItems: 'center', marginBottom: 35 },
  brandName: { color: AppColors.white, fontSize: 36, fontWeight: '800', letterSpacing: -1.1, marginBottom: 30 },
  eyebrow: { color: AppColors.silver, fontSize: 11, fontWeight: '800', letterSpacing: 1.9, marginBottom: 10 },
  title: { fontSize: 27, lineHeight: 33, fontWeight: '800', color: AppColors.white, marginBottom: 8, letterSpacing: -0.45 },
  subtitle: { fontSize: 14, lineHeight: 21, color: AppColors.silver, textAlign: 'center' },
  loginCard: { backgroundColor: AppColors.deep, borderRadius: AppRadii.card, padding: 18, borderWidth: 1, borderColor: AppColors.transparentWhite },
  input: { minHeight: 55, backgroundColor: AppColors.night, color: AppColors.white, paddingHorizontal: 19, borderRadius: AppRadii.pill, marginBottom: 14, borderWidth: 1, borderColor: AppColors.transparentWhite, fontSize: 15 },
  passwordField: { minHeight: 55, borderRadius: AppRadii.pill, backgroundColor: AppColors.night, borderWidth: 1, borderColor: AppColors.transparentWhite, flexDirection: 'row', alignItems: 'center', marginBottom: 17 },
  passwordInput: { flex: 1, color: AppColors.white, paddingLeft: 19, paddingRight: 4, fontSize: 15, minHeight: 53 },
  passwordToggle: { minHeight: 39, paddingHorizontal: 14, borderRadius: AppRadii.pill, justifyContent: 'center', marginRight: 7, backgroundColor: AppColors.transparentSilver },
  passwordToggleText: { color: AppColors.silver, fontWeight: '800', fontSize: 12 },
  button: { minHeight: 55, backgroundColor: AppColors.silver, padding: 15, borderRadius: AppRadii.pill, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  buttonText: { color: AppColors.night, fontSize: 16, fontWeight: '800' },
  orText: { color: AppColors.silver, textAlign: 'center', fontSize: 15, fontWeight: '700', marginVertical: 2 },
  facialButton: { minHeight: 55, backgroundColor: AppColors.ocean, padding: 15, borderRadius: AppRadii.pill, alignItems: 'center', justifyContent: 'center', marginTop: 11, borderWidth: 1, borderColor: AppColors.transparentWhite },
  facialButtonText: { color: AppColors.white, fontSize: 15, fontWeight: '800' },
  linkButton: { flexDirection: 'row', alignSelf: 'center', padding: 13, borderRadius: AppRadii.pill, marginTop: 13 },
  linkHint: { color: AppColors.silver, fontSize: 14 },
  linkText: { color: AppColors.white, fontSize: 14, fontWeight: '800' },
});
