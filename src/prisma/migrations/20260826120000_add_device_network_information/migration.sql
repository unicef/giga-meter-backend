-- Network/device context from the Windows client.
--
-- Two flat columns diagnose the Wi-Fi data found to be degraded in
-- production: on Windows 11 24H2+ `netsh wlan` returns nothing while the Location
-- services master toggle is off, so `wifi_connections` arrives empty even on a
-- machine connected over Wi-Fi. `wifi_unavailable_reason` says which toggle blocked
-- it, and `ssid_source` marks the rows whose SSID came from the ungated NLM
-- fallback rather than from the WLAN stack.
--
-- `device_network_information` carries the volatile per-measurement context the
-- ticket asked for and no column covers: DNS servers, default gateway, connection
-- type, VPN inference, IP family and rx/tx byte counters, plus the cheap
-- performance context (CPU load, available memory, free disk). It is a Json for the
-- same reason `results` and `client_info` are: the shape is still being validated
-- and none of these are queried in SQL today. The DTO whitelists the keys.
--
-- All columns are nullable with no default: older clients keep uploading the
-- current payload untouched.

-- AlterTable
ALTER TABLE "measurements" ADD COLUMN     "wifi_unavailable_reason" VARCHAR(32),
ADD COLUMN     "ssid_source" VARCHAR(16),
ADD COLUMN     "device_network_information" JSONB;

-- AlterTable
ALTER TABLE "measurements_failed" ADD COLUMN     "wifi_unavailable_reason" VARCHAR(32),
ADD COLUMN     "ssid_source" VARCHAR(16),
ADD COLUMN     "device_network_information" JSONB;
