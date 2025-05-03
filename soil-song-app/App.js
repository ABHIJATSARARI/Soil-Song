import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { 
  View, 
  Image, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  StatusBar 
} from 'react-native';
import HomeScreen from './screens/HomeScreen';
import ResultScreen from './screens/ResultScreen';
import * as SplashScreen from 'expo-splash-screen';

// Prevent native splash screen from auto hiding
SplashScreen.preventAutoHideAsync();

const Stack = createStackNavigator();
const { width, height } = Dimensions.get('window');

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Prepare app (you can load fonts, make API calls, etc. here)
    const prepare = async () => {
      try {
        // Simulate a loading time for the animation to be visible
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (e) {
        console.warn(e);
      } finally {
        // Start animations
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start(async () => {
          // Wait for animation to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          // Hide splash screen
          await SplashScreen.hideAsync();
          // Set app as ready
          setIsAppReady(true);
        });
      }
    };

    prepare();
  }, []);

  if (!isAppReady) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar translucent backgroundColor="transparent" />
        <Animated.View 
          style={{ 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          <Image
            source={require('./assets/logo2.png')}
            style={styles.splashImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" />
      <Stack.Navigator 
        initialRouteName="SoilSong"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#3498db',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="SoilSong" 
          component={HomeScreen} 
          options={{
            title: 'SoilSong',
            headerTitleAlign: 'center',
          }}
        />
        <Stack.Screen 
          name="Result" 
          component={ResultScreen} 
          options={{
            title: 'Results',
            headerTitleAlign: 'center',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashImage: {
    width: width * 0.7,
    height: height * 0.3,
  },
});
