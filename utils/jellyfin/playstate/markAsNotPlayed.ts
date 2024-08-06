import { Api } from "@jellyfin/sdk";
import { AxiosError } from "axios";

interface MarkAsNotPlayedParams {
  api: Api | null | undefined;
  itemId: string | null | undefined;
  userId: string | null | undefined;
}

/**
 * Marks a media item as not played for a specific user.
 *
 * @param params - The parameters for marking an item as not played
 * @returns A promise that resolves to true if the operation was successful, false otherwise
 */
export const markAsNotPlayed = async ({
  api,
  itemId,
  userId,
}: MarkAsNotPlayedParams): Promise<boolean> => {
  if (!api || !itemId || !userId) {
    console.error("Invalid parameters for markAsNotPlayed");
    return false;
  }

  try {
    const response = await api.axiosInstance.delete(
      `${api.basePath}/UserPlayedItems/${itemId}`,
      {
        params: { userId },
        headers: {
          Authorization: `MediaBrowser DeviceId="${api.deviceInfo.id}", Token="${api.accessToken}"`,
        },
      },
    );

    return response.status === 200;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(
      "Failed to mark item as not played:",
      axiosError.message,
      axiosError.response?.status,
    );
    return false;
  }
};
