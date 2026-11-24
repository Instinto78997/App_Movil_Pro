import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { AppColors, AppRadii } from '../constants/theme';
import { ApiUser, getProfile, profileImageToBase64, updateProfile, uploadProfilePhoto } from '../services/api';

export default function ProfileScreen() {
  const params = useLocalSearchParams<{ id?: string; userName?: string; role?: string; email?: string }>();
  const id = Number(params.id ?? 0);
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [form, setForm] = useState({ nombre: '', apellidos: '', telefono: '', direccion: '', rol: '' });
  const [loading, setLoading] = useState(id > 0);
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const loadProfile = async () => {
    if (!id) {
      setLoading(false);
      Alert.alert('Perfil incompleto', 'La respuesta del login no incluyó un ID de usuario.');
      return;
    }
    try {
      const data = await getProfile(id);
      setProfile(data);
      const photo = profileImageToBase64(data.foto_bytea);
      setPhotoUri(photo ? `data:image/jpeg;base64,${photo}` : null);
      setForm({ nombre: data.nombre, apellidos: data.apellidos, telefono: data.telefono ?? '', direccion: data.direccion ?? '', rol: data.rol });
    } catch (error) {
      Alert.alert('No se pudo cargar el perfil', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!id) {
      Alert.alert('Perfil incompleto', 'La respuesta del login no incluyó un ID de usuario.');
      return () => { active = false; };
    }
    getProfile(id).then((data) => {
      if (!active) return;
      setProfile(data);
      const photo = profileImageToBase64(data.foto_bytea);
      setPhotoUri(photo ? `data:image/jpeg;base64,${photo}` : null);
      setForm({ nombre: data.nombre, apellidos: data.apellidos, telefono: data.telefono ?? '', direccion: data.direccion ?? '', rol: data.rol });
    }).catch((error: unknown) => {
      if (active) Alert.alert('No se pudo cargar el perfil', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfile(id, form);
      Alert.alert('Perfil actualizado', 'Los cambios se guardaron correctamente.');
      await loadProfile();
    } catch (error) {
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (uri: string) => {
    setSaving(true);
    try {
      await uploadProfilePhoto(id, uri);
      const updatedProfile = await getProfile(id);
      const storedPhoto = profileImageToBase64(updatedProfile.foto_bytea);
      if (!storedPhoto) {
        throw new Error('El servidor aceptó la subida, pero el perfil no devolvió la imagen guardada.');
      }
      setProfile(updatedProfile);
      setPhotoUri(`data:image/jpeg;base64,${storedPhoto}`);
      Alert.alert('Foto actualizada', 'La foto de perfil se guardó correctamente.');
    } catch (error) {
      Alert.alert('No se pudo guardar la foto', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para actualizar la foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
    if (result.canceled) return;
    await uploadPhoto(result.assets[0].uri);
  };

  const chooseFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled) return;
    await uploadPhoto(result.assets[0].uri);
  };

  const changePhoto = () => {
    Alert.alert('Actualizar foto', 'Elige el origen de la imagen.', [
      { text: 'Tomar foto', onPress: () => void takePhoto() },
      { text: 'Elegir de galería', onPress: () => void chooseFromGallery() },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const inputs: { key: keyof typeof form; label: string }[] = [
    { key: 'nombre', label: 'Nombre' }, { key: 'apellidos', label: 'Apellidos' },
    { key: 'telefono', label: 'Teléfono' }, { key: 'direccion', label: 'Dirección' }, { key: 'rol', label: 'Rol' },
  ];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>MI CUENTA</Text>
      <Text style={styles.title}>Mi perfil</Text>
      {loading ? <ActivityIndicator size="large" color={AppColors.silver} /> : (
        <>
          <View style={styles.photoWrap}>
            {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : <View style={styles.photoPlaceholder}><Text style={styles.photoInitial}>{(form.nombre || params.userName || 'U').charAt(0).toUpperCase()}</Text></View>}
            <TouchableOpacity style={styles.photoButton} onPress={changePhoto} disabled={saving}>
              <Text style={styles.photoButtonText}>Actualizar foto</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.email}>{profile?.correo || params.email || ''}</Text>
          {inputs.map(({ key, label }) => (
            <TextInput key={key} style={styles.input} placeholder={label} placeholderTextColor={AppColors.mist} value={form[key]} onChangeText={(value) => set(key, value)} />
          ))}
          <TouchableOpacity style={styles.button} onPress={saveProfile} disabled={saving}>
            {saving ? <ActivityIndicator color={AppColors.white} /> : <Text style={styles.buttonText}>Guardar cambios</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push({ pathname: '/liveness', params: { mode: 'profile', id: String(id) } })}>
            <Text style={styles.buttonText}>Verificar identidad con rostro</Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity style={styles.logoutButton} onPress={() => router.replace('/')}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: AppColors.night },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 42, paddingBottom: 30 },
  eyebrow: { color: AppColors.silver, fontSize: 11, fontWeight: '800', letterSpacing: 1.8, textAlign: 'center', marginBottom: 9 },
  title: { fontSize: 31, fontWeight: '800', color: AppColors.white, marginBottom: 23, textAlign: 'center', letterSpacing: -0.6 },
  photoWrap: { alignItems: 'center', marginBottom: 16, backgroundColor: AppColors.deep, borderRadius: AppRadii.card, paddingVertical: 20, borderWidth: 1, borderColor: AppColors.transparentWhite },
  photo: { width: 106, height: 106, borderRadius: AppRadii.avatar, marginBottom: 11, borderWidth: 4, borderColor: AppColors.mist },
  photoPlaceholder: { width: 106, height: 106, borderRadius: AppRadii.avatar, backgroundColor: AppColors.ocean, alignItems: 'center', justifyContent: 'center', marginBottom: 11, borderWidth: 4, borderColor: AppColors.mist },
  photoInitial: { color: AppColors.white, fontSize: 40, fontWeight: '800' },
  photoButton: { backgroundColor: AppColors.transparentSilver, paddingHorizontal: 17, paddingVertical: 10, borderRadius: AppRadii.pill },
  photoButtonText: { color: AppColors.white, fontSize: 13, fontWeight: '800' },
  email: { color: AppColors.silver, textAlign: 'center', marginBottom: 19, fontSize: 14 },
  input: { minHeight: 53, backgroundColor: AppColors.deep, color: AppColors.white, paddingHorizontal: 18, borderRadius: AppRadii.input, marginBottom: 11, borderWidth: 1, borderColor: AppColors.transparentWhite, fontSize: 15 },
  button: { backgroundColor: AppColors.ocean, padding: 15, borderRadius: AppRadii.button, alignItems: 'center', marginTop: 5, marginBottom: 8, minHeight: 54, justifyContent: 'center' },
  secondaryButton: { backgroundColor: AppColors.transparentSilver, padding: 15, borderRadius: AppRadii.button, alignItems: 'center', marginVertical: 7, minHeight: 54, justifyContent: 'center', borderWidth: 1, borderColor: AppColors.transparentWhite },
  logoutButton: { backgroundColor: AppColors.transparentWhite, padding: 15, borderRadius: AppRadii.button, alignItems: 'center', marginTop: 14, minHeight: 52, justifyContent: 'center' },
  buttonText: { color: AppColors.white, fontSize: 15, fontWeight: '800' },
});
