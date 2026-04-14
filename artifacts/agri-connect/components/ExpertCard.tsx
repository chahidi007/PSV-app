import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { UserProfile } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  expert: UserProfile;
  onSelect: () => void;
  isSelected?: boolean;
}

export default function ExpertCard({ expert, onSelect, isSelected }: Props) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isSelected ? colors.expertLight : colors.card,
          borderColor: isSelected ? colors.expert : colors.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={onSelect}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.avatar,
          { backgroundColor: isSelected ? colors.expert : colors.secondary },
        ]}
      >
        <Feather
          name="user-check"
          size={22}
          color={isSelected ? "#fff" : colors.mutedForeground}
        />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground, textAlign: "right" }]}>{expert.name}</Text>
        <Text style={[styles.specialty, { color: colors.expert, textAlign: "right" }]}>
          {expert.specialty}
        </Text>
        <View style={styles.locationRow}>
          <Feather name="map-pin" size={11} color={colors.mutedForeground} />
          <Text style={[styles.location, { color: colors.mutedForeground }]}>
            {expert.location}
          </Text>
        </View>
      </View>
      {isSelected && (
        <Feather name="check-circle" size={20} color={colors.expert} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    gap: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
  },
  specialty: {
    fontSize: 13,
    fontWeight: "500",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  location: {
    fontSize: 12,
  },
});
