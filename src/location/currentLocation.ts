import type { Restaurant } from '../types/restaurant';

export type LocationClient = {
  requestForegroundPermission: () => Promise<{ granted: boolean }>;
  getHighestAccuracyPosition: () => Promise<{
    coords: {
      latitude: number;
      longitude: number;
      accuracy: number | null;
    };
  }>;
};

export type CurrentLocationResult =
  | {
      status: 'ready';
      coordinate: Restaurant['location'];
      accuracyMeters?: number;
    }
  | { status: 'permissionDenied' }
  | { status: 'error' };

export const createCurrentLocationRequester = (
  client: LocationClient,
) => {
  let inFlight: Promise<CurrentLocationResult> | undefined;

  return () => {
    inFlight ??= (async () => {
      try {
        const permission = await client.requestForegroundPermission();
        if (!permission.granted) {
          return { status: 'permissionDenied' } as const;
        }

        const position = await client.getHighestAccuracyPosition();
        return {
          status: 'ready',
          coordinate: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          ...(position.coords.accuracy === null
            ? {}
            : { accuracyMeters: position.coords.accuracy }),
        } as const;
      } catch {
        return { status: 'error' } as const;
      }
    })().finally(() => {
      inFlight = undefined;
    });

    return inFlight;
  };
};
