"""Binary sensor platform for Roulez Jeunesse."""
from __future__ import annotations

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import RoulezJeunesseCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up binary sensors from a config entry."""
    coordinator: RoulezJeunesseCoordinator = hass.data[DOMAIN][entry.entry_id]
    
    entities: list[BinarySensorEntity] = []
    
    for vehicle in coordinator.data.get("vehicles", []):
        entities.append(VehicleNeedsAttentionSensor(coordinator, vehicle))
    
    async_add_entities(entities)


class VehicleNeedsAttentionSensor(
    CoordinatorEntity[RoulezJeunesseCoordinator], BinarySensorEntity
):
    """Binary sensor indicating if vehicle needs attention."""

    def __init__(
        self,
        coordinator: RoulezJeunesseCoordinator,
        vehicle: dict,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._vehicle_id = vehicle["id"]
        self._attr_unique_id = f"{vehicle['id']}_needs_attention"
        self._attr_name = f"{vehicle['name']} Attention requise"
        self._attr_device_class = BinarySensorDeviceClass.PROBLEM
        self._attr_icon = "mdi:car-emergency"

    @property
    def device_info(self) -> DeviceInfo:
        """Return device info."""
        vehicle = self._get_vehicle()
        return DeviceInfo(
            identifiers={(DOMAIN, self._vehicle_id)},
            name=vehicle["name"] if vehicle else "Unknown Vehicle",
            manufacturer=vehicle["name"].split()[0] if vehicle else None,
            model=vehicle["name"].split()[1] if vehicle and len(vehicle["name"].split()) > 1 else None,
            sw_version=str(vehicle["year"]) if vehicle else None,
        )

    def _get_vehicle(self) -> dict | None:
        """Get current vehicle data."""
        for vehicle in self.coordinator.data.get("vehicles", []):
            if vehicle["id"] == self._vehicle_id:
                return vehicle
        return None

    @property
    def is_on(self) -> bool | None:
        """Return true if vehicle needs attention."""
        vehicle = self._get_vehicle()
        return vehicle["needs_attention"] if vehicle else None

    @property
    def extra_state_attributes(self) -> dict | None:
        """Return extra attributes."""
        vehicle = self._get_vehicle()
        if not vehicle:
            return None
        
        return {
            "overdue_reminders": vehicle.get("overdue_reminders", 0),
            "overdue_maintenance": vehicle.get("overdue_maintenance", 0),
            "overdue_items": vehicle.get("overdue_maintenance_items", []),
        }
