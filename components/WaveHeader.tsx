import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { TC } from './theme';

const { width: W } = Dimensions.get('window');

interface WaveHeaderProps {
  height?: number;
  /** Flip the wave curve direction for variety between screens */
  flip?: boolean;
}

/**
 * Curved SVG wave header with pink → blue pastel gradient.
 * `flip` mirrors the wave horizontally for register vs login.
 */
export default function WaveHeader({ height = 260, flip = false }: WaveHeaderProps) {
  // Build a smooth cubic-bezier wave at the bottom of the rectangle
  const y1 = height * 0.68;
  const y2 = height * 0.95;
  const y3 = height * 0.78;
  const y4 = height * 0.92;

  const path = flip
    ? `M 0 0 L ${W} 0 L ${W} ${y4}
       Q ${W * 0.75} ${y1}, ${W * 0.5} ${y2}
       Q ${W * 0.25} ${height * 1.08}, 0 ${y3} Z`
    : `M 0 0 L ${W} 0 L ${W} ${y3}
       Q ${W * 0.75} ${height * 1.05}, ${W * 0.5} ${y2}
       Q ${W * 0.25} ${y1}, 0 ${y4} Z`;

  return (
    <View style={[styles.container, { height: height + 10 }]}>
      <Svg width={W} height={height + 10} viewBox={`0 0 ${W} ${height + 10}`}>
        <Defs>
          <SvgLinearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0.4">
            <Stop offset="0" stopColor={TC.gradientStart} stopOpacity="1" />
            <Stop offset="1" stopColor={TC.gradientEnd} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        <Path d={path} fill="url(#waveGrad)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
});
