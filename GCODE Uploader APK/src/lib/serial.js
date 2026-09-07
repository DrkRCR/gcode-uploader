export class PrinterConnection {
  constructor(onData, onDisconnect) {
    this.onData = onData;
    this.onDisconnect = onDisconnect;
    this.keepReading = true;
    this.isConnected = false;
  }

  async connect(baudRate = 115200) {
    return new Promise((resolve) => {
      if (!window.serial) {
        console.error("Native serial plugin not found. Are you running this on a device/emulator as an APK?");
        resolve(false);
        return;
      }

      // 1. Request USB Permission from Android OS
      window.serial.requestPermission({
        vid: '1a86', // CH340 Hex String
        pid: '7523',
        driver: 'Ch34xSerialDriver' // CRITICAL: Prevents Java crash!
      }, () => {
        // 2. Open the port natively
        window.serial.open({
          baudRate: baudRate,
          dtr: true, // Native driver handles asserting DTR for Marlin!
          rts: true,
          sleepOnPause: false
        }, () => {
          this.isConnected = true;
          this.keepReading = true;
          
          // 3. Register the continuous read callback
          window.serial.registerReadCallback((data) => {
            if (this.keepReading && data) {
              // The plugin returns data as an ArrayBuffer or string depending on version. 
              // We'll decode it safely.
              const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
              const lines = str.split('\n');
              lines.forEach(line => {
                if (line.trim()) this.onData(line.trim());
              });
            }
          }, (err) => {
            console.error("Read callback error:", err);
          });
          
          resolve(true);
        }, (err) => {
          alert("Failed to open serial port: " + err);
          console.error("Failed to open serial port:", err);
          resolve(false);
        });

      }, (err) => {
        alert("USB Error: " + err);
        console.error("User denied USB permission or no device found:", err);
        resolve(false);
      });
    });
  }

  async write(command) {
    if (this.isConnected && window.serial) {
      return new Promise((resolve, reject) => {
        let cmd = command;
        if (!cmd.endsWith('\n')) cmd += '\n';
        if (!cmd.endsWith('\r\n')) cmd = cmd.replace('\n', '\r\n');
        
        window.serial.write(cmd, () => {
          resolve();
        }, (err) => {
          console.error("Write error:", err);
          reject(err);
        });
      });
    }
  }

  async disconnect() {
    this.keepReading = false;
    this.isConnected = false;
    
    if (window.serial) {
      return new Promise((resolve) => {
        window.serial.close(() => {
          if (this.onDisconnect) this.onDisconnect();
          resolve();
        }, () => {
          if (this.onDisconnect) this.onDisconnect();
          resolve();
        });
      });
    } else {
      if (this.onDisconnect) this.onDisconnect();
    }
  }
}
