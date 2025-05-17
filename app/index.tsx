import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { authService } from './services/api';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    'Outfit-Regular': require('../assets/fonts/Outfit-Regular.ttf'),
    'Outfit-Bold': require('../assets/fonts/Outfit-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  const validateForm = () => {
    let isValid = true;
    setUsernameError('');
    setPasswordError('');
    setError('');

    if (!username.trim()) {
      setUsernameError('Username is required');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setError('');
      setLoading(true);
      await authService.login(username, password);
      router.replace('/home');
    } catch (error: any) {
      console.log('Login error:', error.message);
      const errorMessage = error.message?.toLowerCase() || '';
      
      // Handle specific API error messages first
      if (errorMessage.includes('invalid credentials')) {
        setError('Invalid username or password');
        setPasswordError('Please check your password');
        setUsernameError('Please check your username');
      } else if (errorMessage.includes('no authentication token')) {
        setError('Authentication failed. Please try logging in again.');
      } else if (!navigator.onLine) {
        setError('No internet connection. Please check your network.');
      } else if (errorMessage.includes('failed to fetch')) {
        setError('Unable to reach the server. Please try again.');
      } else if (errorMessage.startsWith('server error:')) {
        // Only set generic server error if the message explicitly indicates a server error
        setError('Server error occurred. Please try again later.');
      } else {
        // For any other error, show the actual error message
        setError(error.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF9F43" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -64 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../assets/images/vetra.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.appTitle}>Vetra</Text>
              <Text style={styles.appSubtitle}>Point of Sale System</Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.loginTitle}>LOGIN</Text>
              
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={24} color="#fff" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.inputWrapper}>
                <View style={[styles.inputContainer, usernameError && styles.inputError]}>
                  <Ionicons name="person-outline" size={20} color={usernameError ? "#FF5252" : "#666"} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, usernameError && styles.inputTextError]}
                    placeholder="Username"
                    value={username}
                    onChangeText={(text) => {
                      setUsername(text);
                      setUsernameError('');
                      setError('');
                    }}
                    autoCapitalize="none"
                    placeholderTextColor="#999"
                  />
                </View>
                {usernameError ? <Text style={styles.fieldError}>{usernameError}</Text> : null}
              </View>

              <View style={styles.inputWrapper}>
                <View style={[styles.inputContainer, passwordError && styles.inputError]}>
                  <Ionicons name="lock-closed-outline" size={20} color={passwordError ? "#FF5252" : "#666"} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, passwordError && styles.inputTextError]}
                    placeholder="Password"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setPasswordError('');
                      setError('');
                    }}
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-outline" : "eye-off-outline"} 
                      size={20} 
                      color={passwordError ? "#FF5252" : "#666"}
                    />
                  </TouchableOpacity>
                </View>
                {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
              </View>

              <TouchableOpacity 
                style={[styles.loginButton, loading && styles.disabledButton]} 
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Login</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/registration-screen')}>
                  <Text style={styles.registerLink}>Register</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  logo: {
    width: 180,
    height: 120,
    marginBottom: -30,
    marginTop: 60,
  },
  appTitle: {
    fontSize: 32,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
  },
  appSubtitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: '#666',
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: '#FF9F43',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 25,
    flex: 1,
    marginTop: 20,
  },
  loginTitle: {
    fontSize: 24,
    color: '#2C3E50',
    fontFamily: 'Outfit-Bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FF5252',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    marginLeft: 12,
    flex: 1,
  },
  inputWrapper: {
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#FF5252',
    backgroundColor: '#FFF8F8',
  },
  inputTextError: {
    color: '#FF5252',
  },
  fieldError: {
    color: '#FF5252',
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    marginTop: 4,
    marginLeft: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#2C3E50',
  },
  loginButton: {
    backgroundColor: '#2C3E50',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    flexDirection: 'row',
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    marginRight: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  registerText: {
    color: '#2C3E50',
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
  },
  registerLink: {
    color: '#2C3E50',
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    textDecorationLine: 'underline',
  },
  eyeIcon: {
    padding: 10,
  },
}); 