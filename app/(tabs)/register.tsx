import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { colors } from "../../constants/colors";
import { KAKAO_REST_KEY } from "../../constants/config";
import { fontSize, spacing } from "../../constants/layout";
import { GymSearchResults } from "../../features/gym/components/GymSearchResults";
import { useRegisterGym } from "../../features/gym/hooks";
import { useGymSearch } from "../../features/gym/useGymSearch";
import { useLocation } from "../../hooks/useLocation";
import type { KakaoPlace } from "../../lib/api/kakao";

/**
 * 헬스장 등록 화면 — UI 전담, 검증/전송은 useRegisterGym 훅에 위임
 * - 위경도는 사용자가 직접 입력하지 않는다: 검색으로 장소를 선택하면 그 좌표를,
 *   선택하지 않고 이름/주소만 입력하면 현재 위치 좌표를 사용한다.
 */
export default function RegisterScreen() {
  const router = useRouter();
  const { coords } = useLocation();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState("");
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const {
    results,
    isSearching,
    error: searchError,
    search,
    reset: resetResults,
  } = useGymSearch(coords);

  const { submit, isLoading, error } = useRegisterGym({
    onSuccess: (created) => {
      // 등록 직후 바로 가격을 입력할 수 있도록 가격 등록 화면으로 이동한다.
      router.replace(`/gym/${created.id}/price-submit`);
    },
  });

  function handleQueryChange(text: string) {
    setQuery(text);
    setSelectedCoords(null); // 검색어를 바꾸면 이전 선택은 무효화
  }

  function handleSelect(place: KakaoPlace) {
    setName(place.name);
    setAddress(place.address);
    setSelectedCoords({ lat: place.lat, lng: place.lng });
    setQuery(place.name);
    resetResults();
  }

  function handleSubmit() {
    // 검색으로 선택한 좌표가 있으면 그 값을, 없으면 현재 위치를 사용한다.
    const location = selectedCoords ?? coords;
    submit({
      name: name.trim(),
      address: address.trim(),
      lat: location.lat,
      lng: location.lng,
      phone: phone.trim() === "" ? null : phone.trim(),
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>헬스장 등록</Text>

      <Input
        label="헬스장 검색"
        value={query}
        onChangeText={handleQueryChange}
        onSubmitEditing={() => search(query)}
        placeholder="이름 또는 주소로 검색"
        returnKeyType="search"
      />
      <Button title="검색" onPress={() => search(query)} loading={isSearching} />
      {!KAKAO_REST_KEY ? (
        <Text style={styles.hint}>
          검색 기능을 사용하려면 카카오 REST API 키(EXPO_PUBLIC_KAKAO_REST_KEY)가
          필요합니다. 없으면 아래 항목을 직접 입력해주세요.
        </Text>
      ) : null}
      {searchError ? <Text style={styles.error}>{searchError}</Text> : null}

      <GymSearchResults results={results} onSelect={handleSelect} />

      <Input
        label="헬스장 이름"
        value={name}
        onChangeText={setName}
        placeholder="예: 강철짐 강남점"
      />
      <Input
        label="주소"
        value={address}
        onChangeText={setAddress}
        placeholder="검색 결과가 없으면 직접 입력해주세요"
      />
      <Input
        label="전화번호 (선택)"
        value={phone}
        onChangeText={setPhone}
        placeholder="예: 02-1234-5678"
        keyboardType="phone-pad"
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
  hint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.md,
  },
});
