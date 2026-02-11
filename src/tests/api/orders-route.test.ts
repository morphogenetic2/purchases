import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseState = vi.hoisted(() => ({
    fromMock: vi.fn(),
    upsertPayload: undefined as unknown,
    selectResult: { data: [{ id: 'bulk-1' }], error: null as { message: string } | null },
    singleResult: { data: { id: 'single-1' }, error: null as { message: string } | null },
    singleMock: vi.fn(),
}));

vi.mock('$lib/server/supabaseAdmin', () => ({
    supabaseAdmin: {
        from: supabaseState.fromMock,
    },
}));

import { POST } from '../../routes/api/orders/+server';

function makeRequest(body: unknown): Request {
    return new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('POST /api/orders', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        supabaseState.upsertPayload = undefined;
        supabaseState.selectResult = {
            data: [{ id: 'bulk-1' }],
            error: null,
        };
        supabaseState.singleResult = {
            data: { id: 'single-1' },
            error: null,
        };

        supabaseState.fromMock.mockImplementation(() => ({
            upsert: (payload: unknown) => {
                supabaseState.upsertPayload = payload;
                return {
                    select: () => {
                        supabaseState.singleMock = vi
                            .fn()
                            .mockResolvedValue(supabaseState.singleResult);

                        const query = Promise.resolve(
                            supabaseState.selectResult,
                        ) as Promise<{
                            data: unknown;
                            error: { message: string } | null;
                        }> & {
                            single: ReturnType<typeof vi.fn>;
                        };

                        query.single = supabaseState.singleMock;
                        return query;
                    },
                };
            },
        }));
    });

    it('adds a missing id and uses single() for single-object payloads', async () => {
        const response = await POST({
            request: makeRequest({
                description: 'Acetone',
                provider: 'Sigma',
                ordered_by: 'ARN',
                quantity: 1,
                status: 'requested',
            }),
        } as any);

        const body = await response.json();

        expect(response.status).toBe(200);
        expect(supabaseState.fromMock).toHaveBeenCalledWith('orders');
        expect(supabaseState.singleMock).toHaveBeenCalledTimes(1);
        expect(supabaseState.upsertPayload).toMatchObject({
            description: 'Acetone',
            provider: 'Sigma',
        });
        expect((supabaseState.upsertPayload as { id?: string }).id).toEqual(
            expect.any(String),
        );
        expect(body).toEqual({
            data: { id: 'single-1' },
        });
    });

    it('upserts arrays and does not call single() for bulk payloads', async () => {
        supabaseState.selectResult = {
            data: [{ id: 'existing-id' }, { id: 'generated-id' }],
            error: null,
        };

        const response = await POST({
            request: makeRequest([
                {
                    id: 'existing-id',
                    description: 'Existing',
                    provider: 'Fisher',
                    ordered_by: 'MA',
                    quantity: 1,
                    status: 'requested',
                },
                {
                    description: 'New row',
                    provider: 'Sigma',
                    ordered_by: 'ARN',
                    quantity: 2,
                    status: 'requested',
                },
            ]),
        } as any);

        const body = await response.json();
        const payload = supabaseState.upsertPayload as Array<{ id?: string }>;

        expect(response.status).toBe(200);
        expect(Array.isArray(payload)).toBe(true);
        expect(payload).toHaveLength(2);
        expect(payload[0].id).toBe('existing-id');
        expect(payload[1].id).toEqual(expect.any(String));
        expect(supabaseState.singleMock).not.toHaveBeenCalled();
        expect(body).toEqual({
            data: [{ id: 'existing-id' }, { id: 'generated-id' }],
        });
    });
});
