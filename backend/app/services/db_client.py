"""
Database Client Service

Provides database connection management and operations for lighting data.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
from typing import List, Optional
from datetime import datetime

from app.config import settings
from app.models.lighting import (
    Base, LightingSensorData, RelayState, DimmerState, Device,
    FanState, RFIDCard, AccessLog,
)


class DatabaseClient:
    """Database client for TimescaleDB operations"""
    
    def __init__(self, database_url: str = None):
        """
        Initialize database client
        
        Args:
            database_url: Database connection string (defaults to settings.DATABASE_URL)
        """
        self.database_url = database_url or settings.DATABASE_URL
        
        # Create engine with connection pooling
        self.engine = create_engine(
            self.database_url,
            poolclass=QueuePool,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,  # Verify connections before using
            echo=False,  # Set to True for SQL logging
        )
        
        # Create session factory
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )
    
    @contextmanager
    def get_session(self) -> Session:
        """
        Get a database session context manager
        
        Yields:
            Session: SQLAlchemy session
        """
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    def create_tables(self):
        """Create all tables in the database"""
        Base.metadata.create_all(bind=self.engine)
    
    def drop_tables(self):
        """Drop all tables in the database (use with caution!)"""
        Base.metadata.drop_all(bind=self.engine)
    
    # Lighting Sensor Data Operations
    
    def insert_lighting_data(self, data: dict) -> bool:
        """
        Insert lighting sensor data
        
        Args:
            data: Dictionary containing lighting sensor data
        
        Returns:
            bool: True if successful
        """
        with self.get_session() as session:
            lighting_data = LightingSensorData(
                time=datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00')),
                device_id=data['device_id'],
                light_level=data.get('light_level'),
                light_lux=data.get('light_lux'),
                dimmer_brightness=data.get('dimmer_brightness'),
                daylight_harvest_mode=data.get('daylight_harvest_mode')
            )
            session.add(lighting_data)
        return True
    
    def get_latest_lighting_data(self, device_id: str) -> Optional[dict]:
        """
        Get the latest lighting sensor data for a device
        
        Args:
            device_id: Device identifier
        
        Returns:
            dict: Latest lighting data or None
        """
        with self.get_session() as session:
            result = session.query(LightingSensorData).filter(
                LightingSensorData.device_id == device_id
            ).order_by(LightingSensorData.time.desc()).first()
            
            if result:
                return {
                    'time': result.time.isoformat(),
                    'device_id': result.device_id,
                    'light_level': result.light_level,
                    'light_lux': result.light_lux,
                    'dimmer_brightness': result.dimmer_brightness,
                    'daylight_harvest_mode': result.daylight_harvest_mode,
                }
            return None
    
    def get_lighting_history(
        self, 
        device_id: str, 
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[dict]:
        """
        Get historical lighting data for a device
        
        Args:
            device_id: Device identifier
            start_time: Start timestamp
            end_time: End timestamp
            limit: Maximum number of records
        
        Returns:
            List[dict]: List of lighting data records
        """
        with self.get_session() as session:
            query = session.query(LightingSensorData).filter(
                LightingSensorData.device_id == device_id
            )
            
            if start_time:
                query = query.filter(LightingSensorData.time >= start_time)
            if end_time:
                query = query.filter(LightingSensorData.time <= end_time)
            
            results = query.order_by(
                LightingSensorData.time.desc()
            ).limit(limit).all()
            
            return [{
                'time': r.time.isoformat(),
                'device_id': r.device_id,
                'light_level': r.light_level,
                'light_lux': r.light_lux,
                'dimmer_brightness': r.dimmer_brightness,
                'daylight_harvest_mode': r.daylight_harvest_mode,
            } for r in results]
    
    # Relay State Operations
    
    def insert_relay_state(self, device_id: str, channel: int, state: bool) -> bool:
        """
        Insert relay state change
        
        Args:
            device_id: Device identifier
            channel: Relay channel (1-4)
            state: Relay state (True=ON, False=OFF)
        
        Returns:
            bool: True if successful
        """
        with self.get_session() as session:
            relay_state = RelayState(
                time=datetime.utcnow(),
                device_id=device_id,
                channel=channel,
                state=state
            )
            session.add(relay_state)
        return True
    
    # Dimmer State Operations
    
    def insert_dimmer_state(self, device_id: str, brightness: int) -> bool:
        """
        Insert dimmer brightness change
        
        Args:
            device_id: Device identifier
            brightness: Brightness level (0-100)
        
        Returns:
            bool: True if successful
        """
        with self.get_session() as session:
            dimmer_state = DimmerState(
                time=datetime.utcnow(),
                device_id=device_id,
                brightness=brightness
            )
            session.add(dimmer_state)
        return True
    
    # Device Operations
    
    def get_device(self, device_id: str) -> Optional[dict]:
        """
        Get device information
        
        Args:
            device_id: Device identifier
        
        Returns:
            dict: Device data or None
        """
        with self.get_session() as session:
            device = session.query(Device).filter(
                Device.device_id == device_id
            ).first()
            
            if device:
                return {
                    'device_id': device.device_id,
                    'device_type': device.device_type,
                    'name': device.name,
                    'location': device.location,
                    'status': device.status,
                    'last_seen': device.last_seen.isoformat() if device.last_seen else None,
                }
            return None
    
    def update_device_status(self, device_id: str, status: str) -> bool:
        """
        Update device status
        
        Args:
            device_id: Device identifier
            status: New status ('online', 'offline', etc.)
        
        Returns:
            bool: True if successful
        """
        with self.get_session() as session:
            device = session.query(Device).filter(
                Device.device_id == device_id
            ).first()
            
            if device:
                device.status = status
                device.last_seen = datetime.utcnow()
                return True
            return False

    # -----------------------------------------------------------------------
    # Fan State Operations
    # -----------------------------------------------------------------------

    def insert_fan_state(self, device_id: str, fan_on: bool) -> bool:
        """
        Record a fan on/off state change.

        Args:
            device_id: Device identifier
            fan_on: Fan state (True = on)

        Returns:
            bool: True if successful
        """
        with self.get_session() as session:
            fan_state = FanState(
                time=datetime.utcnow(),
                device_id=device_id,
                fan_on=fan_on,
            )
            session.add(fan_state)
        return True

    # -----------------------------------------------------------------------
    # RFID Card Operations
    # -----------------------------------------------------------------------

    def get_rfid_card(self, card_uid: str) -> Optional[dict]:
        """
        Look up an RFID card in the whitelist.

        Args:
            card_uid: Card UID string

        Returns:
            dict with card data, or None if not found
        """
        with self.get_session() as session:
            card = session.query(RFIDCard).filter(
                RFIDCard.card_uid == card_uid
            ).first()
            if card:
                return {
                    'card_uid': card.card_uid,
                    'user_id': card.user_id,
                    'label': card.label,
                    'active': card.active,
                }
            return None

    def upsert_rfid_card(
        self,
        card_uid: str,
        user_id: str,
        label: Optional[str] = None,
        active: bool = True,
    ) -> bool:
        """
        Insert or update an RFID card in the whitelist.

        Args:
            card_uid: Card UID
            user_id: User identifier
            label: Optional descriptive label
            active: Whether the card is active

        Returns:
            bool: True if successful
        """
        with self.get_session() as session:
            card = session.query(RFIDCard).filter(
                RFIDCard.card_uid == card_uid
            ).first()
            if card:
                card.user_id = user_id
                card.label = label
                card.active = active
            else:
                card = RFIDCard(
                    card_uid=card_uid,
                    user_id=user_id,
                    label=label,
                    active=active,
                )
                session.add(card)
        return True

    def list_rfid_cards(self) -> List[dict]:
        """
        Return all RFID cards in the whitelist.

        Returns:
            List[dict]: List of card records
        """
        with self.get_session() as session:
            cards = session.query(RFIDCard).all()
            return [
                {
                    'card_uid': c.card_uid,
                    'user_id': c.user_id,
                    'label': c.label,
                    'active': c.active,
                }
                for c in cards
            ]

    # -----------------------------------------------------------------------
    # Access Log Operations
    # -----------------------------------------------------------------------

    def log_access_attempt(
        self,
        card_uid: str,
        device_id: str,
        granted: bool,
        reason: str,
        timestamp: str,
    ) -> bool:
        """
        Write an access attempt to the audit log.

        Args:
            card_uid: Scanned card UID
            device_id: Door control device ID
            granted: Whether access was granted
            reason: Human-readable reason
            timestamp: ISO 8601 timestamp string

        Returns:
            bool: True if successful
        """
        with self.get_session() as session:
            log = AccessLog(
                card_uid=card_uid,
                device_id=device_id,
                granted=granted,
                reason=reason,
                timestamp=datetime.fromisoformat(timestamp.replace('Z', '+00:00')),
            )
            session.add(log)
        return True

    def get_access_logs(self, limit: int = 50) -> List[dict]:
        """
        Return the most recent access log entries.

        Args:
            limit: Maximum number of records to return

        Returns:
            List[dict]: Access log entries ordered by timestamp descending
        """
        with self.get_session() as session:
            logs = session.query(AccessLog).order_by(
                AccessLog.timestamp.desc()
            ).limit(limit).all()
            return [
                {
                    'log_id': log.log_id,
                    'card_uid': log.card_uid,
                    'device_id': log.device_id,
                    'granted': log.granted,
                    'reason': log.reason,
                    'timestamp': log.timestamp.isoformat() if log.timestamp else None,
                }
                for log in logs
            ]


# Global database client instance
db_client = DatabaseClient()
