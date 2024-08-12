import { Chromecast } from "@/components/Chromecast";
import { Text } from "@/components/common/Text";
import { DownloadItem } from "@/components/DownloadItem";
import { PlayedStatus } from "@/components/PlayedStatus";
import { CastAndCrew } from "@/components/series/CastAndCrew";
import { CurrentSeries } from "@/components/series/CurrentSeries";
import { SimilarItems } from "@/components/SimilarItems";
import { VideoPlayer } from "@/components/VideoPlayer";
import { apiAtom, userAtom } from "@/providers/JellyfinProvider";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useAtom } from "jotai";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { ParallaxScrollView } from "../../../../components/ParallaxPage";
import { getUserItemData } from "@/utils/jellyfin/user-library/getUserItemData";
import { getBackdropUrl } from "@/utils/jellyfin/image/getBackdropUrl";
import { getLogoImageUrlById } from "@/utils/jellyfin/image/getLogoImageUrlById";
import { PlayButton } from "@/components/PlayButton";
import { Bitrate, BitrateSelector } from "@/components/BitrateSelector";
import { getMediaInfoApi } from "@jellyfin/sdk/lib/utils/api";
import { getStreamUrl } from "@/utils/jellyfin/media/getStreamUrl";
import { useCastDevice } from "react-native-google-cast";
import { chromecastProfile } from "@/utils/profiles/chromecast";
import ios12 from "@/utils/profiles/ios12";
import { currentlyPlayingItemAtom } from "@/components/CurrentlyPlayingBar";
import { AudioTrackSelector } from "@/components/AudioTrackSelector";

