import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/garden.tsx"),
	route("garden", "routes/garden.alias.tsx"),
	route("library", "routes/finder.tsx"),
	route("concepts/:id", "routes/dossier.tsx"),
	route("review", "routes/review.tsx"),
	route("settings", "routes/settings.tsx"),
] satisfies RouteConfig;
