import { CloudflareMeasurementDto } from './cloudflare-measurement.dto';

export const exampleCloudflareMeasurementDto: CloudflareMeasurementDto = {
  uuid: '98914924-be94-4801-b04c-1bf9a40f4963',
  version: '2.0.3',
  provider: 'cloudflare',
  notes: 'manual',
  timestamp: 1778590959511,
  appVersion: '2.0.3',
  dataUsage: {
    download: 69000000,
    upload: 6800000,
    total: 75800000,
  },
  accessInformation: {
    ip: '79.116.96.172',
    hostname: '',
    city: '',
    region: '',
    country: 'ES',
    loc: '40.4172,-3.684',
    org: 'Digi Spain Telecom S.A',
    postal: '0',
    timezone: 'Europe/Madrid',
    asn: '',
  },
  serverInformation: {
    city: 'Madrid',
    site: 'MAD',
    country: 'ES',
    label: 'Madrid',
    metro: 'MAD',
  },
  results: {
    isFinished: true,
    summary: {
      download: 30321277.831273496,
      upload: 7129529.961648906,
      latency: 69.19999992847443,
      jitter: 28.87894738347907,
      downLoadedLatency: 133.34999990463257,
      downLoadedJitter: 44.799999952316284,
      upLoadedLatency: 364.5500000715256,
      upLoadedJitter: 416.0090909871188,
    },
    unloadedLatency: {
      latency: 69.19999992847443,
      jitter: 28.87894738347907,
      latencyPoints: [70.59999990463257, 95.10000014305115],
    },
    downloadedLatency: {
      latency: 133.34999990463257,
      jitter: 44.799999952316284,
      latencyPoints: [148.90000009536743, 117.29999995231628],
    },
    uploadedLatency: {
      latency: 364.5500000715256,
      jitter: 416.0090909871188,
      latencyPoints: [197.5, 844.0999999046326],
    },
    bandwidth: {
      download: 30321277.831273496,
      upload: 7129529.961648906,
    },
    packetLoss: {
      details: {
        error:
          "TypeError: Cannot read properties of undefined (reading 'turnServerUser')",
      },
    },
    scores: {
      streaming: {
        points: 0,
        classificationIdx: 0,
        classificationName: 'bad',
      },
      gaming: {
        points: 0,
        classificationIdx: 0,
        classificationName: 'bad',
      },
      rtc: {
        points: 0,
        classificationIdx: 0,
        classificationName: 'bad',
      },
    },
  },
  browserID: '494c1e3e-280b-4350-9381-8be2512c07f5',
  deviceType: 'windows',
  schoolID: 'SpainTestSchool1',
  gigaIDSchool: '5ff8f4cc-9f74-3f48-8cb1-e68e063a7c05',
  ipAddress: '79.116.96.172',
  countryCode: 'ES',
};
