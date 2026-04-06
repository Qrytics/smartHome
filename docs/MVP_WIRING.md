# MVP Wiring Guide – 2 ESP32 Boards

This is the minimum viable setup for the parts currently on hand:

- 2 ESP32 boards
- 1 relay module
- 1 RC522 RFID reader
- 1 BME280
- 1 solenoid door lock

Use this setup order:

1. Bring up the **door node** first.
2. Verify relay behavior **before** connecting the solenoid.
3. Add the **BME280 node** second.

## First Check: Confirm Both Boards Are ESP32-S3 DevKitC-1

This guide assumes the current repo pin map:

- **ESP32-S3 DevKitC-1 only**

If one of your boards is not an ESP32-S3, stop and do not wire from this guide.

## MVP Topology

- **ESP32 #1: Door node**
  RC522 + relay + solenoid lock
- **ESP32 #2: Sensor node**
  BME280 only

Skip the fan, dimmer, and TEMT6000 entirely for now.

## Door Node Wiring

### RC522 RFID Reader

| RC522 Pin | ESP32-S3 | Notes |
|-----------|----------|-------|
| VCC | 3.3V | Never use 5V |
| GND | GND | |
| SDA / SS | GPIO 5 | Chip select |
| SCK | GPIO 12 | SPI clock |
| MOSI | GPIO 11 | SPI MOSI |
| MISO | GPIO 13 | SPI MISO |
| RST | GPIO 16 | Reset |
| IRQ | Not connected | Leave open |

### Relay Module Control Side

| Relay Pin | ESP32 Pin | Notes |
|-----------|-----------|-------|
| IN | GPIO 4 | Door lock control |
| VCC | 5V | Relay module power |
| GND | GND | Must share ground with ESP32 |

Required for reliable boot behavior:

- Add a **10 kOhm pull-down resistor** from GPIO 4 to GND.

### Solenoid Power Side

| Connection | Wire To |
|-----------|---------|
| Relay COM | +12V supply |
| Relay NO | Solenoid + |
| Solenoid - | 12V supply - |

Required for not frying the relay side:

- Add a **flyback diode across the solenoid**.
- Diode stripe goes to **Solenoid +**.
- Other diode end goes to **Solenoid -**.

### Door Node Bring-Up Sequence

1. Wire RC522 and relay module only.
2. Flash the door firmware.
3. Power the ESP32 and relay.
4. Confirm the relay stays off at boot.
5. Trigger an unlock event and confirm the relay clicks only when expected.
6. Only then connect the solenoid to the relay contacts.

### If The Relay Behaves Backwards

Some relay boards are active-low. If the relay turns on when it should be off,
change `RELAY_ACTIVE_HIGH` in `firmware/door-control/src/config.h` from `true`
to `false` and rebuild.

## BME280 Sensor Node Wiring

This is the easy part. Use the second ESP32 as a simple sensor node.

| BME280 Pin | ESP32-S3 | Notes |
|------------|----------|-------|
| VCC | 3.3V | |
| GND | GND | |
| SDA | GPIO 21 | I2C data |
| SCL | GPIO 10 | I2C clock |
| SDO | GND | Address 0x76 |
| CSB | 3.3V | Forces I2C mode |

If your BME280 breakout board already has pull-ups, do not add extra ones.
If it does not, add:

- 4.7 kOhm from SDA to 3.3V
- 4.7 kOhm from SCL to 3.3V

## What To Skip For MVP

Do not wire these yet:

- PWM dimmer
- Fan relay
- TEMT6000 light sensor
- Extra room nodes

They add failure points and are not needed to prove the system works.

## Hard Rules

- Never connect **12V directly to any ESP32 pin**.
- Never power the **RC522 from 5V**.
- Keep **all grounds common** between the ESP32 and any relay control wiring.
- Use the relay module only as a switch; the ESP32 must not drive the solenoid directly.
- Test the relay without the lock connected first.

## Recommended Demo Order

1. Door node with RC522 only.
2. Door node with relay only.
3. Door node with relay + solenoid.
4. Second ESP32 with BME280.

That sequence cuts the chance of killing parts or misdiagnosing a wiring issue.