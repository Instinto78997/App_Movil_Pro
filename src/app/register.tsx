import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { AppColors, AppRadii } from '../constants/theme';
import { registerUser, uploadProfilePhoto } from '../services/api';

export default function RegisterScreen() {
  const [form, setForm] = useState({
    nombre: '', apellidos: '', documento_personal: '', correo: '', fecha_nacimiento: '', edad: '',
    telefono: '', direccion: '', password: '', rol: 'camarera',
  });
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para tomar la foto de perfil.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const chooseFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const choosePhotoSource = () => {
    Alert.alert('Foto de perfil', 'Elige el origen de la imagen.', [
      { text: 'Tomar foto', onPress: () => void takePhoto() },
      { text: 'Elegir de galería', onPress: () => void chooseFromGallery() },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleRegister = async () => {
    if (Object.entries(form).some(([key, value]) => key !== 'rol' && !value.trim())) {
      Alert.alert('Atención', 'Completa todos los campos obligatorios.');
      return;
    }
    setLoading(true);
    try {
      const { user: createdUser } = await registerUser({ ...form, edad: Number(form.edad) });
      let message = 'La cuenta se creó correctamente.';
      if (imageUri && createdUser.id > 0) {
        try {
          await uploadProfilePhoto(createdUser.id, imageUri);
        } catch (error) {
          console.warn('Profile photo upload failed after registration:', error);
          const detail = error instanceof Error ? error.message : 'Error desconocido al enviar la imagen.';
          message = `La cuenta se creó, pero no se guardó la foto. Detalle: ${detail}`;
        }
      } else if (imageUri) {
        message = 'La cuenta se creó. Inicia sesión y agrega tu foto desde el perfil.';
      }
      Alert.alert(
        'Registro completado',
        message,
        [{ text: 'Ir al login', onPress: () => router.replace('/') }],
      );
    } catch (error) {
      Alert.alert('No se pudo registrar', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const fields: { key: keyof typeof form; label: string; keyboard?: 'default' | 'email-address' | 'number-pad' | 'phone-pad'; secure?: boolean }[] = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellidos', label: 'Apellidos' },
    { key: 'documento_personal', label: 'Documento personal' },
    { key: 'correo', label: 'Correo electrónico', keyboard: 'email-address' },
    { key: 'fecha_nacimiento', label: 'Fecha de nacimiento (AAAA-MM-DD)' },
    { key: 'edad', label: 'Edad', keyboard: 'number-pad' },
    { key: 'telefono', label: 'Teléfono', keyboard: 'phone-pad' },
    { key: 'direccion', label: 'Dirección' },
    { key: 'password', label: 'Contraseña', secure: true },
    { key: 'rol', label: 'Rol (ej. camarera, cocina, caja)' },
  ];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>NUEVO EQUIPO</Text>
      <Text style={styles.title}>Crea tu perfil</Text>
      <Text style={styles.subtitle}>Completa tus datos una vez y mantén tu información siempre al día.</Text>
      {fields.map(({ key, label, keyboard, secure }) => (
        <TextInput
          key={key}
          style={styles.input}
          placeholder={label}
          placeholderTextColor={AppColors.mist}
          keyboardType={keyboard ?? 'default'}
          autoCapitalize={key === 'correo' ? 'none' : 'sentences'}
          secureTextEntry={secure}
          value={form[key]}
          onChangeText={(value) => set(key, value)}
        />
      ))}
      <TouchableOpacity style={styles.photoButton} onPress={choosePhotoSource}>
        <Text style={styles.photoButtonText}>{imageUri ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}</Text>
      </TouchableOpacity>
      {imageUri && <Image source={{ uri: imageUri }} style={styles.previewImage} />}
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color={AppColors.night} /> : <Text style={styles.buttonText}>Guardar Registro</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkButton} onPress={() => router.back()}>
        <Text style={styles.linkText}>Regresar al Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: AppColors.night },
  container: { paddingHorizontal: 24, paddingTop: 44, paddingBottom: 34 },
  eyebrow: { color: AppColors.silver, textAlign: 'center', fontSize: 11, fontWeight: '800', letterSpacing: 1.8, marginBottom: 10 },
  title: { fontSize: 31, lineHeight: 37, fontWeight: '800', color: AppColors.white, marginBottom: 8, textAlign: 'center', letterSpacing: -0.6 },
  subtitle: { color: AppColors.silver, textAlign: 'center', fontSize: 14, lineHeight: 21, marginHorizontal: 16, marginBottom: 28 },
  input: { minHeight: 53, backgroundColor: AppColors.deep, color: AppColors.white, paddingHorizontal: 18, borderRadius: AppRadii.input, marginBottom: 11, borderWidth: 1, borderColor: AppColors.transparentWhite, fontSize: 15 },
  photoButton: { minHeight: 66, backgroundColor: AppColors.ocean, padding: 15, borderRadius: AppRadii.card, alignItems: 'center', justifyContent: 'center', marginTop: 6, marginBottom: 8, borderWidth: 1, borderColor: AppColors.transparentWhite },
  photoButtonText: { color: AppColors.white, fontSize: 14, fontWeight: '800' },
  previewImage: { width: 108, height: 108, borderRadius: AppRadii.avatar, alignSelf: 'center', marginVertical: 14, borderWidth: 4, borderColor: AppColors.mist },
  button: { backgroundColor: AppColors.silver, padding: 15, borderRadius: AppRadii.button, alignItems: 'center', marginTop: 8, marginBottom: 6, minHeight: 54, justifyContent: 'center' },
  buttonText: { color: AppColors.night, fontSize: 16, fontWeight: '800' },
  linkButton: { alignSelf: 'center', padding: 13, borderRadius: AppRadii.pill, marginTop: 6 },
  linkText: { color: AppColors.silver, fontSize: 14, fontWeight: '700' },
});
