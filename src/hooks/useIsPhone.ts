import { useWindowDimensions } from 'react-native';

export function useIsPhone(): boolean {
  const { width, height } = useWindowDimensions();
  return Math.min(width, height) < 600;
}
