//#region
// main.tsx
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import 'react-native-url-polyfill/auto';
import { Socket } from 'socket.io-client';

import Fileicon from '../../assets/images/file.svg';
import ClipboardIcon from '../../assets/images/Paperclip.svg';
import PlaceHolderIcon from '../../assets/images/placeholder.svg';
import WifiIcon from '../../assets/images/wifi.svg';

import { useConnection } from '../(tabs)/test';

export default function MainScreen() {
  const { activeConnection } = useConnection();
  const [message, setMessage] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
  if (!activeConnection || !activeConnection.socket) {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
    return;
  }
  
  
  const socket = activeConnection.socket;
  socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.log('Socket connect error:', err);
      setIsConnected(false);
    });

    socket.on('message', (data: string) => {
      // You can handle incoming messages here if needed
      console.log('Received message:', data);
    });

    socket.on('file-ack', (data: { status: string; filename: string }) => {
      console.log('File ACK:', data);
      if (data.status === 'received') {
        Alert.alert('File Uploaded', `${data.filename} was saved on the server.`);
      } else {
        Alert.alert('Upload Failed', `Server responded with status: ${data.status}`);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('message');
      socket.off('file-ack');
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [activeConnection]);

  const sendMessage = () => {
    if (!message.trim()) {
      return Alert.alert('Error', 'Please enter a message');
    }
    if (!socketRef.current?.connected) {
      return Alert.alert('Error', 'Not connected to any server');
    }

    socketRef.current.emit('message', message);
    setMessage('');
  };

  const sendClipboard = async () => {
    if (!activeConnection) {
      return Alert.alert('Error', 'Not connected to any server');
    }

    if (!socketRef.current?.connected) {
      return Alert.alert('Error', 'Not connected to any server');
    }

    const clipboardContent = await Clipboard.getStringAsync();
    if (!clipboardContent) {
      return Alert.alert('Clipboard', 'Clipboard is empty');
    }

    socketRef.current.emit(
      'message',
      { type: 'clipboard', content: clipboardContent },
      Alert.alert('clipboard sent successfully')
    );
  };

async function pickAndSendFile() {
    if (Platform.OS === 'web') {
      return Alert.alert("File picking isn't available on web.");
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      // If user cancelled
      if (result.canceled === true) {
        return;
      }

      // Ensure assets array exists
      if (!Array.isArray(result.assets) || result.assets.length === 0) {
        return Alert.alert('Error', 'No file selected.');
      }

      const asset = result.assets[0];
      const { uri, name, mimeType } = asset;

      if (typeof uri !== 'string' || typeof name !== 'string') {
        return Alert.alert('Error', 'Invalid file data.');
      }

      await sendFile(uri, name, mimeType ?? 'application/octet-stream');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to pick/send file: ' + error.message);
    }
  }

  async function sendFile(uri: string, filename: string, mimeType: string) {
    if (!socketRef.current?.connected) {
      return Alert.alert('Error', 'Not connected to any server');
    }

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      socketRef.current.emit('file', {
        name: filename,
        type: mimeType,
        data: base64,
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to read and send file: ' + error.message);
    }
  }


  return (
    <View style={styles.container}>
      {/* Connection Status */}
      <Pressable style={[styles.cardBase, activeConnection ? styles.connectionCard : styles.disconnectedCard]}>
        <View style={styles.cardRow}>
          <View>
            <Text style={styles.cardTitle}>
              {activeConnection
                ? `Connected to ${activeConnection.name}`
                : 'Not Connected'}
            </Text>
            <View style={styles.cardDetails}>
              <Text style={styles.cardSub}>
                {activeConnection ? activeConnection.ip : 'XXX.XXX.XX.XXX'}
              </Text>
              <Text style={styles.cardSub}>
                {new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </Text>
            </View>
          </View>
          <WifiIcon width={28} height={28} />
        </View>
      </Pressable>

      {/* Clipboard */}
      <Pressable onPress={sendClipboard} style={[styles.cardBase, styles.actionCard]}>
        <View style={styles.iconRow}>
          <Text style={styles.buttonText}>Send Clipboard</Text>
          <ClipboardIcon width={28} height={28} />
        </View>
      </Pressable>

      {/* File */}
      <Pressable onPress={pickAndSendFile} style={[styles.cardBase, styles.actionCard]}>
        <View style={styles.iconRow}>
          <Text style={styles.buttonText}>Send File</Text>
          <Fileicon width={28} height={28} />
        </View>
      </Pressable>

      {/* Message */}
      <Pressable onPress={sendMessage} style={[styles.cardBase, styles.actionCard]}>
        <View style={styles.iconRow}>
          <Text style={styles.buttonText}>Send Message</Text>
          <PlaceHolderIcon width={28} height={28} />
        </View>
      </Pressable>

      <Text>{activeConnection?.ip}</Text>
    </View>
  );
}

//#region Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 150,
    backgroundColor: '#fff',
    alignItems: 'center',
    fontFamily: 'poppins-regular',
  },
  cardBase: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    height: 112,
    justifyContent: 'center',
  },
  connectionCard: {
    backgroundColor: '#49944E',
  },
  disconnectedCard: {
    backgroundColor: '#D95353',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    width: '100%',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 6,
    fontFamily: 'poppins-500',
  },
  cardDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  cardSub: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  actionCard: {
    backgroundColor: '#4C4C4C',
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    paddingHorizontal: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'poppins-500',
  },
  response: {
    marginTop: 20,
    fontSize: 16,
    color: '#333',
  },
});
//#endregion
