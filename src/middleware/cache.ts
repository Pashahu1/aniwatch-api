import { AniwatchAPICache, cache } from "../config/cache.js";
import type { BlankInput } from "hono/types";
import type { Context, MiddlewareHandler } from "hono";
import type { ServerContext } from "../config/context.js";

// Define middleware to add Cache-Control header
export const cacheControlMiddleware: MiddlewareHandler = async (c, next) => {
    const sMaxAge = process.env.ANIWATCH_API_S_MAXAGE || "60";
    const staleWhileRevalidate =
        process.env.ANIWATCH_API_STALE_WHILE_REVALIDATE || "30";

    c.header(
        "Cache-Control",
        `s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    );

    await next();
};

export function cacheConfigSetter(keySliceIndex: number): MiddlewareHandler {
    return async (c, next) => {
        const { pathname, search } = new URL(c.req.url);

        c.set("CACHE_CONFIG", {
            key: `${pathname.slice(keySliceIndex) + search}`,
            duration: Number(
                c.req.header(AniwatchAPICache.CACHE_EXPIRY_HEADER_NAME) ||
                    AniwatchAPICache.DEFAULT_CACHE_EXPIRY_SECONDS
            ),
        });

        await next();
    };
}

export function withCache<T, P extends string = string>(
    getData: (c: Context<ServerContext, P, BlankInput>) => Promise<T>
) {
    return async (c: Context<ServerContext, P, BlankInput>) => {
        const cacheConfig = c.get("CACHE_CONFIG");

        const data = await cache.getOrSet<T>(
            () => getData(c),
            cacheConfig.key,
            cacheConfig.duration
        );

        return c.json({ status: 200, data }, { status: 200 });
    };
}

// export function _withCache<T>(
//     context: Context<ServerContext>,
//     promise: Promise<T>
// ): MiddlewareHandler {
//     return async (c) => {};
// }
