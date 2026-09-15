import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { ColorTheme } from "../../constants/colors";
import { fontSize, spacing } from "../../constants/layout";
import { GymSearchBox } from "../../features/gym/components/GymSearchBox";
import { useRegisterGym } from "../../features/gym/hooks";
import { useGymSearch } from "../../features/gym/useGymSearch";
import { useLocation } from "../../hooks/useLocation";
import { useThemeColors } from "../../hooks/useThemeColors";
import type { KakaoPlace } from "../../lib/api/kakao";

/**
 * 헬스장 등록 화면 — UI 전담, 검증/전송은 useRegisterGym 훅에 위임
 * - 위경도는 사용자가 직접 입력하지 않는다: 검색으로 장소를 선택하면 그 좌표를,
 *   선택하지 않고 이름/주소만 입력하면 현재 위치 좌표를 사용한다.
 * - 장소 검색 입력/결과는 GymSearchBox에 위임한다.
 */
export default function RegisterScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      address: address.trim() === "" ? null : address.trim(),
      lat: location.lat,
      lng: location.lng,
      phone: phone.trim() === "" ? null : phone.trim(),
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>헬스장 등록</Text>

      <View style={styles.section}>
        <GymSearchBox
          query={query}
          onQueryChange={handleQueryChange}
          onSubmit={() => search(query)}
          isSearching={isSearching}
          searchError={searchError}
          results={results}
          onSelectResult={handleSelect}
          onDismissResults={resetResults}
        />
      </View>

      <View style={styles.section}>
        <Input
          label="헬스장 이름"
          value={name}
          onChangeText={setName}
          placeholder="예: 강철짐 강남점"
        />
        <Input
          label="주소 (선택)"
          value={address}
          onChangeText={setAddress}
          placeholder="검색 결과가 없으면 직접 입력해주세요 (생략 가능)"
        />
        <Input
          label="전화번호 (선택)"
          value={phone}
          onChangeText={setPhone}
          placeholder="예: 02-1234-5678"
          keyboardType="phone-pad"
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="등록하기" onPress={handleSubmit} loading={isLoading} />
    </ScrollView>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
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
      marginBottom: spacing.xl,
    },
    section: {
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    error: {
      fontSize: fontSize.sm,
      color: colors.error,
      marginBottom: spacing.md,
    },
  });
}
