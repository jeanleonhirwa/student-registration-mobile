import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';

// Auto-detect the correct backend URL based on platform
// ⚠️ If your local IP changes, update the address below (run 'ipconfig' to find it)
const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:5000',       // Android Emulator routes 10.0.2.2 → host localhost
  ios: 'http://192.168.1.61:5000',        // Your computer's LAN IP (physical device needs this)
  default: 'http://localhost:5000',        // Web
});
const API_URL = `${BASE_URL}/api/students`;

export default function App() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [course, setCourse] = useState('');
  const [loading, setLoading] = useState(false);

  const Register = async () => {
    if (!name.trim() || !email.trim() || !course.trim()) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          course: course.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Student registered successfully!');
        // Clear the form
        setName('');
        setEmail('');
        setCourse('');
      } else {
        Alert.alert('Error', data.message || 'Registration failed');
      }
    } catch (error) {
      Alert.alert(
        'Connection Error',
        'Could not connect to server. Make sure the backend is running.'
      );
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registration Form</Text>
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={(text) => setName(text)}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={(text) => setEmail(text)}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Course"
        value={course}
        onChangeText={(text) => setCourse(text)}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <Button title="Register" onPress={Register} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
