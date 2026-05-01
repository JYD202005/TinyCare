export interface BleDevice {
  id: string;
  name: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  readData: () => Promise<any>;
}

export interface BleAdapter {
  scanAndConnect: () => Promise<BleDevice | null>;
}
