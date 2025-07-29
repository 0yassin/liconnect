import { Camera, CameraView, type BarcodeScanningResult } from 'expo-camera';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useToast } from 'react-native-toast-notifications';
import { router } from 'expo-router';
import { Animated } from 'react-native';
import { useRef } from 'react';
import Qricon from '../../assets/images/qrcode.tsx';



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
  const toast = useToast()
  const [activeConnection, setActiveConnection] = useState<ActiveConnection | null>(null);

  const connectToSocket = (name: string, ip: string, port: string, authToken: string) => {
    activeConnection?.socket?.disconnect();

    try {
      const socket = io(`http://${ip}:${port}?token=${authToken}`, {
          transports: ["websocket"],  
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        setActiveConnection({ name, ip, port, authToken, socket });
      });

      socket.on('connect_error', (err) => {
        console.log(err);
        toast.show(`Connection Error ${err.message}`, {type:'danger'})

        socket.disconnect();
      });

      socket.on('disconnect', () => {
      toast.show(`socket disconnected`, {type:'danger'})
        setActiveConnection(null);
      });
    } catch (err: any) {
      toast.show(`${err.message}`, {type:'danger'})

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
    const scale = useRef(new Animated.Value(1)).current;

  const animateIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const animateOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const toast = useToast()
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

    toast.show(`QR code scanned`, { type: 'success' });
    router.push('/main')

    connectToSocket(name.trim(), ip.trim(), String(port).trim(), authToken.trim());
  } catch (err) {
    toast.show(`error scanning qr code ${err}`)
    console.log(err);
    console.log(result.data);
  }
};


  const handleConnect = () => {
    if (!ip || !port) {
      toast.show(`Please enter details first`, {type:'warning'})
      toast.show(ip , {type:'warning'})

      return;
    }
    connectToSocket(name.trim(), ip.trim(), port.trim(), authToken.trim());
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ height: 12 }} />
          <Animated.View style={{ transform: [{ scale }], width: '100%' }}>
            <Pressable
              onPressIn={animateIn}
              onPressOut={animateOut}
              onPress={() => setScanning(true)}
              style={{
                backgroundColor: '#4d4d4d',
                borderWidth:2,
                
                paddingVertical: 14,
                paddingHorizontal: 18,
                borderRadius: 16,
                marginBottom: 16,
                width: '100%',
                padding: 16,
                height: 112,
                justifyContent: 'center',
                
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', height: '100%', paddingHorizontal: 8, }}>

                  <Text style={{
                    color: '#fff',
                    fontSize: 18,
                    fontFamily: 'poppins-500', }}>

                    Scan QR Code
                  </Text>
                  <Qricon></Qricon>


              </View>
            </Pressable>
          </Animated.View>

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
                    <Animated.View style={{ transform: [{ scale }], width: '100%' }}>
            <Pressable
              onPressIn={animateIn}
              onPressOut={animateOut}
              onPress={() => setScanning(false)}
              style={{
                backgroundColor: '#4d4d4d',
                borderWidth:2,
                borderRadius: 16,
                width: 172,
                padding: 16,
                height: 64,
                justifyContent: 'center',
                margin:'auto',
                alignItems:'center',
                
              }}
            >
                  <Text style={{
                    color: '#fff',
                    fontSize: 18,
                    fontFamily: 'poppins-500', }}>

                    Cancel
                  </Text>


            </Pressable>
          </Animated.View>

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
    backgroundColor: '#242424',
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
    backgroundColor: '#242424',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: 300,
    height: 300,
    borderRadius: 35,
    marginBottom: 16,
  },
});
