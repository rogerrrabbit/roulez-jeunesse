"""Sensor platform for Roulez Jeunesse."""
from __future__ import annotations

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfLength, UnitOfVolume
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
    """Set up sensors from a config entry."""
    coordinator: RoulezJeunesseCoordinator = hass.data[DOMAIN][entry.entry_id]
    
    entities: list[SensorEntity] = []
    
    for vehicle in coordinator.data.get("vehicles", []):
        # Create sensors for each vehicle
        entities.extend([
            VehicleMileageSensor(coordinator, vehicle),
            VehicleConsumptionSensor(coordinator, vehicle),
            VehicleMaintenanceCostSensor(coordinator, vehicle),
            VehicleTotalCostSensor(coordinator, vehicle),
            VehicleFuelCostSensor(coordinator, vehicle),
            VehiclePendingRemindersSensor(coordinator, vehicle),
            VehicleOverdueRemindersSensor(coordinator, vehicle),
            VehicleOverdueMaintenanceSensor(coordinator, vehicle),
        ])
    
    async_add_entities(entities)


class VehicleSensorBase(CoordinatorEntity[RoulezJeunesseCoordinator], SensorEntity):
    """Base class for vehicle sensors."""

    def __init__(
        self,
        coordinator: RoulezJeunesseCoordinator,
        vehicle: dict,
        sensor_type: str,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._vehicle_id = vehicle["id"]
        self._vehicle_slug = vehicle["slug"]
        self._attr_unique_id = f"{vehicle['id']}_{sensor_type}"
        self._sensor_type = sensor_type

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


class VehicleMileageSensor(VehicleSensorBase):
    """Sensor for vehicle mileage."""

    def __init__(self, coordinator: RoulezJeunesseCoordinator, vehicle: dict) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator, vehicle, "mileage")
        self._attr_name = f"{vehicle['name']} Kilométrage"
        self._attr_native_unit_of_measurement = UnitOfLength.KILOMETERS
        self._attr_device_class = SensorDeviceClass.DISTANCE
        self._attr_state_class = SensorStateClass.TOTAL_INCREASING
        self._attr_icon = "mdi:speedometer"

    @property
    def native_value(self) -> int | None:
        """Return the mileage."""
        vehicle = self._get_vehicle()
        return vehicle["current_mileage"] if vehicle else None


class VehicleConsumptionSensor(VehicleSensorBase):
    """Sensor for average fuel consumption."""

    def __init__(self, coordinator: RoulezJeunesseCoordinator, vehicle: dict) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator, vehicle, "consumption")
        self._attr_name = f"{vehicle['name']} Consommation"
        self._attr_native_unit_of_measurement = "L/100km"
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_icon = "mdi:gas-station"

    @property
    def native_value(self) -> float | None:
        """Return the average consumption."""
        vehicle = self._get_vehicle()
        return vehicle["avg_consumption"] if vehicle else None


class VehicleMaintenanceCostSensor(VehicleSensorBase):
    """Sensor for total maintenance cost."""

    def __init__(self, coordinator: RoulezJeunesseCoordinator, vehicle: dict) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator, vehicle, "maintenance_cost")
        self._attr_name = f"{vehicle['name']} Coût entretien"
        self._attr_native_unit_of_measurement = "€"
        self._attr_device_class = SensorDeviceClass.MONETARY
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_icon = "mdi:wrench"

    @property
    def native_value(self) -> float | None:
        """Return the total maintenance cost."""
        vehicle = self._get_vehicle()
        return vehicle["maintenance_total_cost"] if vehicle else None


class VehicleFuelCostSensor(VehicleSensorBase):
    """Sensor for total fuel cost."""

    def __init__(self, coordinator: RoulezJeunesseCoordinator, vehicle: dict) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator, vehicle, "fuel_cost")
        self._attr_name = f"{vehicle['name']} Coût carburant"
        self._attr_native_unit_of_measurement = "€"
        self._attr_device_class = SensorDeviceClass.MONETARY
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_icon = "mdi:fuel"

    @property
    def native_value(self) -> float | None:
        """Return the total fuel cost."""
        vehicle = self._get_vehicle()
        return vehicle["total_fuel_cost"] if vehicle else None


class VehicleTotalCostSensor(VehicleSensorBase):
    """Sensor for total vehicle cost."""

    def __init__(self, coordinator: RoulezJeunesseCoordinator, vehicle: dict) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator, vehicle, "total_cost")
        self._attr_name = f"{vehicle['name']} Coût total"
        self._attr_native_unit_of_measurement = "€"
        self._attr_device_class = SensorDeviceClass.MONETARY
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_icon = "mdi:currency-eur"

    @property
    def native_value(self) -> float | None:
        """Return the total cost."""
        vehicle = self._get_vehicle()
        return vehicle["total_cost"] if vehicle else None


class VehiclePendingRemindersSensor(VehicleSensorBase):
    """Sensor for pending reminders count."""

    def __init__(self, coordinator: RoulezJeunesseCoordinator, vehicle: dict) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator, vehicle, "pending_reminders")
        self._attr_name = f"{vehicle['name']} Rappels en attente"
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_icon = "mdi:bell"

    @property
    def native_value(self) -> int | None:
        """Return pending reminders count."""
        vehicle = self._get_vehicle()
        return vehicle["pending_reminders"] if vehicle else None


class VehicleOverdueRemindersSensor(VehicleSensorBase):
    """Sensor for overdue reminders count."""

    def __init__(self, coordinator: RoulezJeunesseCoordinator, vehicle: dict) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator, vehicle, "overdue_reminders")
        self._attr_name = f"{vehicle['name']} Rappels en retard"
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_icon = "mdi:bell-alert"

    @property
    def native_value(self) -> int | None:
        """Return overdue reminders count."""
        vehicle = self._get_vehicle()
        return vehicle["overdue_reminders"] if vehicle else None


class VehicleOverdueMaintenanceSensor(VehicleSensorBase):
    """Sensor for overdue maintenance count."""

    def __init__(self, coordinator: RoulezJeunesseCoordinator, vehicle: dict) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator, vehicle, "overdue_maintenance")
        self._attr_name = f"{vehicle['name']} Entretiens en retard"
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_icon = "mdi:car-wrench"

    @property
    def native_value(self) -> int | None:
        """Return overdue maintenance count."""
        vehicle = self._get_vehicle()
        return vehicle["overdue_maintenance"] if vehicle else None

    @property
    def extra_state_attributes(self) -> dict | None:
        """Return extra attributes with overdue items."""
        vehicle = self._get_vehicle()
        if vehicle and vehicle.get("overdue_maintenance_items"):
            return {"items": vehicle["overdue_maintenance_items"]}
        return None