const page: React.FC = () => {
  const local = useLocalSearchParams();
  const { id } = local as { id: string };

  const [api] = useAtom(apiAtom);
  const [user] = useAtom(userAtom);

  const castDevice = useCastDevice();

  const [maxBitrate, setMaxBitrate] = useState<Bitrate>({
    key: "Max",
    value: undefined,
  });

  const [selectedAudioStream, setSelectedAudioStream] = useState<number>(0);

  const { data: item, isLoading: l1 } = useQuery({
    queryKey: ["item", id],
    queryFn: async () =>
      await getUserItemData({
        api,
        userId: user?.Id,
        itemId: id,
      }),
    enabled: !!id && !!api,
    staleTime: 60,
  });

  const backdropUrl = useMemo(
    () =>
      getBackdropUrl({
        api,
        item,
        quality: 90,
        width: 1000,
      }),
    [item],
  );

  const logoUrl = useMemo(
    () => (item?.Type === "Movie" ? getLogoImageUrlById({ api, item }) : null),
    [item],
  );

  const { data: sessionData } = useQuery({
    queryKey: ["sessionData", item?.Id],
    queryFn: async () => {
      if (!api || !user?.Id || !item?.Id) return null;
      const playbackData = await getMediaInfoApi(api!).getPlaybackInfo({
        itemId: item?.Id,
        userId: user?.Id,
      });

      return playbackData.data;
    },
    enabled: !!item?.Id && !!api && !!user?.Id,
    staleTime: 0,
  });

  const { data: playbackUrl } = useQuery({
    queryKey: ["playbackUrl", item?.Id, maxBitrate, castDevice],
    queryFn: async () => {
      if (!api || !user?.Id || !sessionData) return null;

      const url = await getStreamUrl({
        api,
        userId: user.Id,
        item,
        startTimeTicks: item?.UserData?.PlaybackPositionTicks || 0,
        maxStreamingBitrate: maxBitrate.value,
        sessionData,
        deviceProfile: castDevice?.deviceId ? chromecastProfile : ios12,
      });

      return url;
    },
    enabled: !!sessionData,
    staleTime: 0,
  });

  const [cp, setCp] = useAtom(currentlyPlayingItemAtom);

  const onPressPlay = useCallback(() => {
    if (!playbackUrl || !item) return;
    setCp({
      item,
      playbackUrl,
    });
  }, [playbackUrl, item]);

  if (l1)
    return (
      <View className="justify-center items-center h-full">
        <ActivityIndicator />
      </View>
    );

  if (!item?.Id || !backdropUrl) return null;

  return (
    <ParallaxScrollView
      headerImage={
        <Image
          source={{
            uri: backdropUrl,
          }}
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      }
      logo={
        <>
          {logoUrl ? (
            <Image
              source={{
                uri: logoUrl,
              }}
              style={{
                height: 130,
                width: "100%",
                resizeMode: "contain",
              }}
            />
          ) : null}
        </>
      }
    >
      <View className="flex flex-col px-4 mb-4 pt-4">
        <View className="flex flex-col">
          {item.Type === "Episode" ? (
            <>
              <TouchableOpacity
                onPress={() =>
                  router.push(`/(auth)/series/${item.SeriesId}/page`)
                }
              >
                <Text className="text-center opacity-50">
                  {item?.SeriesName}
                </Text>
              </TouchableOpacity>
              <View className="flex flex-row items-center self-center px-4">
                <Text className="text-center font-bold text-2xl mr-2">
                  {item?.Name}
                </Text>
                <PlayedStatus item={item} />
              </View>
              <View>
                <View className="flex flex-row items-center self-center">
                  <TouchableOpacity onPress={() => {}}>
                    <Text className="text-center opacity-50">
                      {item?.SeasonName}
                    </Text>
                  </TouchableOpacity>
                  <Text className="text-center opacity-50 mx-2">{"—"}</Text>
                  <Text className="text-center opacity-50">
                    {`Episode ${item.IndexNumber}`}
                  </Text>
                </View>
              </View>
              <Text className="text-center opacity-50">
                {item.ProductionYear}
              </Text>
            </>
          ) : (
            <>
              <View className="flex flex-row items-center self-center px-4">
                <Text className="text-center font-bold text-2xl mr-2">
                  {item?.Name}
                </Text>
                <PlayedStatus item={item} />
              </View>
              <Text className="text-center opacity-50">
                {item?.ProductionYear}
              </Text>
            </>
          )}
        </View>

        <View className="flex flex-row justify-between items-center w-full my-4">
          {playbackUrl && (
            <DownloadItem item={item} playbackUrl={playbackUrl} />
          )}
          <Chromecast />
        </View>
        <Text>{item.Overview}</Text>
      </View>
      <View className="flex flex-col p-4">
        <View className="flex flex-row items-center space-x-4 w-full">
          <BitrateSelector
            onChange={(val) => setMaxBitrate(val)}
            selected={maxBitrate}
          />
          <AudioTrackSelector
            item={item}
            onChange={setSelectedAudioStream}
            selected={selectedAudioStream}
          />
        </View>
        <PlayButton item={item} chromecastReady={false} onPress={onPressPlay} />
      </View>
      <ScrollView horizontal className="flex px-4 mb-4">
        <View className="flex flex-row space-x-2 ">
          <View className="flex flex-col">
            <Text className="text-sm opacity-70">Video</Text>
            <Text className="text-sm opacity-70">Audio</Text>
            <Text className="text-sm opacity-70">Subtitles</Text>
          </View>
          <View className="flex flex-col">
            <Text className="text-sm opacity-70">
              {item.MediaStreams?.find((i) => i.Type === "Video")?.DisplayTitle}
            </Text>
            <Text className="text-sm opacity-70">
              {item.MediaStreams?.find((i) => i.Type === "Audio")?.DisplayTitle}
            </Text>
            <Text className="text-sm opacity-70">
              {
                item.MediaStreams?.find((i) => i.Type === "Subtitle")
                  ?.DisplayTitle
              }
            </Text>
          </View>
        </View>
      </ScrollView>

      <CastAndCrew item={item} />

      {item.Type === "Episode" && (
        <View className="mb-4">
          <CurrentSeries item={item} />
        </View>
      )}

      <SimilarItems itemId={item.Id} />

      <View className="h-12"></View>
    </ParallaxScrollView>
  );
};

export default page;
