/**
 * ManyChat API client
 * Base URL: https://api.manychat.com/fb/
 * Auth: Bearer token
 */
export declare class ManyChatClient {
    private token;
    constructor(token: string);
    private get headers();
    get(path: string, params?: Record<string, string>): Promise<ManyChatResponse>;
    post(path: string, body: Record<string, unknown>): Promise<ManyChatResponse>;
    private handleResponse;
}
export interface ManyChatResponse {
    status: string;
    data?: Record<string, unknown>;
    message?: string;
    code?: number;
    details?: {
        messages?: Array<{
            message: string;
        }>;
    };
}
export declare function getClient(): ManyChatClient;
export declare function cleanData(obj: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=client.d.ts.map