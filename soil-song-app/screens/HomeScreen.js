import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Image, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Easing,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL, API_URLS, THEME } from '../config';
import NetInfo from '@react-native-community/netinfo';
import { MaterialIcons, Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [ph, setPh] = useState('');
  const [moisture, setMoisture] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState(API_BASE_URL);
  const [connectionTested, setConnectionTested] = useState(false);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.95))[0];
  const buttonAnim = useState(new Animated.Value(1))[0];
  const logoAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    testServerConnection();
    
    // Run entrance animations with more sophisticated timing
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(logoAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.elastic(1),
          useNativeDriver: true,
        })
      ])
    ]).start();
  }, []);

  const testServerConnection = async () => {
    try {
      const networkState = await NetInfo.fetch();
      
      if (!networkState.isConnected) {
        Alert.alert(
          "Network Error", 
          "No internet connection detected. Please check your network settings and try again."
        );
        return;
      }
      
      console.log('Testing server connections...');
      
      for (const url of API_URLS) {
        try {
          console.log(`Testing connection to: ${url}`);
          
          const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out')), 3000)
          );
          
          const request = axios.get(`${url}/health`);
          
          const response = await Promise.race([request, timeout]);
          
          if (response.status === 200) {
            console.log(`✅ Successfully connected to: ${url}`);
            setServerUrl(url);
            setConnectionTested(true);
            return;
          }
        } catch (error) {
          console.log(`❌ Failed to connect to: ${url}`, error.message);
        }
      }
      
      console.log('⚠️ No working server found');
      Alert.alert(
        "Connection Error",
        "Could not connect to the server. Please ensure the server is running and you're connected to the same network."
      );
      
    } catch (error) {
      console.error('Server connection test failed:', error);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result);
      
      // Animation for image added
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.03,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  };

  const handleSubmit = async () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
    
    if (!ph || !moisture) {
      Alert.alert('Validation Error', 'Please enter both pH and moisture values.');
      return;
    }

    setLoading(true);

    try {
      if (!connectionTested) {
        await testServerConnection();
      }
      
      console.log(`Submitting to server at: ${serverUrl}`);
      
      const response = await axios.post(`${serverUrl}/api/story`, {
        pH: ph,
        moisture: moisture,
        base64Image: image?.base64 || null,
      }, {
        timeout: 15000,
      });

      setLoading(false);
      navigation.navigate('Result', {
        story: response.data.story,
        audioUri: response.data.audioUri,
        analysis: response.data.analysis,
        serverUrl: serverUrl
      });

    } catch (error) {
      console.error('Submit error:', error.message);
      
      let errorMessage = 'Failed to fetch soil story. ';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage += 'The request timed out. ';
      } else if (error.message.includes('Network Error')) {
        errorMessage += 'Network error - please check your connection. ';
      } else if (error.response) {
        errorMessage += `Server error: ${error.response.status}. `;
      }
      
      errorMessage += 'Would you like to retry with a different server?';
      
      Alert.alert(
        'Error', 
        errorMessage,
        [
          { 
            text: 'Try Again', 
            onPress: async () => {
              setConnectionTested(false);
              await testServerConnection();
              setLoading(false);
            } 
          },
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => setLoading(false)
          }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: THEME.colors.primaryDark}}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primaryDark} />
        
        <ImageBackground
          source={require('../assets/pp1.png')}
          style={styles.backgroundImage}
          imageStyle={{ opacity: 0.9 }}
        >
          <LinearGradient
            colors={THEME.colors.gradient.primary}
            style={styles.background}
          >
            <ScrollView 
              contentContainerStyle={styles.container}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              {/* Header Section */}
              <Animated.View 
                style={[
                  styles.headerContainer, 
                  { opacity: fadeAnim }
                ]}
              >
                <Animated.View 
                  style={[
                    styles.logoContainer,
                    { 
                      transform: [
                        { scale: logoAnim },
                        { rotate: logoAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['-10deg', '0deg']
                          })
                        }
                      ]
                    }
                  ]}
                >
                  <LinearGradient 
                    colors={['rgba(14, 13, 13, 0.9)', 'rgba(240,255,240,0.85)']} 
                    style={styles.logoCircle}
                  >
                    <Image 
                      source={require('../assets/logo3.png')}
                      style={styles.logoImage}
                      resizeMode="contain"
                    />
                  </LinearGradient>
                </Animated.View>
                
                <Animated.Text 
                  style={[
                    styles.appTitle,
                    { 
                      opacity: fadeAnim,
                      transform: [{ translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })}]
                    }
                  ]}
                >
                  SoilSong
                </Animated.Text>
                
                <Animated.Text 
                  style={[
                    styles.subtitle,
                    { 
                      opacity: fadeAnim,
                      transform: [{ translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })}]
                    }
                  ]}
                >
                  Transform your soil data into a story
                </Animated.Text>
              </Animated.View>
              
              {/* Main Input Card */}
              <Animatable.View 
                animation="fadeIn"
                duration={1000}
                delay={300}
                style={styles.cardContainer}
              >
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <MaterialCommunityIcons name="leaf" size={20} color={THEME.colors.primary} />
                    <Text style={styles.cardHeaderText}>Soil Parameters</Text>
                  </View>
                  
                  {/* PH Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Soil pH Level</Text>
                    <View style={styles.inputWithIcon}>
                      <MaterialIcons 
                        name="science" 
                        size={20} 
                        color={THEME.colors.primary} 
                        style={styles.inputIcon}
                      />
                      <TextInput
                        placeholder="Enter pH value (e.g. 6.5)"
                        keyboardType="numeric"
                        value={ph}
                        onChangeText={setPh}
                        style={styles.input}
                        placeholderTextColor={THEME.colors.text.light}
                        maxLength={4}
                      />
                    </View>
                    
                    <View style={styles.pHRangeContainer}>
                      <Text style={styles.inputHint}>Typical range: 3.5 - 9.0</Text>
                      <View style={styles.pHRangeIndicator}>
                        <View style={styles.pHRangeBar}>
                          <View style={styles.pHAcidic} />
                          <View style={styles.pHNeutral} />
                          <View style={styles.pHAlkaline} />
                        </View>
                        <View style={styles.pHLabels}>
                          <Text style={styles.pHLabel}>Acidic</Text>
                          <Text style={styles.pHLabel}>Neutral</Text>
                          <Text style={styles.pHLabel}>Alkaline</Text>
                        </View>
                      </View>
                    </View>

                    <Animated.View 
                      style={[
                        styles.pHValueIndicator,
                        {
                          left: ph ? `${Math.min(Math.max(parseFloat(ph) - 3.5, 0) / 5.5 * 100, 100)}%` : '-100%',
                          opacity: ph ? 1 : 0
                        }
                      ]}
                    >
                      <View style={styles.pHValuePointer} />
                      <View style={styles.pHValueBox}>
                        <Text style={styles.pHValueText}>{ph || '?'}</Text>
                      </View>
                    </Animated.View>
                  </View>
                  
                  {/* Moisture Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Soil Moisture (%)</Text>
                    <View style={styles.inputWithIcon}>
                      <Feather 
                        name="droplet" 
                        size={20} 
                        color={THEME.colors.primary} 
                        style={styles.inputIcon}
                      />
                      <TextInput
                        placeholder="Enter moisture percentage (0-100)"
                        keyboardType="numeric"
                        value={moisture}
                        onChangeText={setMoisture}
                        style={styles.input}
                        placeholderTextColor={THEME.colors.text.light}
                        maxLength={3}
                      />
                    </View>
                    
                    <View style={styles.moistureContainer}>
                      <Text style={styles.inputHint}>0% (dry) to 100% (saturated)</Text>
                      <View style={styles.moistureIndicator}>
                        <View style={styles.moistureBarContainer}>
                          <LinearGradient
                            colors={['#e0f2fe', '#3b82f6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.moistureBar}
                          />
                          <Animated.View 
                            style={[
                              styles.moistureValueIndicator,
                              {
                                left: moisture ? `${Math.min(Math.max(parseInt(moisture), 0), 100)}%` : '-100%',
                                opacity: moisture ? 1 : 0
                              }
                            ]}
                          >
                            <View style={styles.moistureValueDot} />
                          </Animated.View>
                        </View>
                        <View style={styles.moistureLabels}>
                          <Text style={styles.moistureLabel}>Dry</Text>
                          <Text style={styles.moistureLabel}>Moist</Text>
                          <Text style={styles.moistureLabel}>Wet</Text>
                        </View>
                      </View>
                      {moisture && (
                        <Animatable.Text 
                          animation="fadeIn" 
                          style={styles.moistureValueText}
                        >
                          {moisture}% - {getMoistureDescription(moisture)}
                        </Animatable.Text>
                      )}
                    </View>
                  </View>
                  
                  {/* Image Upload */}
                  <View style={styles.imageSection}>
                    <View style={styles.sectionHeader}>
                      <MaterialCommunityIcons name="image" size={20} color={THEME.colors.primary} />
                      <Text style={styles.sectionTitle}>Soil Image</Text>
                      <View style={styles.optionalTag}>
                        <Text style={styles.optionalTagText}>Optional</Text>
                      </View>
                    </View>
                    
                    <Text style={styles.sectionDescription}>
                      Add a photo of your soil for better analysis
                    </Text>
                    
                    <TouchableOpacity 
                      style={styles.uploadButton}
                      onPress={pickImage}
                      activeOpacity={0.7}
                    >
                      <Feather 
                        name={image ? "image" : "upload"} 
                        size={18} 
                        color={THEME.colors.text.accent} 
                      />
                      <Text style={styles.uploadButtonText}>
                        {image ? 'Change Image' : 'Select Image'}
                      </Text>
                    </TouchableOpacity>
                    
                    {image && (
                      <Animatable.View 
                        animation="fadeIn"
                        duration={500}
                        style={styles.imageContainer}
                      >
                        <Image 
                          source={{ uri: image.uri }} 
                          style={styles.image} 
                          resizeMode="cover"
                        />
                        <TouchableOpacity 
                          style={styles.removeImageButton}
                          onPress={() => setImage(null)}
                        >
                          <Feather name="x" size={16} color="white" />
                        </TouchableOpacity>
                      </Animatable.View>
                    )}
                  </View>
                  
                  {/* Submit Button */}
                  <Animated.View style={{ transform: [{ scale: buttonAnim }] }}>
                    <TouchableOpacity 
                      style={styles.submitButton}
                      onPress={handleSubmit}
                      activeOpacity={0.9}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={THEME.colors.gradient.secondary}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <>
                            <Text style={styles.submitButtonText}>Generate Soil Story</Text>
                            <MaterialIcons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </Animatable.View>
              
              <Animatable.View 
                animation="fadeIn"
                delay={800}
                duration={1000}
                style={styles.infoContainer}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.08)']}
                  style={styles.infoCard}
                >
                  <View style={styles.infoHeader}>
                    <MaterialCommunityIcons name="information" size={20} color="white" />
                    <Text style={styles.infoTitle}>What is SoilSong?</Text>
                  </View>
                  <Text style={styles.infoText}>
                    SoilSong analyzes your soil data and converts it into an engaging story and audio experience, providing insights about your soil health and plant recommendations.
                  </Text>
                </LinearGradient>
              </Animatable.View>
              
              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>
                  SoilSong • Transforming data into stories
                </Text>
              </View>
            </ScrollView>
          </LinearGradient>
        </ImageBackground>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Helper function to get moisture description
