



import * as React from 'react';
import Svg, { Path } from 'react-native-svg';


type Props = {
  width?: number;
  height?: number;
  stroke?: string;
  strokeOpacity?: number;
};

export default function wifi({
  width = 22,
  height = 22,
  stroke = '#FFFFFF',
  strokeOpacity = 1,
}: Props) {
  return (

    <Svg width={width} height={height} strokeWidth={1.5} viewBox="0 0 22 22" fill="none">
        <Path d="M11 1.5C5.75329 1.5 1.5 5.75329 1.5 11C1.5 16.2467 5.75329 20.5 11 20.5C16.2467 20.5 20.5 16.2467 20.5 11C20.5 5.75329 16.2467 1.5 11 1.5Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </Svg>


  )
}

