export declare function invalidateResolverCache(endpoint?: string): void;
export type Resolution = {
    id: number;
    canonicalName: string;
    note: string;
};
export declare function resolveTagId(name: string): Promise<Resolution>;
export declare function resolveCustomFieldId(name: string): Promise<Resolution>;
export declare function resolveBotFieldId(name: string): Promise<Resolution>;
//# sourceMappingURL=resolvers.d.ts.map