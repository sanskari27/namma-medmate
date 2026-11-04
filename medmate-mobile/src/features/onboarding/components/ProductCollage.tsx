import { Image, StyleSheet, View, type ImageStyle } from 'react-native';

import heroLeft from '@/assets/hero-ab62.png';
import heroMiddle from '@/assets/hero-ab78.png';
import heroRight from '@/assets/hero-ab73.png';

import { LOGIN } from '../constants';

/* Tile sizes live outside `StyleSheet.create` so they keep the narrower
 * `ImageStyle` type instead of widening to `ViewStyle`. */
const left: ImageStyle = {
  width: LOGIN.collage.left.width,
  height: LOGIN.collage.left.height,
};
const middle: ImageStyle = {
  width: LOGIN.collage.middle.width,
  height: LOGIN.collage.middle.height,
  marginLeft: LOGIN.collage.middle.marginLeft,
};
const right: ImageStyle = {
  width: LOGIN.collage.right.width,
  height: LOGIN.collage.right.height,
  marginLeft: LOGIN.collage.right.marginLeft,
};

/** The three product tiles on the Login hero, bottom-aligned like the MVP. */
export function ProductCollage() {
  return (
    <View style={styles.collage}>
      <Image source={heroLeft} style={left} resizeMode="contain" />
      <Image source={heroMiddle} style={middle} resizeMode="contain" />
      <Image source={heroRight} style={right} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  collage: {
    marginTop: LOGIN.collage.marginTop,
    height: LOGIN.collage.height,
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: LOGIN.collage.width,
  },
});
