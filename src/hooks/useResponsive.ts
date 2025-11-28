import {useState, useEffect} from 'react';
import {Dimensions, ScaledSize} from 'react-native';

interface ResponsiveDimensions {
  width: number;
  height: number;
  isSmallDevice: boolean;
  isMediumDevice: boolean;
  isLargeDevice: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
}

/**
 * Hook to get responsive dimensions and listen to orientation changes
 * @returns Responsive dimensions and device information
 */
export const useResponsive = (): ResponsiveDimensions => {
  const [dimensions, setDimensions] = useState(() => {
    const {width, height} = Dimensions.get('window');
    return {
      width,
      height,
      isSmallDevice: width < 375,
      isMediumDevice: width >= 375 && width < 414,
      isLargeDevice: width >= 414,
      isLandscape: width > height,
      isPortrait: height > width,
    };
  });

  useEffect(() => {
    const onChange = ({window}: {window: ScaledSize}) => {
      const {width, height} = window;
      setDimensions({
        width,
        height,
        isSmallDevice: width < 375,
        isMediumDevice: width >= 375 && width < 414,
        isLargeDevice: width >= 414,
        isLandscape: width > height,
        isPortrait: height > width,
      });
    };

    const subscription = Dimensions.addEventListener('change', onChange);

    return () => subscription?.remove();
  }, []);

  return dimensions;
};
