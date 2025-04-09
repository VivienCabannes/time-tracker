import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  FlatList,
  Platform,
  Alert,
  Share
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import yaml from 'js-yaml';
import * as FileSystem from 'expo-file-system';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem
} from '@react-navigation/drawer';

// Keys and default configuration
const CONFIG_KEY = 'activityConfig';
const THEME_KEY = 'appTheme';
const DEFAULT_THEME = 'light';
const DEFAULT_CONFIG = { activities: ['Work', 'Break', 'Exercise'] };

// Use the storage key from the second option for logs.
const LOGS_KEY = '@activity_logs';

//
// Styles generator (same as before)
//
const getStyles = (theme) => {
  const isDark = theme === 'dark';
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#282828' : '#fff',
      padding: 16,
    },
    header: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#ccc' : '#000',
      marginBottom: 20,
    },
    buttonContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-around',
      marginBottom: 20,
    },
    activityButton: {
      backgroundColor: '#007aff',
      padding: 10,
      margin: 5,
      borderRadius: 8,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
    },
    addCommentText: {
      color: isDark ? '#ccc' : '#007aff',
      fontSize: 18,
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
      backgroundColor: isDark ? '#444' : '#fff',
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    commentInput: {
      flex: 1,
      borderColor: isDark ? '#ccc' : '#000',
      borderWidth: 1,
      borderRadius: 8,
      padding: 8,
      color: isDark ? '#fff' : '#000',
      backgroundColor: isDark ? '#333' : '#fff',
    },
    submitButton: {
      marginLeft: 10,
      backgroundColor: '#007aff',
      borderRadius: 20,
      padding: 10,
    },
    submitButtonText: {
      color: '#fff',
      fontSize: 20,
    },
    logItem: {
      padding: 10,
      borderBottomWidth: 1,
      borderColor: isDark ? '#555' : '#ccc',
    },
    logText: {
      color: isDark ? '#ccc' : '#000',
      fontSize: 16,
    },
    commentText: {
      color: isDark ? '#aaa' : '#555',
      fontSize: 14,
      marginLeft: 10,
    },
    label: {
      fontSize: 16,
      color: isDark ? '#ccc' : '#000',
      marginBottom: 8,
    },
    yamlInput: {
      borderColor: isDark ? '#ccc' : '#000',
      borderWidth: 1,
      borderRadius: 8,
      padding: 8,
      color: isDark ? '#fff' : '#000',
      marginBottom: 20,
    },
    themeSelector: {
      flexDirection: 'row',
      marginBottom: 20,
    },
    radioOption: {
      marginRight: 20,
    },
    radioText: {
      fontSize: 16,
      color: isDark ? '#ccc' : '#000',
    },
    saveButton: {
      backgroundColor: '#007aff',
      padding: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
    },
    drawerContainer: {
      backgroundColor: isDark ? '#282828' : '#fff',
    },
    drawerLabel: {
      color: isDark ? '#ccc' : '#000',
      fontSize: 16,
    },
  });
};

//
// Logging and export helper functions (from the second option)
//
const loadLogsFromStorage = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(LOGS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Error reading logs:', error);
    return [];
  }
};

const saveLogsToStorage = async (logs) => {
  try {
    const jsonValue = JSON.stringify(logs);
    await AsyncStorage.setItem(LOGS_KEY, jsonValue);
  } catch (error) {
    console.error('Error saving logs:', error);
  }
};

