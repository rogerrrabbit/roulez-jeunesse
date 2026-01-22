"""Data coordinator for Roulez Jeunesse."""
from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

import aiohttp
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import DOMAIN, SCAN_INTERVAL

_LOGGER = logging.getLogger(__name__)


class RoulezJeunesseCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Coordinator to fetch data from Roulez Jeunesse API."""

    def __init__(
        self,
        hass: HomeAssistant,
        session: aiohttp.ClientSession,
        host: str,
        port: int,
    ) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=SCAN_INTERVAL),
        )
        self.session = session
        self.host = host
        self.port = port
        self._base_url = f"http://{host}:{port}"

    async def _async_update_data(self) -> dict[str, Any]:
        """Fetch data from API."""
        try:
            async with self.session.get(
                f"{self._base_url}/ha/metrics",
                timeout=aiohttp.ClientTimeout(total=10),
            ) as response:
                if response.status != 200:
                    raise UpdateFailed(f"API returned {response.status}")
                
                data = await response.json()
                return data
                
        except aiohttp.ClientError as err:
            raise UpdateFailed(f"Error communicating with API: {err}") from err
        except Exception as err:
            raise UpdateFailed(f"Unexpected error: {err}") from err
