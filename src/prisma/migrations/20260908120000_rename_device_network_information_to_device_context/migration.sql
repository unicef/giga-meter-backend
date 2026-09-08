-- Rename `device_network_information` to `device_context`.
--
-- The original name overstated what the column holds. Alongside the network
-- fields (DNS servers, default gateway, connection type, VPN inference, IP family
-- and rx/tx counters) it already carries system context that has nothing to do
-- with networking: CPU load, available memory and free disk at the time of the
-- test, and now the boot context (uptime and start time) as well. `device_context`
-- describes the whole payload rather than one part of it.
--
-- A rename keeps every stored row, so nothing needs backfilling. The upload DTO
-- is renamed with it, so a client still sending `device_network_information`
-- has that key dropped and stores NULL until it is updated -- the same outcome
-- as a client too old to send the field at all.

-- AlterTable
ALTER TABLE "measurements" RENAME COLUMN "device_network_information" TO "device_context";

-- AlterTable
ALTER TABLE "measurements_failed" RENAME COLUMN "device_network_information" TO "device_context";
