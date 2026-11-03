import "server-only";
import { cache } from "react";
import { repo } from "./data";

/** Request-scoped cached reads for server components. */
export const getSettings = cache(() => repo().getSettings());
export const getContent = cache(() => repo().getContent());
export const getLocations = cache(() => repo().listLocations());
export const getActivities = cache(() => repo().listActivities());
export const getSlots = cache(() => repo().listSlots());
export const getPublishedPosts = cache((limit?: number) => repo().listPosts({ status: "published", limit }));
