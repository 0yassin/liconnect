


import * as React from 'react';
import Svg, { Path } from 'react-native-svg';


type Props = {
  width?: number;
  height?: number;
  stroke?: string;
  strokeOpacity?: number;
};

export default function wifi({
  width = 28,
  height = 32,
  stroke = '#FFFFFF',
  strokeOpacity = 1,
}: Props) {
  return (

    <Svg width={width} height={height} strokeWidth={1.5} viewBox="0 0 28 32" fill="none">
        <Path d="M1.1814 15.1524L12.0974 4.23646C15.3436 0.99023 20.6069 0.99023 23.8531 4.23646C27.0993 7.4827 27.0989 12.7462 23.8527 15.9924L11.2574 28.5877C9.09321 30.7519 5.58502 30.7516 3.42086 28.5874C1.25671 26.4233 1.25617 22.9149 3.42033 20.7507L16.0157 8.15537C17.0977 7.07329 18.8531 7.07329 19.9352 8.15537C21.0172 9.23745 21.0165 10.9914 19.9344 12.0735L9.01843 22.9895" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </Svg>


  )
}