const getMoistureDescription = (moisture) => {
  const value = parseInt(moisture);
  if (value <= 20) return "Very Dry";
  if (value <= 40) return "Dry";
  if (value <= 60) return "Moist";
  if (value <= 80) return "Wet";
  return "Saturated";
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  container: {
    paddingTop: Platform.OS === 'ios' ? THEME.spacing.l : THEME.spacing.xxl,
    paddingBottom: THEME.spacing.xxl,
    alignItems: 'center',
    minHeight: '100%',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xl,
    width: '100%',
    paddingHorizontal: THEME.spacing.l,
  },
  logoContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: THEME.spacing.l,
    ...THEME.shadows.large,
    overflow: 'hidden',
  },
  logoCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
  },
  appTitle: {
    fontSize: THEME.typography.fontSize.xxxl,
    fontWeight: 'bold',
    color: THEME.colors.text.inverse,
    marginBottom: THEME.spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: THEME.typography.fontSize.m,
    color: THEME.colors.text.inverse,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: '80%',
  },
  cardContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.l,
  },
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xl,
    width: '100%',
    maxWidth: 500,
    ...THEME.shadows.large,
    marginBottom: THEME.spacing.l,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: THEME.spacing.m,
  },
  cardHeaderText: {
    fontSize: THEME.typography.fontSize.l,
    fontWeight: '600',
    color: THEME.colors.text.primary,
    marginLeft: THEME.spacing.s,
  },
  inputGroup: {
    marginBottom: THEME.spacing.l,
    position: 'relative',
  },
  inputLabel: {
    fontSize: THEME.typography.fontSize.m,
    fontWeight: '600',
    marginBottom: THEME.spacing.s,
    color: THEME.colors.text.primary,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.medium,
    borderWidth: 1,
    borderColor: '#e0e6ed',
    overflow: 'hidden',
  },
  inputIcon: {
    paddingHorizontal: THEME.spacing.m,
  },
  input: {
    flex: 1,
    paddingVertical: THEME.spacing.m,
    paddingRight: THEME.spacing.m,
    fontSize: THEME.typography.fontSize.m,
    color: THEME.colors.text.primary,
  },
  inputHint: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.light,
    marginTop: THEME.spacing.xs,
    marginLeft: THEME.spacing.xs,
  },
  
  // pH Range Indicator
  pHRangeContainer: {
    marginTop: THEME.spacing.s,
    marginBottom: 20,
  },
  pHRangeIndicator: {
    marginTop: THEME.spacing.s,
    paddingHorizontal: THEME.spacing.s,
  },
  pHRangeBar: {
    height: 8,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
  },
  pHAcidic: {
    flex: 1,
    backgroundColor: '#ff6b6b',
  },
  pHNeutral: {
    flex: 1,
    backgroundColor: '#7bed9f',
  },
  pHAlkaline: {
    flex: 1,
    backgroundColor: '#70a1ff',
  },
  pHLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: THEME.spacing.xs,
  },
  pHLabel: {
    fontSize: 10,
    color: THEME.colors.text.light,
  },
  pHValueIndicator: {
    position: 'absolute',
    bottom: 0,
    marginLeft: -10,
    alignItems: 'center',
  },
  pHValuePointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderLeftColor: 'transparent',
    borderRightWidth: 6,
    borderRightColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: THEME.colors.primary,
  },
  pHValueBox: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.xs,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.small,
  },
  pHValueText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: THEME.typography.fontSize.xs,
  },
  
  // Moisture Indicator
  moistureContainer: {
    marginTop: THEME.spacing.s,
    position: 'relative',
  },
  moistureIndicator: {
    marginTop: THEME.spacing.s,
    paddingHorizontal: THEME.spacing.s,
  },
  moistureBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  moistureBar: {
    height: '100%',
    width: '100%',
  },
  moistureLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: THEME.spacing.xs,
  },
  moistureLabel: {
    fontSize: 10,
    color: THEME.colors.text.light,
  },
  moistureValueIndicator: {
    position: 'absolute',
    top: -5,
    marginLeft: -5,
  },
  moistureValueDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  moistureValueText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.primary,
    fontWeight: '500',
    marginTop: THEME.spacing.s,
    textAlign: 'center',
  },
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },
  sectionTitle: {
    fontSize: THEME.typography.fontSize.m,
    fontWeight: '600',
    color: THEME.colors.text.primary,
    marginLeft: THEME.spacing.xs,
  },
  optionalTag: {
    backgroundColor: 'rgba(52,152,219,0.1)',
    paddingHorizontal: THEME.spacing.xs,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.small,
    marginLeft: THEME.spacing.s,
  },
  optionalTagText: {
    fontSize: THEME.typography.fontSize.xs,
    color: '#3498db',
  },
  imageSection: {
    marginVertical: THEME.spacing.m,
  },
  sectionDescription: {
    fontSize: THEME.typography.fontSize.s,
    color: THEME.colors.text.secondary,
    marginBottom: THEME.spacing.m,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.background,
    paddingVertical: THEME.spacing.m,
    borderRadius: THEME.borderRadius.medium,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: THEME.colors.primary,
    marginBottom: THEME.spacing.m,
  },
  uploadButtonText: {
    color: THEME.colors.text.accent,
    fontWeight: '500',
    marginLeft: THEME.spacing.s,
  },
  imageContainer: {
    borderRadius: THEME.borderRadius.medium,
    overflow: 'hidden',
    width: '100%',
    height: 200,
    marginBottom: THEME.spacing.m,
    position: 'relative',
    ...THEME.shadows.medium,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: THEME.spacing.s,
    right: THEME.spacing.s,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: THEME.borderRadius.round,
    padding: THEME.spacing.xs,
  },
  submitButton: {
    borderRadius: THEME.borderRadius.large,
    overflow: 'hidden',
    ...THEME.shadows.medium,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.l,
  },
  submitButtonText: {
    color: THEME.colors.text.inverse,
    fontWeight: 'bold',
    fontSize: THEME.typography.fontSize.l,
  },
  buttonIcon: {
    marginLeft: THEME.spacing.s,
  },
  
  // Info Card
  infoContainer: {
    width: '100%',
    paddingHorizontal: THEME.spacing.l,
    marginBottom: THEME.spacing.m,
  },
  infoCard: {
    borderRadius: THEME.borderRadius.large,
    padding: THEME.spacing.l,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    ...THEME.shadows.medium,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.s,
  },
  infoTitle: {
    fontSize: THEME.typography.fontSize.m,
    fontWeight: '600',
    color: THEME.colors.text.inverse,
    marginLeft: THEME.spacing.xs,
  },
  infoText: {
    fontSize: THEME.typography.fontSize.s,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: THEME.typography.lineHeight.s,
  },
  
  footerContainer: {
    marginTop: THEME.spacing.l,
    marginBottom: THEME.spacing.xl,
    opacity: 0.7,
  },
  footerText: {
    color: THEME.colors.text.inverse,
    textAlign: 'center',
    fontSize: THEME.typography.fontSize.s,
  },
});
