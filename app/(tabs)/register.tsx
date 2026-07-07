import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { colors } from "../../constants/colors";
import { fontSize, spacing } from "../../constants/layout";
import { useRegisterGym } from "../../features/gym/hooks";
import { useLocation } from "../../hooks/useLocation";

/** 헬스장 등록 화면 — UI 전담, 검증/전송은 useRegisterGym 훅에 위임 */
export default function RegisterScreen() {
  const router = useRouter();
  const { coords, isLoading: isLocating } = useLocation();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  // 위치 확인이 끝나면 현재 좌표를 기본값으로 채운다.
  useEffect(() => {
    if (!isLocating) {
      setLat(String(coords.lat));
      setLng(String(coords.lng));
    }
  }, [isLocating, coords.lat, coords.lng]);

  const { submit, isLoading, error } = useRegisterGym({
    onSuccess: (created) => {
      router.replace(`/gym/${created.id}`);
    },
  });

  function handleSubmit() {
    submit({
      name: name.trim(),
      address: address.trim(),
      lat: Number(lat),
      lng: Number(lng),
      phone: phone.trim() === "" ? null : phone.trim(),
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>헬스장 등록</Text>

      <Input
        label="헬스장 이름"
        value={name}
        onChangeText={setName}
        placeholder="예: 강철짐 시청점"
      />
      <Input
        label="주소"
        value={address}
        onChangeText={setAddress}
        placeholder="예: 서울 중구 무교로 21"
      />
      <Input
        label="전화번호 (선택)"
        value={phone}
        onChangeText={setPhone}
        placeholder="예: 02-1234-5678"
        keyboardType="phone-pad"
      />
      <Input
        label="위도"
        value={lat}
        onChangeText={setLat}
        placeholder="현재 위치 기준"
        keyboardType="numbers-and-punctuation"
      />
      <Input
        label="경도"
        value={lng}
        onChangeText={setLng}
        placeholder="현재 위치 기준"
        keyboardType="numbers-and-punctuation"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="등록하기" onPress={handleSubmit} loading={isLoading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.md,
  },
});
