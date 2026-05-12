export const IMPLEMENTED_MEASUREMENT_UPLOAD_PROTOCOLS = ['cloudflare'] as const;

export const RESERVED_MEASUREMENT_UPLOAD_PROTOCOLS = ['mlab'] as const;

export type ImplementedMeasurementUploadProtocol =
  (typeof IMPLEMENTED_MEASUREMENT_UPLOAD_PROTOCOLS)[number];

export type ReservedMeasurementUploadProtocol =
  (typeof RESERVED_MEASUREMENT_UPLOAD_PROTOCOLS)[number];

export type MeasurementUploadProtocol =
  | ImplementedMeasurementUploadProtocol
  | ReservedMeasurementUploadProtocol;

export function isImplementedMeasurementUploadProtocol(
  protocol: string,
): protocol is ImplementedMeasurementUploadProtocol {
  return IMPLEMENTED_MEASUREMENT_UPLOAD_PROTOCOLS.includes(
    protocol as ImplementedMeasurementUploadProtocol,
  );
}

export function isReservedMeasurementUploadProtocol(
  protocol: string,
): protocol is ReservedMeasurementUploadProtocol {
  return RESERVED_MEASUREMENT_UPLOAD_PROTOCOLS.includes(
    protocol as ReservedMeasurementUploadProtocol,
  );
}
