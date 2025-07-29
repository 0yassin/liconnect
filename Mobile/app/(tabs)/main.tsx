// main.tsx
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useToast } from "react-native-toast-notifications";


import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Animated,
} from 'react-native';
import 'react-native-url-polyfill/auto';
import { Socket } from 'socket.io-client';

import Fileicon from '../../assets/images/file.tsx';
import ClipboardIcon from '../../assets/images/Paperclip.tsx';
import PlaceHolderIcon from '../../assets/images/placeholder.tsx';
import WifiIcon from '../../assets/images/wifi.tsx';

import { useConnection } from '../(tabs)/scan';

export default function MainScreen() {
  const toast = useToast();
  const { activeConnection } = useConnection();
  const [message, setMessage] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const clipboardScale = useRef(new Animated.Value(1)).current;
  const fileScale = useRef(new Animated.Value(1)).current;
  const messageScale = useRef(new Animated.Value(1)).current;

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


    socket.on('file-ack', (data: { status: string; filename: string }) => {
      console.log('File ACK:', data);
      if (data.status === 'received') {
        toast.show("File uploaded", {type:'success'})
      } else {
        toast.show(`Error uploading file ${data.status}`, {type:'danger'})
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [activeConnection]);

  const sendClipboard = async () => {
    if (!activeConnection || !socketRef.current?.connected) {
      
      toast.show(`Not connected to any server`, {type:'danger'})

    }

    const clipboardContent = await Clipboard.getStringAsync();
    if (!clipboardContent) {
      return toast.show(`clipboard is empty`, {type:'danger'})

    }

    socketRef.current?.emit('message', { type: 'clipboard', content: clipboardContent }, () => {
      toast.show(`clipboard sent successfully`, {type:'success'})

    });
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

      if (result.canceled === true || !Array.isArray(result.assets) || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const { uri, name, mimeType } = asset;

      if (typeof uri !== 'string' || typeof name !== 'string') {
        return toast.show(`Invalid file data`, {type:'danger'})

      }

      await sendFile(uri, name, mimeType ?? 'application/octet-stream');
    } catch (error: any) {
      toast.show(`Failed to pick/send file: ${error.message}`, {type:'danger'})

    }
  }

  async function sendFile(uri: string, filename: string, mimeType: string) {
    if (!socketRef.current?.connected) {
      
      return toast.show(`Not connected to any server`, {type:'danger'})

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
            toast.show(`Failed to read and send file: ${error.message}`, {type:'danger'})

    }
  }

  const sendModalMessage = () => {
    if (!modalMessage.trim()) {
      toast.show(`Please enter a message`, {type:'danger'})

      return;
    }
    if (!socketRef.current?.connected) {
      toast.show(`Not connected to any server`, {type:'danger'})

      return;
    }

    socketRef.current.emit('message', { type: 'text', content: modalMessage });
    setModalMessage('');
    setModalVisible(false);
  };

  const animateIn = (anim: Animated.Value | Animated.ValueXY) =>
    Animated.spring(anim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();

  const animateOut = (anim: Animated.Value | Animated.ValueXY) =>
    Animated.spring(anim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();

  return (
    <View style={styles.container}>
      {/* Connection Status */}
      <Pressable style={[styles.cardBase, activeConnection ? styles.connectionCard : styles.disconnectedCard]}>
        <View style={styles.cardRow}>
          <View>
            <Text style={styles.cardTitle}>
              {activeConnection ? `Connected to ${activeConnection.name}` : 'Not Connected'}
            </Text>
            <View style={styles.cardDetails}>
              <Text style={styles.cardSub}>{activeConnection ? activeConnection.ip : 'XXX.XXX.XX.XXX'}</Text>
              <Text style={styles.cardSub}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Text>
            </View>
          </View>
          <WifiIcon width={28} height={28} />
        </View>
      </Pressable>

      {/* Clipboard */}
      <Animated.View style={{ transform: [{ scale: clipboardScale }], width: '100%' }}>
        <Pressable
          onPressIn={() => animateIn(clipboardScale)}
          onPressOut={() => animateOut(clipboardScale)}
          onPress={sendClipboard}
          style={[styles.cardBase, styles.actionCard]}
        >
          <View style={styles.iconRow}>
            <Text style={styles.buttonText}>Send Clipboard</Text>
            <ClipboardIcon width={28} height={28} />
          </View>
        </Pressable>
      </Animated.View>

      {/* File */}
      <Animated.View style={{ transform: [{ scale: fileScale }], width: '100%' }}>
        <Pressable
          onPressIn={() => animateIn(fileScale)}
          onPressOut={() => animateOut(fileScale)}
          onPress={pickAndSendFile}
          style={[styles.cardBase, styles.actionCard]}
        >
          <View style={styles.iconRow}>
            <Text style={styles.buttonText}>Send File</Text>
            <Fileicon width={28} height={28} />
          </View>
        </Pressable>
      </Animated.View>

      {/* Message */}
      <Animated.View style={{ transform: [{ scale: messageScale }], width: '100%' }}>
        <Pressable
          onPressIn={() => animateIn(messageScale)}
          onPressOut={() => animateOut(messageScale)}
          onPress={() => setModalVisible(true)}
          style={[styles.cardBase, styles.actionCard]}
        >
          <View style={styles.iconRow}>
            <Text style={styles.buttonText}>Send Message</Text>
            <PlaceHolderIcon width={28} height={28} />
          </View>
        </Pressable>
      </Animated.View>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter a message</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Type message here..."
              value={modalMessage}
              onChangeText={setModalMessage}
            />
            <View style={styles.modalButtons}>
              <Pressable onPress={sendModalMessage} style={styles.modalButton}>
                <Text style={styles.modalButtonText}>Send</Text>
              </Pressable>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalButton}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 150,
    backgroundColor: '#242424',
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
    borderColor: '000',
    borderWidth: 1.5,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#4C4C4C',
    borderRadius: 6,
  },
  modalButtonText: {
    color: '#fff',
  },
});