const exportLogsFunction = async (logs, clearLogsCallback) => {
  const logString = JSON.stringify(logs, null, 2);
  try {
    if (Platform.OS === 'web') {
      const blob = new Blob([logString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'activity_logs.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const fileUri = FileSystem.documentDirectory + 'activity_logs.json';
      await FileSystem.writeAsStringAsync(fileUri, logString);
      await Share.share({ url: fileUri });
    }
    await AsyncStorage.removeItem(LOGS_KEY);
    clearLogsCallback();
    Alert.alert('Success', 'Logs exported and cleared.');
  } catch (error) {
    console.error('Error exporting logs:', error);
    Alert.alert('Export Error', 'Failed to export logs.');
  }
};

//
// Home Screen: Uses the design from the first option with updated logging logic.
//
function HomeScreen({ navigation, config, theme, reloadFlag }) {
  const [logs, setLogs] = useState([]);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const styles = getStyles(theme);

  // Reload logs whenever reloadFlag changes.
  useEffect(() => {
    (async () => {
      const loadedLogs = await loadLogsFromStorage();
      setLogs(loadedLogs);
    })();
  }, [reloadFlag]);

  // Record an activity by appending a new log.
  const recordActivity = async (activity) => {
    const newEntry = {
      activity,
      timestamp: new Date().toISOString(),
      comments: [],
    };
    const updatedLogs = [...logs, newEntry];
    await saveLogsToStorage(updatedLogs);
    setLogs(updatedLogs);
  };

  // Add a comment to the most recent log.
  const addComment = async () => {
    if (logs.length === 0) {
      Alert.alert('No logs available', 'Please log an activity first.');
      return;
    }
    let updatedLogs = [...logs];
    const lastIndex = updatedLogs.length - 1;
    if (!updatedLogs[lastIndex].comments) updatedLogs[lastIndex].comments = [];
    updatedLogs[lastIndex].comments.push(commentText);
    await saveLogsToStorage(updatedLogs);
    setLogs(updatedLogs);
    setCommentText('');
    setCommentModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Daily Activity Logger</Text>
      <View style={styles.buttonContainer}>
        {config.activities && config.activities.map((activity, index) => (
          <TouchableOpacity
            key={index}
            style={styles.activityButton}
            onPress={() => recordActivity(activity)}
          >
            <Text style={styles.buttonText}>{activity}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity onPress={() => setCommentModalVisible(true)}>
        <Text style={styles.addCommentText}>➕ Add Comment</Text>
      </TouchableOpacity>

      <Modal visible={commentModalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setCommentModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <TextInput
              style={styles.commentInput}
              placeholder="Enter comment..."
              placeholderTextColor={theme === 'dark' ? '#aaa' : '#555'}
              value={commentText}
              onChangeText={setCommentText}
              onSubmitEditing={addComment}
              autoFocus
            />
            <TouchableOpacity style={styles.submitButton} onPress={addComment}>
              <Text style={styles.submitButtonText}>➤</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

//
// Logs Screen: Now uses useFocusEffect to reload logs each time it’s focused.
// This ensures the list updates after any recent activity or comment additions.
//
function LogsScreen({ theme }) {
  const [logs, setLogs] = useState([]);
  const styles = getStyles(theme);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const loadedLogs = await loadLogsFromStorage();
        setLogs(loadedLogs);
      })();
    }, [])
  );

  const renderItem = ({ item }) => (
    <View style={styles.logItem}>
      <Text style={styles.logText}>
        {item.timestamp} - {item.activity}
      </Text>
      {item.comments &&
        item.comments.map((comment, i) => (
          <Text key={i} style={styles.commentText}>
            • {comment}
          </Text>
        ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Logs</Text>
      <FlatList
        data={logs}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
      />
    </View>
  );
}

//
// Settings Screen: Remains unchanged (YAML configuration editing and theme selection).
//
function SettingsScreen({ navigation, config, setConfig, theme, setTheme, refreshHome }) {
  const [yamlText, setYamlText] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const styles = getStyles(theme);

  useEffect(() => {
    setYamlText(yaml.dump(config));
  }, [config]);

  const saveSettings = async () => {
    try {
      const newConfig = yaml.load(yamlText);
      setConfig(newConfig);
      await AsyncStorage.setItem(CONFIG_KEY, yamlText);
      await AsyncStorage.setItem(THEME_KEY, selectedTheme);
      setTheme(selectedTheme);
      refreshHome();
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Error', 'Invalid YAML configuration.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Settings</Text>
      <Text style={styles.label}>Activity YAML Config:</Text>
      <TextInput
        style={[styles.yamlInput, { height: 150 }]}
        multiline
        value={yamlText}
        onChangeText={setYamlText}
        placeholder="Enter YAML config..."
        placeholderTextColor={theme === 'dark' ? '#aaa' : '#555'}
      />
      <Text style={styles.label}>Select Theme:</Text>
      <View style={styles.themeSelector}>
        <TouchableOpacity onPress={() => setSelectedTheme('dark')} style={styles.radioOption}>
          <Text style={styles.radioText}>
            {selectedTheme === 'dark' ? '●' : '○'} 🌙 Dark Mode
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedTheme('light')} style={styles.radioOption}>
          <Text style={styles.radioText}>
            {selectedTheme === 'light' ? '●' : '○'} ☀️ Light Mode
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

//
// Custom Drawer: Keeps the same drawer content with an "Export Logs" action.
//
function CustomDrawerContent(props) {
  const { navigation, theme, exportLogs } = props;
  const styles = getStyles(theme);
  return (
    <DrawerContentScrollView {...props} style={styles.drawerContainer}>
      <DrawerItem
        label="Home"
        onPress={() => navigation.navigate('Home')}
        labelStyle={styles.drawerLabel}
      />
      <DrawerItem
        label="See Logs"
        onPress={() => navigation.navigate('Logs')}
        labelStyle={styles.drawerLabel}
      />
      <DrawerItem
        label="Settings"
        onPress={() => navigation.navigate('Settings')}
        labelStyle={styles.drawerLabel}
      />
      <DrawerItem
        label="Export Logs"
        onPress={exportLogs}
        labelStyle={styles.drawerLabel}
      />
    </DrawerContentScrollView>
  );
}

//
// Main App Component: Loads stored configuration and theme,
// manages a reload flag to refresh logs, and sets up export logic.
//
const Drawer = createDrawerNavigator();

export default function App() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [reloadFlag, setReloadFlag] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const storedConfig = await AsyncStorage.getItem(CONFIG_KEY);
        if (storedConfig) {
          setConfig(yaml.load(storedConfig));
        }
      } catch (error) {
        console.error('Failed to load configuration', error);
      }
    };
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_KEY);
        if (storedTheme) {
          setTheme(storedTheme);
        }
      } catch (error) {
        console.error('Failed to load theme', error);
      }
    };
    loadConfig();
    loadTheme();
  }, []);

  // Toggle reload flag for HomeScreen refresh.
  const refreshHome = () => {
    setReloadFlag(!reloadFlag);
  };

  // Export logs using the updated export logic.
  const handleExportLogs = async () => {
    const logs = await loadLogsFromStorage();
    await exportLogsFunction(logs, refreshHome);
  };

  return (
    <NavigationContainer>
      <Drawer.Navigator
        initialRouteName="Home"
        drawerContent={(props) => (
          <CustomDrawerContent {...props} theme={theme} exportLogs={handleExportLogs} />
        )}
        screenOptions={{
          headerStyle: { backgroundColor: theme === 'dark' ? '#282828' : '#fff' },
          headerTintColor: theme === 'dark' ? '#ccc' : '#000',
        }}
      >
        <Drawer.Screen name="Home">
          {(props) => (
            <HomeScreen {...props} config={config} theme={theme} reloadFlag={reloadFlag} />
          )}
        </Drawer.Screen>
        <Drawer.Screen name="Logs">
          {(props) => <LogsScreen {...props} theme={theme} />}
        </Drawer.Screen>
        <Drawer.Screen name="Settings">
          {(props) => (
            <SettingsScreen
              {...props}
              config={config}
              setConfig={setConfig}
              theme={theme}
              setTheme={setTheme}
              refreshHome={refreshHome}
            />
          )}
        </Drawer.Screen>
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
