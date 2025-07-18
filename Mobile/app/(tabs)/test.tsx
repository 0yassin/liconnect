import { Camera, CameraView, type BarcodeScanningResult } from 'expo-camera';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { io, Socket } from 'socket.io-client';

// ---- Connection Types and Context ----
type ActiveConnection = {
  name: string;
  ip: string;
  port: string;
  authToken: string;
  socket: Socket | null;
};

type ConnectionContextType = {
  activeConnection: ActiveConnection | null;
  connectToSocket: (name: string, ip: string, port: string, authToken: string) => void;
  disconnect: () => void;
};

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) throw new Error('useConnection must be inside ConnectionProvider');
  return context;
};

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeConnection, setActiveConnection] = useState<ActiveConnection | null>(null);

  const connectToSocket = (name: string, ip: string, port: string, authToken: string) => {
    activeConnection?.socket?.disconnect();

    try {
      const socket = io(`http://${ip}:${port}?token=${authToken}`, {
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        Alert.alert('Connected', `Socket connected to ${ip}:${port}`);
        setActiveConnection({ name, ip, port, authToken, socket });
      });

      socket.on('connect_error', (err) => {
        console.log(err);
        Alert.alert('Connection Error', err.message);
        socket.disconnect();
      });

      socket.on('disconnect', () => {
        Alert.alert('Disconnected', 'Socket disconnected');
        setActiveConnection(null);
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to connect');
    }
  };

  const disconnect = () => {
    activeConnection?.socket?.disconnect();
    setActiveConnection(null);
  };

  return (
    <ConnectionContext.Provider value={{ activeConnection, connectToSocket, disconnect }}>
      {children}
    </ConnectionContext.Provider>
  );
};

// ---- Main Page Component ----
export default function ConnectionPage() {
  const { activeConnection, connectToSocket, disconnect } = useConnection();
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [name, setName] = useState('');

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleQRCodeScanned = (result: BarcodeScanningResult) => {
    if (!result?.data) return;

    setScanning(false);

    try {
      const parsed = JSON.parse(result.data);
      const { name, ip, port, authToken } = parsed;

      if (!name || !ip || !port || !authToken) {
        throw new Error('Missing one or more fields');
      }

      setName(name);
      setIp(ip);
      setPort(String(port));
      setAuthToken(authToken);

      Alert.alert('QR Code Scanned', 'Connection details loaded.');
    } catch (err) {
      Alert.alert('Scan Error', 'Invalid or malformed QR code');
      console.log(err)
      console.log(result.data)
    }
  };

  const handleConnect = () => {
    if (!ip || !port) {
      Alert.alert('Error', 'Please enter IP and port');
      return;
    }
    connectToSocket(name.trim(), ip.trim(), port.trim(), authToken.trim());
  };

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'android' && <StatusBar hidden />}
      <Text style={styles.heading}>Connect to Socket Server</Text>

      <TextInput
        placeholder="IP Address"
        style={styles.input}
        value={ip}
        onChangeText={setIp}
        autoCapitalize="none"
        keyboardType="numeric"
        placeholderTextColor="#888"
      />
      <TextInput
        placeholder="Port"
        style={styles.input}
        value={port}
        onChangeText={setPort}
        keyboardType="numeric"
        placeholderTextColor="#888"
      />
      <TextInput
        placeholder="Auth Token"
        style={styles.input}
        value={authToken}
        onChangeText={setAuthToken}
        autoCapitalize="none"
        placeholderTextColor="#888"
      />
      <TextInput
        placeholder="Name"
        style={styles.input}
        value={name}
        onChangeText={setName}
        autoCapitalize="none"
        placeholderTextColor="#888"
      />

      <Button
        title={activeConnection ? 'Disconnect' : 'Connect'}
        onPress={activeConnection ? disconnect : handleConnect}
      />
      <View style={{ height: 12 }} />
      <Button title="Scan QR Code" onPress={() => setScanning(true)} />

      {activeConnection && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Connected to {activeConnection.ip}:{activeConnection.port}
          </Text>
          <Text style={styles.infoText}>Token: {activeConnection.authToken || '(none)'}</Text>
        </View>
      )}

      {/* Scanner Modal */}
      <Modal visible={scanning} animationType="slide">
        <View style={styles.scannerContainer}>
          {hasPermission === false ? (
            <Text>No access to camera</Text>
          ) : (
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleQRCodeScanned}
            />
          )}
          <Button title="Cancel" onPress={() => setScanning(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---- Styles ----
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 22,
    marginBottom: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  input: {
    borderColor: '#aaa',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
    color: '#000',
  },
  infoBox: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#eee',
    borderRadius: 6,
  },
  infoText: {
    fontSize: 16,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: 300,
    height: 300,
  },
});
