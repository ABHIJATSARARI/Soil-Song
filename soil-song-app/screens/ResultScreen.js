import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  AppState, 
  Platform,
  Animated, 
  Dimensions,
  Image,
  Share,
  SafeAreaView,
  StatusBar,
  ImageBackground
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import { API_BASE_URL, THEME } from '../config';
import NetInfo from '@react-native-community/netinfo';
import { MaterialIcons, Feather, FontAwesome5, Ionicons, AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';

const { width, height } = Dimensions.get('window');
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function ResultScreen({ route, navigation }) {
  const { story, audioUri, analysis, serverUrl } = route.params;
  const baseUrl = serverUrl || API_BASE_URL;
  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [audioError, setAudioError] = useState(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [rate, setRate] = useState(1.0);
  const [retryCount, setRetryCount] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('story');
  const [expandedItem, setExpandedItem] = useState(null);
  const appStateRef = useRef(AppState.currentState);
  const soundRef = useRef(sound);
  const isPlayingRef = useRef(isPlaying);
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const storyOpacity = useRef(new Animated.Value(1)).current;
  const analysisOpacity = useRef(new Animated.Value(0)).current;
  const fullAudioUriRef = useRef('');
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    soundRef.current = sound;
    isPlayingRef.current = isPlaying;
  }, [sound, isPlaying]);

  const fullAudioUri = audioUri?.startsWith('http') 
    ? audioUri 
    : `${baseUrl}${audioUri}`;
    
  useEffect(() => {
    if (fullAudioUri !== fullAudioUriRef.current) {
      console.log('Audio URI:', fullAudioUri);
      fullAudioUriRef.current = fullAudioUri;
    }
  }, [fullAudioUri]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkStatus(state);
      if (state.isConnected && audioError && retryCount < 3) {
        retryAudio();
      }
    });
    return () => unsubscribe();
  }, [audioError, retryCount]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    async function setupAudio() {
      console.log('Setting up audio...');
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          // Fix: Using correct integer values for interruption modes
          interruptionModeIOS: 1, // 1 = Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX
          interruptionModeAndroid: 1, // 1 = Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX
        });
        console.log('Audio mode set successfully');
      } catch (error) {
        console.error('Error setting audio mode:', error);
      }
    }

    setupAudio();
    return () => {
      if (sound) {
        console.log('Unloading sound...');
        sound.unloadAsync();
      }
    };
  }, []);

  const handleAppStateChange = async (nextAppState) => {
    if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
      if (soundRef.current && isPlayingRef.current) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            setPosition(status.positionMillis);
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
          }
        } catch (err) {
          console.error('Error saving position:', err);
        }
      }
    } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      if (soundRef.current) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (!status.isLoaded) {
            loadSound();
          }
        } catch (err) {
          console.error('Error checking sound status on foreground:', err);
          loadSound();
        }
      }
    }
    appStateRef.current = nextAppState;
  };

  useEffect(() => {
    if (fullAudioUri) {
      loadSound();
    }
    const intervalId = setInterval(updateAudioStatus, 500);
    return () => {
      clearInterval(intervalId);
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [fullAudioUri]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (sound && isPlaying) {
        sound.pauseAsync().catch(err => console.error('Error pausing on navigation:', err));
      }
    });
    return unsubscribe;
  }, [navigation, sound, isPlaying]);

  const updateAudioStatus = async () => {
    if (sound) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          setPosition(status.positionMillis);
          setDuration(status.durationMillis);
          setIsPlaying(status.isPlaying);
        }
      } catch (err) {
        console.error('Error getting audio status:', err);
      }
    }
  };

  const formatTime = (millis) => {
    if (!millis) return '00:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  async function loadSound() {
    if (!fullAudioUri) {
      setAudioError("No audio available");
      setIsLoading(false);
      setIsBuffering(false);
      return;
    }
    
    console.log('Loading sound from:', fullAudioUri);
    setIsLoading(true);
    setAudioError(null);
    
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('No internet connection. Please check your connection and try again.');
      }
      
      if (sound) {
        await sound.unloadAsync();
      }
      
      // Create a new sound instance with the enhanced playback status update callback
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: fullAudioUri },
        { 
          shouldPlay: false, 
          progressUpdateIntervalMillis: 200, // More frequent updates
          positionMillis: position > 0 ? position : 0
        },
        onPlaybackStatusUpdate
      );
      
      console.log('Sound loaded successfully');
      setSound(newSound);
      setIsLoading(false);
      
      // Check initial status immediately after loading
      const initialStatus = await newSound.getStatusAsync();
      if (initialStatus.isLoaded) {
        console.log('Initial status loaded, duration:', initialStatus.durationMillis);
        setDuration(initialStatus.durationMillis || 0);
        // Ensure buffering is set to false once initial load completes
        setIsBuffering(false);
      }
      
      return newSound;
    } catch (err) {
      console.error('Error loading sound:', err.message);
      setIsLoading(false);
      setIsBuffering(false);
      setAudioError(`Error loading audio: ${err.message}`);
      
      // Implement exponential backoff for retries
      if (retryCount < 3) {
        const backoffTime = Math.pow(2, retryCount) * 1000;
        setRetryCount(retryCount + 1);
        setTimeout(() => loadSound(), backoffTime);
      }
      
      return null;
    }
  }

  const playPause = async () => {
    try {
      if (!sound) {
        await loadSound();
        return;
      }
      
      console.log('Play/Pause pressed');
      const status = await sound.getStatusAsync();
      
      if (!status.isLoaded) {
        console.log('Sound not loaded, reloading...');
        await loadSound();
        return;
      }
      
      if (status.isPlaying) {
        console.log('Pausing playback');
        await sound.pauseAsync();
        setIsPlaying(false);
        setIsBuffering(false); // Ensure buffering state is reset when pausing
      } else {
        console.log('Starting playback');
        // Only set buffering true if we're not already playing
        if (!isPlaying) setIsBuffering(true);
        
        try {
          await sound.playAsync();
          // If playAsync succeeds immediately without throwing, update the state
          setIsPlaying(true);
          
          // Get updated status after playing
          const updatedStatus = await sound.getStatusAsync();
          if (!updatedStatus.isBuffering) {
            setIsBuffering(false);
          }
        } catch (playError) {
          console.error('Error during playback start:', playError);
          // Reset states if play fails
          setIsBuffering(false);
          setIsPlaying(false);
          throw playError; // Rethrow to be caught by outer try/catch
        }
      }
    } catch (error) {
      console.error('Playback error:', error);
      // Reset all states on error
      setIsBuffering(false);
      setIsPlaying(false);
      Alert.alert('Playback Error', 'Failed to control audio playback. Trying to reload...');
      loadSound();
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      
      // Track buffering state changes
      if (status.isBuffering !== isBuffering) {
        console.log('Buffering state changed to:', status.isBuffering);
        setIsBuffering(status.isBuffering);
      }
      
      // Set playing state based on status
      setIsPlaying(status.isPlaying);
      
      if (status.didJustFinish && !status.isLooping) {
        console.log('Playback finished');
        setIsPlaying(false);
        setPosition(0);
        // Make sure we're not stuck in buffering state at the end
        setIsBuffering(false);
      }
    } else if (status.error) {
      console.error('Playback status error:', status.error);
      setAudioError(`Playback error: ${status.error}`);
      // Reset buffering state on error
      setIsBuffering(false);
    }
  };

  const retryAudio = () => {
    console.log('Retrying audio load...');
    setRetryCount(0);
    loadSound();
  };

  const seekAudio = async (value) => {
    if (sound) {
      try {
        console.log('Seeking to position:', value);
        await sound.setPositionAsync(value);
        setPosition(value);
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  };

  const toggleExpandItem = (itemId) => {
    if (expandedItem === itemId) {
      setExpandedItem(null);
    } else {
      setExpandedItem(itemId);
    }
  };

  const renderHealthScore = () => {
    if (!analysis || !analysis.soil_health) return null;
    const { score, category, max_score } = analysis.soil_health;
    const percentage = (score / max_score) * 100;
    
    let color, icon, statusText;
    if (score >= 80) {
      color = '#44c767';
      icon = 'check-circle';
      statusText = 'Excellent';
    } else if (score >= 60) {
      color = '#83af71';
      icon = 'thumbs-up';
      statusText = 'Good';
    } else if (score >= 40) {
      color = '#ffb347';
      icon = 'alert-circle';
      statusText = 'Fair';
    } else if (score >= 20) {
      color = '#ff6961';
      icon = 'alert-triangle';
      statusText = 'Poor';
    } else {
      color = '#c23934';
      icon = 'x-circle';
      statusText = 'Very Poor';
    }
    
    return (
      <Animatable.View 
        animation="fadeInUp" 
        duration={800} 
        delay={100}
        style={styles.healthScoreSection}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', 'rgba(240,247,255,0.95)']}
          style={styles.gradientBackground}
        >
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="leaf" size={24} color={THEME.colors.primary} />
            <Text style={styles.sectionTitle}>Soil Health Score</Text>
          </View>
          
          <View style={styles.scoreContainer}>
            <View style={[styles.scoreCircleContainer, { borderColor: color }]}>
              <LinearGradient
                colors={[`${color}20`, `${color}50`]}
                style={styles.scoreCircle}
              >
                <Text style={styles.scoreText}>{score}</Text>
                <Text style={styles.scoreMax}>/{max_score}</Text>
                <Feather name={icon} size={24} color={color} style={styles.scoreIcon} />
              </LinearGradient>
            </View>
            
            <View style={styles.scoreDetailsContainer}>
              <Text style={[styles.categoryText, {color}]}>
                {category ? (category.charAt(0).toUpperCase() + category.slice(1)) : statusText}
              </Text>
              
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBg}>
                  <Animated.View 
                    style={[
                      styles.progressBar, 
                      {
                        width: `${percentage}%`, 
                        backgroundColor: color
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.percentageText}>{Math.round(percentage)}%</Text>
              </View>
              
              <Text style={styles.scoreDescription}>
                {getSoilHealthDescription(score, max_score)}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animatable.View>
    );
  };

  const getSoilHealthDescription = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 80) {
      return 'Your soil is in excellent condition and optimal for growing most plants.';
    } else if (percentage >= 60) {
      return 'Your soil is healthy with room for minor improvements.';
    } else if (percentage >= 40) {
      return 'Your soil needs moderate improvements to reach optimal growing conditions.';
    } else if (percentage >= 20) {
      return 'Your soil has significant issues that need to be addressed.';
    } else {
      return 'Your soil has severe issues requiring immediate intervention.';
    }
  };

  const renderIssues = () => {
    if (!analysis || !analysis.issues || analysis.issues.length === 0) return null;
    
    return (
      <Animatable.View 
        animation="fadeInUp" 
        duration={800} 
        delay={200}
        style={styles.issuesSection}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', 'rgba(255,245,245,0.95)']}
          style={styles.gradientBackground}
        >
          <View style={styles.sectionHeaderRow}>
            <MaterialIcons name="warning" size={24} color="#e74c3c" />
            <Text style={styles.sectionTitle}>Identified Issues</Text>
          </View>
          
          {analysis.issues.map((issue, index) => (
            <Animatable.View 
              key={index} 
              animation="fadeIn" 
              delay={300 + index * 100}
              style={[styles.issueItem, 
                index === analysis.issues.length - 1 ? null : styles.issueItemBorder
              ]}
            >
              <View style={[styles.severityIndicator, 
                {backgroundColor: issue.severity === 'high' ? '#ff6961' : '#ffb347'}]} />
              <View style={styles.issueContent}>
                <Text style={styles.issueText}>{issue.description}</Text>
                <Text style={styles.issueSeverity}>
                  Severity: {issue.severity === 'high' ? 'High' : 'Medium'}
                </Text>
              </View>
              <View style={styles.issueIconContainer}>
                <MaterialIcons 
                  name={issue.severity === 'high' ? "priority-high" : "info"} 
                  size={24} 
                  color={issue.severity === 'high' ? '#ff6961' : '#ffb347'} 
                />
              </View>
            </Animatable.View>
          ))}
        </LinearGradient>
      </Animatable.View>
    );
  };

  const renderRecommendations = () => {
    if (!analysis || !analysis.recommendations || analysis.recommendations.length === 0) return null;
    
    return (
      <Animatable.View 
        animation="fadeInUp" 
        duration={800} 
        delay={300}
        style={styles.recommendationsSection}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', 'rgba(245,255,245,0.95)']}
          style={styles.gradientBackground}
        >
          <View style={styles.sectionHeaderRow}>
            <MaterialIcons name="lightbulb" size={24} color="#2ecc71" />
            <Text style={styles.sectionTitle}>Recommendations</Text>
          </View>
          
          {analysis.recommendations.map((rec, index) => (
            <TouchableOpacity 
              key={index} 
              style={[
                styles.recommendationItem,
                index === analysis.recommendations.length - 1 ? null : styles.recommendationItemBorder
              ]}
              onPress={() => toggleExpandItem(`rec-${index}`)}
              activeOpacity={0.7}
            >
              <View style={styles.recommendationHeader}>
                <View style={styles.recommendationNumber}>
                  <Text style={styles.recommendationNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.recommendationTitle}>{rec.action}</Text>
                <MaterialIcons 
                  name={expandedItem === `rec-${index}` ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color={THEME.colors.primary}
                  style={styles.expandIcon} 
                />
              </View>
              
              {expandedItem === `rec-${index}` && (
                <Animatable.View
                  animation="fadeIn"
                  duration={300}
                  style={styles.recommendationDetails}
                >
                  <Text style={styles.recommendationDetailsText}>{rec.details}</Text>
                </Animatable.View>
              )}
            </TouchableOpacity>
          ))}
        </LinearGradient>
      </Animatable.View>
    );
  };

  const renderSuitablePlants = () => {
    if (!analysis || !analysis.suitable_plants || analysis.suitable_plants.length === 0) return null;
    
    return (
      <Animatable.View 
        animation="fadeInUp" 
        duration={800} 
        delay={400}
        style={styles.plantsSection}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', 'rgba(240,255,240,0.95)']}
          style={styles.gradientBackground}
        >
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="sprout" size={24} color="#27ae60" />
            <Text style={styles.sectionTitle}>Suitable Plants</Text>
          </View>
          
          <Text style={styles.plantsSectionDescription}>
            Based on your soil analysis, these plants are likely to thrive in your soil conditions:
          </Text>
          
          <View style={styles.plantsContainer}>
            {analysis.suitable_plants.map((plant, index) => (
              <Animatable.View 
                key={index} 
                animation="zoomIn"
                delay={500 + index * 100}
                style={styles.plantChip}
              >
                <MaterialCommunityIcons name="flower" size={16} color={THEME.colors.primary} style={styles.plantIcon} />
                <Text style={styles.plantText}>
                  {plant ? (plant.charAt(0).toUpperCase() + plant.slice(1)) : ''}
                </Text>
              </Animatable.View>
            ))}
          </View>
        </LinearGradient>
      </Animatable.View>
    );
  };

  const AudioPlayerUI = () => {
    const audioAvailable = !!fullAudioUri && !isLoading;
    const formattedPosition = formatTime(position);
    const formattedDuration = formatTime(duration);
    
    return (
      <Animatable.View 
        animation="fadeIn"
        duration={1000}
        delay={300}
        style={styles.audioPlayerContainer}
      >
        <LinearGradient
          colors={['rgba(52,152,219,0.1)', 'rgba(52,152,219,0.2)']}
          style={styles.audioGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.audioHeaderRow}>
            <MaterialIcons name="music-note" size={22} color="#3498db" />
            <Text style={styles.audioPlayerTitle}>Soil Story Audio</Text>
          </View>
          
          {isLoading ? (
            <View style={styles.audioLoadingContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.loadingText}>Preparing audio...</Text>
            </View>
          ) : audioError ? (
            <View style={styles.audioErrorContainer}>
              <MaterialIcons name="error-outline" size={32} color="#e74c3c" />
              <Text style={styles.errorText}>{audioError}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={retryAudio}
              >
                <LinearGradient
                  colors={['#3498db', '#2980b9']}
                  style={styles.retryButtonGradient}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : audioAvailable ? (
            <View style={styles.playerControlsContainer}>
              <View style={styles.audioControlRow}>
                <TouchableOpacity
                  style={styles.rewindButton}
                  onPress={() => seekAudio(Math.max(0, position - 10000))}
                  disabled={isBuffering}
                >
                  <MaterialIcons name="replay-10" size={28} color={isBuffering ? "#95a5a6" : "#3498db"} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.playPauseButton}
                  onPress={playPause}
                  disabled={isBuffering}
                >
                  <LinearGradient
                    colors={isBuffering ? ['#95a5a6', '#7f8c8d'] : ['#3498db', '#2980b9']}
                    style={styles.playPauseGradient}
                  >
                    {isBuffering ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <MaterialIcons
                        name={isPlaying ? "pause" : "play-arrow"}
                        size={28}
                        color="white"
                      />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.forwardButton}
                  onPress={() => seekAudio(Math.min(duration, position + 10000))}
                  disabled={isBuffering}
                >
                  <MaterialIcons name="forward-10" size={28} color={isBuffering ? "#95a5a6" : "#3498db"} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.progressContainer}>
                <Text style={styles.timeText}>{formattedPosition}</Text>
                <Slider
                  style={styles.progressBar}
                  minimumValue={0}
                  maximumValue={duration > 0 ? duration : 1}
                  value={position}
                  minimumTrackTintColor="#3498db"
                  maximumTrackTintColor="rgba(189,195,199,0.5)"
                  thumbTintColor="#3498db"
                  onSlidingComplete={seekAudio}
                  disabled={isBuffering}
                />
                <Text style={styles.timeText}>{formattedDuration}</Text>
              </View>
              
              {isBuffering && (
                <View style={styles.bufferingContainer}>
                  <ActivityIndicator size="small" color="#3498db" style={{marginRight: 8}} />
                  <Text style={styles.bufferingText}>Buffering audio...</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noAudioContainer}>
              <MaterialIcons name="audiotrack" size={32} color="#95a5a6" />
              <Text style={styles.noAudioText}>No audio available</Text>
            </View>
          )}
        </LinearGradient>
      </Animatable.View>
    );
  };

  const changeTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (tab === 'story') {
      Animated.timing(storyOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      Animated.timing(analysisOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(storyOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      Animated.timing(analysisOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const shareStory = async () => {
    try {
      await Share.share({
        message: `${story}\n\nAnalyzed with SoilSong App`,
        title: 'My Soil Story'
      });
    } catch (error) {
      console.error('Error sharing story:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primaryDark} />
      <View style={styles.container}>
        <LinearGradient
          colors={THEME.colors.gradient.primary}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={THEME.colors.text.inverse} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Soil Analysis Results</Text>
            <TouchableOpacity 
              style={styles.shareHeaderButton}
              onPress={shareStory}
            >
              <Feather name="share-2" size={22} color={THEME.colors.text.inverse} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'story' && styles.activeTab]}
              onPress={() => changeTab('story')}
            >
              <Text style={[styles.tabText, activeTab === 'story' && styles.activeTabText]}>
                Story
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'analysis' && styles.activeTab]}
              onPress={() => changeTab('analysis')}
            >
              <Text style={[styles.tabText, activeTab === 'analysis' && styles.activeTabText]}>
                Analysis
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
        
        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <Animated.View 
            style={[
              styles.storyContent, 
              { display: activeTab === 'story' ? 'flex' : 'none', opacity: storyOpacity }
            ]}
          >
            <Animated.View 
              style={[
                styles.storyCard, 
                { transform: [{ translateY: slideAnim }], opacity: fadeAnim }
              ]}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.9)', 'rgba(240,248,255,0.95)']}
                style={styles.storyGradient}
              >
                <View style={styles.storyCardDecoration}>
                  <MaterialCommunityIcons name="chat-processing" size={20} color={THEME.colors.primary} />
                </View>
                
                <View style={styles.storyCardHeader}>
                  <MaterialCommunityIcons name="book-open-variant" size={24} color={THEME.colors.primary} />
                  <Text style={styles.storySectionTitle}>Your Soil's Story</Text>
                </View>
                
                <View style={styles.storyTextContainer}>
                  <Text style={styles.storyText}>{story}</Text>
                  
                  <View style={styles.storyFooter}>
                    <View style={styles.storyDivider} />
                    <Text style={styles.storyFooterText}>
                      Generated based on your soil parameters
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
            
            {AudioPlayerUI()}
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.analysisContent, 
              { display: activeTab === 'analysis' ? 'flex' : 'none', opacity: analysisOpacity }
            ]}
          >
            {renderHealthScore()}
            {renderIssues()}
            {renderRecommendations()}
            {renderSuitablePlants()}
          </Animated.View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.newAnalysisButton}
              onPress={() => navigation.navigate('SoilSong')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={THEME.colors.gradient.secondary}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add-circle-outline" size={18} color={THEME.colors.text.inverse} style={{ marginRight: 8 }} />
                <Text style={styles.newAnalysisButtonText}>New Analysis</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 10 : THEME.spacing.xl,
    paddingBottom: THEME.spacing.m,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.l,
    marginBottom: THEME.spacing.m,
  },
  backButton: {
    padding: THEME.spacing.xs,
  },
  headerTitle: {
    fontSize: THEME.typography.fontSize.l,
    fontWeight: 'bold',
    color: THEME.colors.text.inverse,
    textAlign: 'center',
  },
  shareHeaderButton: {
    padding: THEME.spacing.xs,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.xl,
    justifyContent: 'space-around',
  },
  tab: {
    paddingVertical: THEME.spacing.s,
    paddingHorizontal: THEME.spacing.l,
    borderRadius: THEME.borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    minWidth: 100,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: THEME.colors.text.inverse,
    ...THEME.shadows.small,
  },
  tabText: {
    color: THEME.colors.text.inverse,
    fontWeight: '600',
    fontSize: THEME.typography.fontSize.m,
  },
  activeTabText: {
    color: THEME.colors.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: THEME.spacing.xl,
  },
  storyContent: {
    padding: THEME.spacing.m,
  },
  analysisContent: {
    padding: THEME.spacing.m,
  },
  
  storyCard: {
    borderRadius: THEME.borderRadius.large,
    overflow: 'hidden',
    ...THEME.shadows.medium,
  },
  storyGradient: {
    padding: THEME.spacing.l,
    borderRadius: THEME.borderRadius.large,
    position: 'relative',
  },
  storyCardDecoration: {
    position: 'absolute',
    top: THEME.spacing.s,
    right: THEME.spacing.s,
    opacity: 0.5,
  },
  storyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.m,
  },
  storySectionTitle: {
    fontSize: THEME.typography.fontSize.xl,
    fontWeight: '600',
    color: THEME.colors.text.primary,
    marginLeft: THEME.spacing.s,
  },
  storyTextContainer: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: THEME.spacing.m,
    borderRadius: THEME.borderRadius.medium,
  },
  storyText: {
    fontSize: THEME.typography.fontSize.m,
    color: THEME.colors.text.primary,
    lineHeight: THEME.typography.lineHeight.m,
    fontStyle: 'italic',
  },
  storyFooter: {
    marginTop: THEME.spacing.m,
    alignItems: 'center',
  },
  storyDivider: {
    height: 1,
    width: '40%',
    backgroundColor: THEME.colors.primary,
    opacity: 0.5,
    marginBottom: THEME.spacing.s,
  },
  storyFooterText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontStyle: 'italic',
  },
  
  audioPlayerContainer: {
    marginTop: THEME.spacing.l,
    borderRadius: THEME.borderRadius.large,
    overflow: 'hidden',
    ...THEME.shadows.medium,
  },
  audioGradient: {
    padding: THEME.spacing.l,
    borderRadius: THEME.borderRadius.large,
  },
  audioHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.m,
  },
  audioPlayerTitle: {
    fontSize: THEME.typography.fontSize.l,
    fontWeight: '600',
    marginLeft: THEME.spacing.xs,
    color: '#3498db',
  },
  audioLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.l,
  },
  loadingText: {
    marginTop: THEME.spacing.m,
    fontSize: THEME.typography.fontSize.s,
    color: THEME.colors.text.secondary,
  },
  audioErrorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.l,
  },
  errorText: {
    marginTop: THEME.spacing.m,
    fontSize: THEME.typography.fontSize.s,
    color: '#e74c3c',
    marginBottom: THEME.spacing.m,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: THEME.borderRadius.medium,
    overflow: 'hidden',
    ...THEME.shadows.small,
  },
  retryButtonGradient: {
    paddingVertical: THEME.spacing.s,
    paddingHorizontal: THEME.spacing.l,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: THEME.typography.fontSize.s,
  },
  playerControlsContainer: {
    alignItems: 'center',
    padding: THEME.spacing.m,
  },
  audioControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: THEME.spacing.m,
  },
  rewindButton: {
    padding: THEME.spacing.s,
    marginRight: THEME.spacing.l,
  },
  playPauseButton: {
    borderRadius: 30,
    overflow: 'hidden',
    ...THEME.shadows.small,
    marginHorizontal: THEME.spacing.l,
  },
  playPauseGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forwardButton: {
    padding: THEME.spacing.s,
    marginLeft: THEME.spacing.l,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: THEME.spacing.s,
  },
  progressBar: {
    flex: 1,
    height: 40,
    marginHorizontal: THEME.spacing.s,
  },
  timeText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    minWidth: 40,
    textAlign: 'center',
  },
  bufferingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: THEME.spacing.s,
  },
  bufferingText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
  },
  noAudioContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.l,
  },
  noAudioText: {
    marginTop: THEME.spacing.s,
    fontSize: THEME.typography.fontSize.s,
    color: THEME.colors.text.light,
  },
  
  gradientBackground: {
    padding: THEME.spacing.l,
    borderRadius: THEME.borderRadius.large,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.m,
  },
  sectionTitle: {
    fontSize: THEME.typography.fontSize.l,
    fontWeight: '600',
    marginLeft: THEME.spacing.s,
    color: THEME.colors.text.primary,
  },
  
  healthScoreSection: {
    marginBottom: THEME.spacing.l,
    borderRadius: THEME.borderRadius.large,
    overflow: 'hidden',
    ...THEME.shadows.medium,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: THEME.borderRadius.medium,
    padding: THEME.spacing.m,
  },
  scoreCircleContainer: {
    borderWidth: 3,
    borderRadius: 45,
    padding: 3,
    marginRight: THEME.spacing.l,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  scoreText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: THEME.colors.text.primary,
  },
  scoreMax: {
    fontSize: 14,
    color: THEME.colors.text.secondary,
  },
  scoreIcon: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
  },
  scoreDetailsContainer: {
    flex: 1,
  },
  categoryText: {
    fontSize: THEME.typography.fontSize.l,
    fontWeight: 'bold',
    marginBottom: THEME.spacing.s,
  },
  progressBarContainer: {
    marginBottom: THEME.spacing.s,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#e0e6ed',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  percentageText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  scoreDescription: {
    fontSize: THEME.typography.fontSize.s,
    color: THEME.colors.text.secondary,
    marginTop: THEME.spacing.s,
  },
  
  issuesSection: {
    marginBottom: THEME.spacing.l,
    borderRadius: THEME.borderRadius.large,
    overflow: 'hidden',
    ...THEME.shadows.medium,
  },
  issueItem: {
    flexDirection: 'row',
    padding: THEME.spacing.m,
    backgroundColor: 'rgba(255,255,255,0.7)',
    marginBottom: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.medium,
  },
  issueItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  severityIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: THEME.spacing.s,
    marginTop: 3,
  },
  issueContent: {
    flex: 1,
  },
  issueText: {
    fontSize: THEME.typography.fontSize.m,
    color: THEME.colors.text.primary,
    marginBottom: 4,
  },
  issueSeverity: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.light,
  },
  issueIconContainer: {
    justifyContent: 'center',
    paddingLeft: THEME.spacing.s,
  },
  
  recommendationsSection: {
    marginBottom: THEME.spacing.l,
    borderRadius: THEME.borderRadius.large,
    overflow: 'hidden',
    ...THEME.shadows.medium,
  },
  recommendationItem: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: THEME.borderRadius.medium,
    marginBottom: THEME.spacing.xs,
    overflow: 'hidden',
  },
  recommendationItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.m,
  },
  recommendationNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.s,
  },
  recommendationNumberText: {
    color: 'white',
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: 'bold',
  },
  recommendationTitle: {
    flex: 1,
    fontSize: THEME.typography.fontSize.m,
    fontWeight: '500',
    color: THEME.colors.text.primary,
  },
  expandIcon: {
    marginLeft: THEME.spacing.s,
  },
  recommendationDetails: {
    padding: THEME.spacing.m,
    paddingTop: 0,
    backgroundColor: 'rgba(245,255,245,0.7)',
  },
  recommendationDetailsText: {
    fontSize: THEME.typography.fontSize.s,
    color: THEME.colors.text.secondary,
    lineHeight: THEME.typography.lineHeight.s,
  },
  
  plantsSection: {
    marginBottom: THEME.spacing.l,
    borderRadius: THEME.borderRadius.large,
    overflow: 'hidden',
    ...THEME.shadows.medium,
  },
  plantsSectionDescription: {
    fontSize: THEME.typography.fontSize.s,
    color: THEME.colors.text.secondary,
    marginBottom: THEME.spacing.m,
    paddingHorizontal: THEME.spacing.s,
  },
  plantsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: THEME.borderRadius.medium,
    padding: THEME.spacing.s,
  },
  plantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(84,160,120,0.1)',
    paddingVertical: THEME.spacing.s,
    paddingHorizontal: THEME.spacing.m,
    borderRadius: 20,
    margin: THEME.spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(84,160,120,0.2)',
  },
  plantIcon: {
    marginRight: 4,
  },
  plantText: {
    color: THEME.colors.primary,
    fontWeight: '500',
    fontSize: THEME.typography.fontSize.s,
  },
  
  buttonContainer: {
    alignItems: 'center',
    marginTop: THEME.spacing.m,
    marginBottom: THEME.spacing.xl,
  },
  newAnalysisButton: {
    borderRadius: THEME.borderRadius.large,
    overflow: 'hidden',
    ...THEME.shadows.medium,
  },
  gradientButton: {
    paddingVertical: THEME.spacing.m,
    paddingHorizontal: THEME.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newAnalysisButtonText: {
    color: THEME.colors.text.inverse,
    fontWeight: '600',
    fontSize: THEME.typography.fontSize.m,
  },
});
