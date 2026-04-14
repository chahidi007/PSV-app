import React from "react";
import { Image, StyleSheet, View } from "react-native";

interface Props {
  size?: number;
}

export default function LogoMark({ size = 32 }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image
        source={require("@/assets/images/logo.png")}
        style={{ width: size, height: size, borderRadius: size * 0.18 }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
});
