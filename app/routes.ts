import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/finder.tsx"),
	route("garden", "routes/garden.tsx"),
] satisfies RouteConfig;
