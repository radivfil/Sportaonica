import type { MetadataRoute } from "next";
import { BASE_PATH } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sportaonica",
    short_name: "Sportaonica",
    start_url: `${BASE_PATH}/`,
    display: "standalone",
    background_color: "#FFFCF3",
    theme_color: "#FCE8FB",
    lang: "hr",
    icons: [
      { src: `${BASE_PATH}/icon.svg`, sizes: "any", type: "image/svg+xml" },
      { src: `${BASE_PATH}/apple-icon.png`, sizes: "180x180", type: "image/png" },
    ],
  };
}
