import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
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
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { authService } from './services/api';

const BUSINESS_TYPES = [
  'Retail',
  'Restaurant',
  'Service',
  'Manufacturing',
  'Wholesale',
  'Healthcare',
  'Education',
  'Technology',
  'Construction',
  'Transportation',
  'Other'
];

export default function RegistrationScreen() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [customBusinessType, setCustomBusinessType] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [contactNumber, setContactNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Field-specific errors
  const [fullNameError, setFullNameError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [businessNameError, setBusinessNameError] = useState('');
  const [businessTypeError, setBusinessTypeError] = useState('');
  const [contactNumberError, setContactNumberError] = useState('');
  
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    'Outfit-Regular': require('../assets/fonts/Outfit-Regular.ttf'),
    'Outfit-Bold': require('../assets/fonts/Outfit-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleBusinessTypeChange = (value: string) => {
    setBusinessType(value);
    if (value === 'Other') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      setCustomBusinessType('');
    }
  };

  const validateForm = () => {
    let isValid = true;
    
    // Reset all errors
    setFullNameError('');
    setUsernameError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setBusinessNameError('');
    setBusinessTypeError('');
    setContactNumberError('');
    setError('');

    if (!fullName.trim()) {
      setFullNameError('Full name is required');
      isValid = false;
    }

    if (!username.trim()) {
      setUsernameError('Username is required');
      isValid = false;
    } else if (username.length < 4) {
      setUsernameError('Username must be at least 4 characters');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }

    if (!businessName.trim()) {
      setBusinessNameError('Business name is required');
      isValid = false;
    }

    if (!businessType) {
      setBusinessTypeError('Please select a business type');
      isValid = false;
    } else if (businessType === 'Other' && !customBusinessType.trim()) {
      setBusinessTypeError('Please specify your business type');
      isValid = false;
    }

    if (!contactNumber) {
      setContactNumberError('Contact number is required');
      isValid = false;
    } else if (!/^09\d{9}$/.test(contactNumber)) {
      setContactNumberError('Please enter a valid Philippine mobile number (09XXXXXXXXX)');
      isValid = false;
    }

    return isValid;
  };

  const handleContactNumberChange = (text: string) => {
    // Only allow digits and limit to 11 characters
    const formattedNumber = text.replace(/[^\d]/g, '').slice(0, 11);
    setContactNumber(formattedNumber);
    setContactNumberError('');
  };

  const handleRegister = async () => {
    try {
      if (!validateForm()) {
        return;
      }

      setLoading(true);
      const userData = {
        fullName,
        username,
        password,
        businessName,
        businessType: businessType === 'Other' ? customBusinessType : businessType,
        contactNumber
      };

      console.log('Attempting registration with:', { ...userData, password: '***' });
      
      const response = await authService.register(userData);
      console.log('Registration successful:', response);
      
      router.replace('/home');
    } catch (error: any) {
      const errorMessage = error.message?.toLowerCase() || '';
      if (errorMessage.includes('username')) {
        setUsernameError('Username already exists');
      } else {
        setError(error.message || 'Registration failed. Please try again.');
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
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoContainer}>
              <Image 
                source={require('../assets/images/vetra.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.appTitle}>Vetra</Text>
              <Text style={styles.appSubtitle}>Create your account</Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.registerTitle}>REGISTER</Text>
              
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={20} color="#fff" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Text style={styles.sectionTitle}>Account Info</Text>
              <View style={styles.inputWrapper}>
                <View style={[styles.inputContainer, fullNameError && styles.inputError]}>
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={fullName}
                    onChangeText={(text) => {
                      setFullName(text);
                      setFullNameError('');
                    }}
                    placeholderTextColor="#999"
                  />
                </View>
                {fullNameError ? <Text style={styles.fieldError}>{fullNameError}</Text> : null}
              </View>
              <View style={styles.inputWrapper}>
                <View style={[styles.inputContainer, usernameError && styles.inputError]}>
                  <Ionicons name="at-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    value={username}
                    onChangeText={(text) => {
                      setUsername(text);
                      setUsernameError('');
                    }}
                    autoCapitalize="none"
                    placeholderTextColor="#999"
                  />
                </View>
                {usernameError ? <Text style={styles.fieldError}>{usernameError}</Text> : null}
              </View>
              <View style={styles.inputWrapper}>
                <View style={[styles.inputContainer, passwordError && styles.inputError]}>
                  <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setPasswordError('');
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
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>
                {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
              </View>
              <View style={styles.inputWrapper}>
                <View style={[styles.inputContainer, confirmPasswordError && styles.inputError]}>
                  <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setConfirmPasswordError('');
                    }}
                    secureTextEntry={!showConfirmPassword}
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity 
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>
                {confirmPasswordError ? <Text style={styles.fieldError}>{confirmPasswordError}</Text> : null}
              </View>

              <Text style={styles.sectionTitle}>Business Info</Text>
              <View style={styles.inputWrapper}>
                <View style={[styles.inputContainer, businessNameError && styles.inputError]}>
                  <Ionicons name="business-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Business Name"
                    value={businessName}
                    onChangeText={(text) => {
                      setBusinessName(text);
                      setBusinessNameError('');
                    }}
                    placeholderTextColor="#999"
                  />
                </View>
                {businessNameError ? <Text style={styles.fieldError}>{businessNameError}</Text> : null}
              </View>
              <View style={styles.inputWrapper}>
                <View style={[styles.pickerContainer, businessTypeError && styles.inputError]}>
                  <Ionicons name="list-outline" size={20} color="#666" style={styles.inputIcon} />
                  <Picker
                    selectedValue={businessType}
                    onValueChange={(value) => {
                      handleBusinessTypeChange(value);
                      setBusinessTypeError('');
                    }}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    <Picker.Item label="Select Business Type" value="" />
                    {BUSINESS_TYPES.map((type) => (
                      <Picker.Item key={type} label={type} value={type} />
                    ))}
                  </Picker>
                </View>
                {businessTypeError ? <Text style={styles.fieldError}>{businessTypeError}</Text> : null}
              </View>
              {showCustomInput && (
                <View style={styles.inputWrapper}>
                  <View style={[styles.inputContainer, businessTypeError && styles.inputError]}>
                    <Ionicons name="pencil-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Specify Business Type"
                      value={customBusinessType}
                      onChangeText={(text) => {
                        setCustomBusinessType(text);
                        setBusinessTypeError('');
                      }}
                      placeholderTextColor="#999"
                    />
                  </View>
                  {businessTypeError ? <Text style={styles.fieldError}>{businessTypeError}</Text> : null}
                </View>
              )}
              <View style={styles.inputWrapper}>
                <View style={[styles.inputContainer, contactNumberError && styles.inputError]}>
                  <Ionicons name="call-outline" size={20} color={contactNumberError ? "#FF5252" : "#666"} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, contactNumberError && styles.inputTextError]}
                    placeholder="Contact Number (09XXXXXXXXX)"
                    value={contactNumber}
                    onChangeText={handleContactNumberChange}
                    keyboardType="phone-pad"
                    maxLength={11}
                    placeholderTextColor="#999"
                  />
                </View>
                {contactNumberError ? <Text style={styles.fieldError}>{contactNumberError}</Text> : null}
              </View>

              <TouchableOpacity 
                style={[styles.registerButton, loading && styles.disabledButton]} 
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.registerButtonText}>Register</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
    marginTop: 10,
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
    marginTop: 20,
  },
  registerTitle: {
    fontSize: 24,
    color: '#2C3E50',
    fontFamily: 'Outfit-Bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FF5252',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#2C3E50',
    fontFamily: 'Outfit-Bold',
    marginBottom: 15,
    marginTop: 10,
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
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    marginBottom: 15,
    paddingHorizontal: 20,
    height: 50,
  },
  picker: {
    flex: 1,
    height: '100%',
    color: '#2C3E50',
  },
  pickerItem: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    height: 50,
    lineHeight: 50,
  },
  registerButton: {
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
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    marginRight: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  loginText: {
    color: '#2C3E50',
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
  },
  loginLink: {
    color: '#2C3E50',
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    textDecorationLine: 'underline',
  },
  eyeIcon: {
    padding: 10,
  },
  inputError: {
    borderColor: '#FF5252',
    backgroundColor: '#FFF8F8',
  },
  fieldError: {
    color: '#FF5252',
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    marginTop: 4,
    marginLeft: 20,
  },
  inputTextError: {
    color: '#FF5252',
  },
}); 