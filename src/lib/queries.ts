import "server-only";
import { cache } from "react";
import { publicRepo } from "./data";

/** Request-scoped cached reads for public server components (anon privileges). */
export const getSettings = cache(() => publicRepo().getSettings());
export const getContent = cache(() => publicRepo().getContent());
export const getLocations = cache(() => publicRepo().listLocations());
export const getActivities = cache(() => publicRepo().listActivities());
/** Upcoming / current bookable slots only. */
export const getSlots = cache(async () => (await publicRepo().listSlots()).filter((s) => !s.isPast));
export const getGallery = cache(() => publicRepo().listGallery());
export const getPublishedPosts = cache((limit?: number) => publicRepo().listPosts({ status: "published", limit }));
